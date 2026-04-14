#!/usr/bin/env python3
"""
Translate `works.title`, `works.title_without_series`, and `works.author` to Russian
using GLM (`glm-4.7-flash` by default).

Behavior:
  - Overwrites source columns in `works` (force rewrite mode).
  - Skips books already translated to Russian (all non-empty fields contain Cyrillic),
    unless --force-retranslate is used.
  - Creates/validates rollback backup table: `works_translation_backup`.
  - Sends rows to the LLM API in batches and validates strict JSON output.
  - Retries HTTP 429/5xx and parse/format failures with exponential backoff + jitter.
  - Applies adaptive request throttling per API key lane to reduce 429 rate limits.
  - Re-asks failed rows in smaller corrective batches.
  - Leaves unresolved rows unchanged for this run.
  - Writes failure report to `artifacts/translate_works_ru_glm_failures.csv`.
  - Exits non-zero if unresolved failures remain.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import os
import random
import re
import socket
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any, Iterable, Protocol

import psycopg

DEFAULT_API_BASE_URL = "https://api.z.ai/api/paas/v4"
DEFAULT_MODEL = "GLM-4-32B-0414-128K"
DEFAULT_BATCH_SIZE = 40
DEFAULT_CONCURRENCY = 1
DEFAULT_API_CONCURRENCY = 1
DEFAULT_MAX_RETRIES = 5
DEFAULT_TIMEOUT_SECONDS = 60
DEFAULT_MIN_REQUEST_INTERVAL_SECONDS = 8.0
DEFAULT_MAX_REQUEST_INTERVAL_SECONDS = 60.0
DB_FETCH_CHUNK = 2_000
PROGRESS_EVERY_BATCHES = 1
CORRECTIVE_BATCH_MAX = 10
NEEDS_TRANSLATION_WHERE_SQL = """
(
    (coalesce(title, '') <> '' AND title !~ '[А-Яа-яЁё]')
    OR (coalesce(title_without_series, '') <> '' AND title_without_series !~ '[А-Яа-яЁё]')
    OR (coalesce(author, '') <> '' AND author !~ '[А-Яа-яЁё]')
)
"""

ROOT_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = ROOT_DIR / "artifacts"
FAILURES_CSV_PATH = ARTIFACTS_DIR / "translate_works_ru_glm_failures.csv"

CYRILLIC_RE = re.compile(r"[А-Яа-яЁё]")

SYSTEM_PROMPT = """You are a bibliographic translator to Russian.
Task: translate books and author names to Russian.
Rules:
1) Prefer canonical Russian publication titles and accepted Russian author forms whenever known.
2) If canonical form is unknown, use literal translation for titles and transliteration for author names.
3) Preserve meaning; do not invent extra metadata.
4) Keep output in Russian script whenever source field has letters.
5) If a source field is empty, return an empty string for that field.
6) Output ONLY valid JSON. No markdown, no explanations."""


@dataclass(frozen=True)
class WorkRow:
    work_id: str
    title: str
    title_without_series: str
    author: str


@dataclass
class FailureRecord:
    work_id: str
    source_title: str
    source_title_without_series: str
    source_author: str
    reason: str


@dataclass
class BatchResult:
    updates: list[tuple[str, str, str, str]]  # (title, title_without_series, author, work_id)
    failures: list[FailureRecord]
    preview_rows: list[tuple[str, str, str, str]]


class RetryableGLMError(RuntimeError):
    """Transient failure that should be retried."""

    def __init__(
        self,
        message: str,
        *,
        retry_after_seconds: float | None = None,
        status_code: int | None = None,
    ) -> None:
        super().__init__(message)
        self.retry_after_seconds = retry_after_seconds
        self.status_code = status_code


class NonRetryableGLMError(RuntimeError):
    """Terminal failure that should not be retried."""


class ParseGLMError(RuntimeError):
    """Invalid/malformed response payload from model."""


def positive_int(value: str) -> int:
    ivalue = int(value)
    if ivalue <= 0:
        raise argparse.ArgumentTypeError("must be > 0")
    return ivalue


def non_negative_int(value: str) -> int:
    ivalue = int(value)
    if ivalue < 0:
        raise argparse.ArgumentTypeError("must be >= 0")
    return ivalue


def positive_float(value: str) -> float:
    fvalue = float(value)
    if fvalue <= 0:
        raise argparse.ArgumentTypeError("must be > 0")
    return fvalue


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Translate works table fields to Russian via GLM and overwrite in Postgres."
    )
    parser.add_argument("--db-url", default=None, help="Postgres URL (default from RECSYS_DB_URL/env parts).")
    parser.add_argument(
        "--api-base-url",
        default=None,
        help=f"GLM API base URL (default: {DEFAULT_API_BASE_URL}).",
    )
    parser.add_argument(
        "--api-key",
        default=None,
        help="Single GLM API key (default from env when --api-keys/--api-keys-file are not set).",
    )
    parser.add_argument(
        "--api-keys",
        default=None,
        help="Comma-separated API keys for parallel key lanes (e.g. key1,key2,key3).",
    )
    parser.add_argument(
        "--api-keys-file",
        default=None,
        help="Path to file with one API key per line (or comma-separated).",
    )
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"GLM model (default: {DEFAULT_MODEL}).")
    parser.add_argument("--batch-size", type=positive_int, default=DEFAULT_BATCH_SIZE, help="Rows per LLM request.")
    parser.add_argument("--concurrency", type=positive_int, default=DEFAULT_CONCURRENCY, help="Parallel LLM requests.")
    parser.add_argument(
        "--api-concurrency",
        type=positive_int,
        default=DEFAULT_API_CONCURRENCY,
        help="Max simultaneous in-flight API calls per key lane (default: 1, safest for 429).",
    )
    parser.add_argument("--max-retries", type=non_negative_int, default=DEFAULT_MAX_RETRIES, help="Retries for transient failures.")
    parser.add_argument("--timeout-seconds", type=positive_int, default=DEFAULT_TIMEOUT_SECONDS, help="HTTP timeout per request.")
    parser.add_argument(
        "--min-request-interval-seconds",
        type=positive_float,
        default=DEFAULT_MIN_REQUEST_INTERVAL_SECONDS,
        help=f"Minimum gap between API requests per key lane (default: {DEFAULT_MIN_REQUEST_INTERVAL_SECONDS}).",
    )
    parser.add_argument(
        "--max-request-interval-seconds",
        type=positive_float,
        default=DEFAULT_MAX_REQUEST_INTERVAL_SECONDS,
        help=f"Upper bound for adaptive throttle interval after 429 (default: {DEFAULT_MAX_REQUEST_INTERVAL_SECONDS}).",
    )
    parser.add_argument("--limit", type=non_negative_int, default=None, help="Optional max rows to process.")
    parser.add_argument(
        "--force-retranslate",
        action="store_true",
        help="Ignore skip logic and re-translate all rows.",
    )
    parser.add_argument(
        "--enable-thinking",
        action="store_true",
        help="Enable model reasoning mode (disabled by default for lower latency).",
    )
    parser.add_argument("--dry-run", action="store_true", help="No DB writes; preview + validation only.")
    args = parser.parse_args()
    if args.max_request_interval_seconds < args.min_request_interval_seconds:
        parser.error("--max-request-interval-seconds must be >= --min-request-interval-seconds")
    return args


def build_default_db_url() -> str:
    host = os.environ.get("RECSYS_DB_HOST", "localhost")
    port = int(os.environ.get("RECSYS_DB_PORT", "5433"))
    dbname = os.environ.get("RECSYS_DB_NAME", "recsys")
    user = os.environ.get("RECSYS_DB_USER", "postgres")
    password = os.environ.get("RECSYS_DB_PASSWORD", "postgres")
    return os.environ.get(
        "RECSYS_DB_URL",
        f"postgresql://{user}:{password}@{host}:{port}/{dbname}",
    )


def _split_api_keys(raw: str) -> list[str]:
    parts = re.split(r"[\n,]+", raw)
    return [p.strip() for p in parts if p and p.strip()]


def _dedupe_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        if value not in seen:
            out.append(value)
            seen.add(value)
    return out


def resolve_api_keys(cli_value: str | None, cli_values: str | None, cli_file: str | None) -> list[str]:
    keys: list[str] = []
    if cli_value:
        keys.extend(_split_api_keys(cli_value))
    if cli_values:
        keys.extend(_split_api_keys(cli_values))
    if cli_file:
        file_path = Path(cli_file).expanduser()
        try:
            raw = file_path.read_text(encoding="utf-8")
        except OSError as exc:
            raise RuntimeError(f"Unable to read --api-keys-file {file_path}: {exc}") from exc
        keys.extend(_split_api_keys(raw))

    if not keys:
        for env_name in ("ZAI_API_KEYS", "BIGMODEL_API_KEYS", "GLM_API_KEYS", "DEEPSEEK_API_KEYS"):
            val = os.environ.get(env_name, "").strip()
            if val:
                keys.extend(_split_api_keys(val))
        if not keys:
            for env_name in ("ZAI_API_KEY", "BIGMODEL_API_KEY", "GLM_API_KEY", "DEEPSEEK_API_KEY"):
                val = os.environ.get(env_name, "").strip()
                if val:
                    keys.append(val)
                    break
    return _dedupe_preserve_order(keys)


def resolve_api_base_url(cli_value: str | None) -> str:
    if cli_value and cli_value.strip():
        return cli_value.strip().rstrip("/")
    for env_name in ("ZAI_API_BASE_URL", "BIGMODEL_API_BASE_URL", "GLM_API_BASE_URL", "DEEPSEEK_API_BASE_URL"):
        val = os.environ.get(env_name, "").strip()
        if val:
            return val.rstrip("/")
    return DEFAULT_API_BASE_URL


def to_chat_completions_url(api_base_url: str) -> str:
    base = api_base_url.strip().rstrip("/")
    if base.endswith("/chat/completions"):
        return base
    return f"{base}/chat/completions"


def format_seconds(seconds: float) -> str:
    if seconds < 0:
        seconds = 0
    total = int(seconds)
    hours, rem = divmod(total, 3600)
    minutes, secs = divmod(rem, 60)
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def has_cyrillic(text: str) -> bool:
    return bool(CYRILLIC_RE.search(text))


def has_letters(text: str) -> bool:
    return any(ch.isalpha() for ch in text)


def chunked(seq: list[WorkRow], size: int) -> Iterable[list[WorkRow]]:
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


def iter_work_rows(
    conn: psycopg.Connection,
    limit: int | None,
    skip_already_translated: bool,
) -> Iterable[WorkRow]:
    sql = """
        SELECT work_id, title, title_without_series, author
        FROM works
    """
    if skip_already_translated:
        sql += f" WHERE {NEEDS_TRANSLATION_WHERE_SQL} "
    sql += " ORDER BY work_id "
    params: tuple[Any, ...] = ()
    if limit is not None:
        sql += " LIMIT %s"
        params = (limit,)
    with conn.cursor(name="works_ru_translate_reader") as cur:
        cur.execute(sql, params)
        while True:
            rows = cur.fetchmany(DB_FETCH_CHUNK)
            if not rows:
                break
            for work_id, title, title_without_series, author in rows:
                yield WorkRow(
                    work_id=str(work_id),
                    title=(title or "").strip(),
                    title_without_series=(title_without_series or "").strip(),
                    author=(author or "").strip(),
                )


def batch_rows(rows: Iterable[WorkRow], batch_size: int) -> Iterable[list[WorkRow]]:
    buf: list[WorkRow] = []
    for row in rows:
        buf.append(row)
        if len(buf) >= batch_size:
            yield buf
            buf = []
    if buf:
        yield buf


def get_works_count(conn: psycopg.Connection) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM works;")
        return int(cur.fetchone()[0])


def get_rows_needing_translation_count(conn: psycopg.Connection) -> int:
    with conn.cursor() as cur:
        cur.execute(f"SELECT count(*) FROM works WHERE {NEEDS_TRANSLATION_WHERE_SQL};")
        return int(cur.fetchone()[0])


def ensure_backup_table(conn: psycopg.Connection) -> tuple[int, int]:
    with conn.cursor() as cur:
        cur.execute("SELECT to_regclass('public.works_translation_backup');")
        backup_exists = cur.fetchone()[0] is not None

        if not backup_exists:
            print("Creating backup table `works_translation_backup`...", flush=True)
            cur.execute(
                """
                CREATE TABLE public.works_translation_backup (
                    work_id TEXT PRIMARY KEY,
                    title TEXT,
                    title_without_series TEXT,
                    author TEXT,
                    backed_up_at TIMESTAMPTZ NOT NULL
                );
                """
            )
            cur.execute(
                """
                INSERT INTO public.works_translation_backup
                    (work_id, title, title_without_series, author, backed_up_at)
                SELECT work_id, title, title_without_series, author, now()
                FROM public.works;
                """
            )
        conn.commit()

    with conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM public.works;")
        works_count = int(cur.fetchone()[0])
        cur.execute("SELECT count(*) FROM public.works_translation_backup;")
        backup_count = int(cur.fetchone()[0])
    if backup_count != works_count:
        raise RuntimeError(
            "Backup validation failed: works_translation_backup row count "
            f"({backup_count}) does not match works row count ({works_count})."
        )
    return works_count, backup_count


def build_user_prompt(rows: list[WorkRow], corrective: bool = False) -> str:
    records = {
        row.work_id: {
            "title": row.title,
            "title_without_series": row.title_without_series,
            "author": row.author,
        }
        for row in rows
    }
    mode_note = (
        "This is a correction pass. Follow the schema exactly for every id."
        if corrective
        else "Primary pass."
    )
    return (
        f"{mode_note}\n"
        "Return ONLY a JSON object where top-level keys are exactly the input work_id values.\n"
        "Each value must be an object with exactly keys: title, title_without_series, author.\n"
        "Use empty string for empty source fields.\n"
        "Do not omit any work_id.\n"
        "Input:\n"
        f"{json.dumps(records, ensure_ascii=False)}"
    )


def _extract_message_content(response_json: dict[str, Any]) -> str:
    try:
        choices = response_json["choices"]
        if not isinstance(choices, list) or not choices:
            raise KeyError("choices")
        message = choices[0]["message"]
        content = message["content"]
    except Exception as exc:
        raise ParseGLMError(f"Missing content in GLM response: {exc}") from exc

    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict):
                text = item.get("text")
                if isinstance(text, str):
                    parts.append(text)
        if parts:
            return "".join(parts)
    raise ParseGLMError("Unsupported message content format in GLM response.")


def _parse_json_content(content: str) -> dict[str, Any]:
    text = content.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ParseGLMError(f"Model output is not valid JSON: {exc}") from exc
    if not isinstance(parsed, dict):
        raise ParseGLMError("Model output JSON must be an object keyed by work_id.")
    return parsed


def parse_retry_after_header(value: str | None) -> float | None:
    if not value:
        return None
    raw = value.strip()
    if not raw:
        return None
    try:
        numeric = float(raw)
        if numeric >= 0:
            return numeric
    except ValueError:
        pass
    try:
        dt = parsedate_to_datetime(raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        seconds = (dt - datetime.now(timezone.utc)).total_seconds()
        return max(0.0, seconds)
    except Exception:
        return None


class AdaptiveRateLimiter:
    """Thread-safe adaptive request pacing shared across all GLM request workers."""

    def __init__(self, min_interval_seconds: float, max_interval_seconds: float) -> None:
        self._min_interval = min_interval_seconds
        self._max_interval = max_interval_seconds
        self._current_interval = min_interval_seconds
        self._next_allowed_at = time.monotonic()
        self._lock = threading.Lock()

    def acquire(self) -> None:
        while True:
            with self._lock:
                now = time.monotonic()
                wait_for = self._next_allowed_at - now
                if wait_for <= 0:
                    self._next_allowed_at = now + self._current_interval
                    return
            time.sleep(min(wait_for, 0.5))

    def on_429(self, retry_after_seconds: float | None) -> None:
        with self._lock:
            bumped = min(self._max_interval, max(self._current_interval * 2.0, 5.0))
            if retry_after_seconds is not None:
                bumped = max(bumped, min(self._max_interval, retry_after_seconds))
            self._current_interval = max(self._current_interval, bumped)
            self._next_allowed_at = max(self._next_allowed_at, time.monotonic() + self._current_interval)

    def on_success(self) -> None:
        # Recover slowly to avoid oscillation and repeated 429 bursts.
        with self._lock:
            if self._current_interval > self._min_interval:
                self._current_interval = max(self._min_interval, self._current_interval * 0.99)

    def current_interval(self) -> float:
        with self._lock:
            return self._current_interval


def format_throttle_status(rate_limiters: list[AdaptiveRateLimiter]) -> str:
    if not rate_limiters:
        return "n/a"
    values = [rl.current_interval() for rl in rate_limiters]
    if len(values) == 1:
        return f"{values[0]:.2f}s"
    return f"{min(values):.2f}-{max(values):.2f}s (avg {sum(values) / len(values):.2f}s)"


class GLMClient:
    def __init__(
        self,
        api_key: str,
        api_url: str,
        model: str,
        timeout_seconds: int,
        max_retries: int,
        rate_limiter: AdaptiveRateLimiter,
        api_concurrency: int,
        enable_thinking: bool,
    ) -> None:
        self.api_key = api_key
        self.api_url = api_url
        self.model = model
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries
        self.rate_limiter = rate_limiter
        self.inflight_semaphore = threading.BoundedSemaphore(value=api_concurrency)
        self.enable_thinking = enable_thinking

    def _post(self, messages: list[dict[str, str]]) -> dict[str, Any]:
        with self.inflight_semaphore:
            self.rate_limiter.acquire()
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.1,
                "top_p": 0.95,
                "stream": False,
            }
            if not self.enable_thinking:
                payload["thinking"] = {"type": "disabled"}
            data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            req = urllib.request.Request(
                self.api_url,
                data=data,
                method="POST",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
            )
            try:
                with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
                    body = resp.read().decode("utf-8", errors="replace")
                    out = json.loads(body)
                    self.rate_limiter.on_success()
                    return out
            except urllib.error.HTTPError as exc:
                body = exc.read().decode("utf-8", errors="replace")
                retry_after_seconds = parse_retry_after_header(exc.headers.get("Retry-After"))
                if exc.code in (429, 500, 502, 503, 504):
                    if exc.code == 429:
                        self.rate_limiter.on_429(retry_after_seconds)
                    raise RetryableGLMError(
                        f"HTTP {exc.code}: {body[:500]}",
                        retry_after_seconds=retry_after_seconds,
                        status_code=exc.code,
                    ) from exc
                raise NonRetryableGLMError(f"HTTP {exc.code}: {body[:500]}") from exc
            except urllib.error.URLError as exc:
                raise RetryableGLMError(f"Network error: {exc}") from exc
            except (TimeoutError, socket.timeout) as exc:
                raise RetryableGLMError(f"Timeout error: {exc}") from exc
            except json.JSONDecodeError as exc:
                raise ParseGLMError(f"Invalid JSON from API: {exc}") from exc

    def translate_rows(self, rows: list[WorkRow], corrective: bool = False) -> dict[str, Any]:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(rows, corrective=corrective)},
        ]
        attempts = self.max_retries + 1
        for attempt in range(attempts):
            try:
                resp_json = self._post(messages)
                content = _extract_message_content(resp_json)
                return _parse_json_content(content)
            except (RetryableGLMError, ParseGLMError) as exc:
                if attempt >= self.max_retries:
                    raise
                backoff = float(2**attempt)
                if isinstance(exc, RetryableGLMError):
                    if exc.retry_after_seconds is not None:
                        backoff = max(backoff, exc.retry_after_seconds)
                    if exc.status_code == 429:
                        backoff = max(backoff, self.rate_limiter.current_interval() * 1.2)
                backoff += random.uniform(0.0, 0.9)
                kind = "corrective" if corrective else "primary"
                print(
                    f"[warn] {kind} batch retry {attempt + 1}/{self.max_retries} in {backoff:.1f}s: {exc}",
                    flush=True,
                )
                time.sleep(backoff)


class TranslationClient(Protocol):
    def translate_rows(self, rows: list[WorkRow], corrective: bool = False) -> dict[str, Any]:
        ...


class MultiGLMClient:
    def __init__(self, clients: list[GLMClient]) -> None:
        if not clients:
            raise ValueError("MultiGLMClient requires at least one client")
        self.clients = clients
        self._next_index = 0
        self._lock = threading.Lock()

    def _pick_client(self) -> GLMClient:
        with self._lock:
            client = self.clients[self._next_index]
            self._next_index = (self._next_index + 1) % len(self.clients)
            return client

    def translate_rows(self, rows: list[WorkRow], corrective: bool = False) -> dict[str, Any]:
        client = self._pick_client()
        return client.translate_rows(rows, corrective=corrective)


def validate_translations(
    rows: list[WorkRow],
    translation_map: dict[str, Any],
    stage: str,
) -> tuple[dict[str, dict[str, str]], dict[str, str]]:
    success: dict[str, dict[str, str]] = {}
    failures: dict[str, str] = {}

    for row in rows:
        reasons: list[str] = []
        output_obj = translation_map.get(row.work_id)
        if not isinstance(output_obj, dict):
            failures[row.work_id] = f"{stage}: missing or invalid object for work_id"
            continue

        out_fields: dict[str, str] = {}
        for field_name, src_value in (
            ("title", row.title),
            ("title_without_series", row.title_without_series),
            ("author", row.author),
        ):
            raw_value = output_obj.get(field_name, "")
            if raw_value is None:
                value = ""
            elif isinstance(raw_value, str):
                value = raw_value.strip()
            else:
                reasons.append(f"{stage}: field `{field_name}` must be string")
                continue

            src = (src_value or "").strip()
            if not src:
                if value:
                    reasons.append(f"{stage}: `{field_name}` must be empty when source is empty")
            else:
                if not value:
                    reasons.append(f"{stage}: `{field_name}` is empty for non-empty source")
                elif has_letters(src) and not has_cyrillic(value):
                    reasons.append(f"{stage}: `{field_name}` has no Cyrillic output")
            out_fields[field_name] = value

        if reasons:
            failures[row.work_id] = "; ".join(reasons)
        else:
            success[row.work_id] = out_fields
    return success, failures


def attempt_translate_subset(
    rows: list[WorkRow],
    client: TranslationClient,
    stage_name: str,
    corrective: bool,
) -> tuple[dict[str, dict[str, str]], dict[str, str]]:
    try:
        output = client.translate_rows(rows, corrective=corrective)
    except Exception as exc:
        reason = f"{stage_name}: request failed ({exc})"
        return {}, {row.work_id: reason for row in rows}
    return validate_translations(rows, output, stage=stage_name)


def process_batch(rows: list[WorkRow], client: TranslationClient, corrective_batch_size: int) -> BatchResult:
    translated: dict[str, dict[str, str]] = {}

    success, failed = attempt_translate_subset(rows, client, stage_name="primary", corrective=False)
    translated.update(success)

    unresolved: dict[str, str] = dict(failed)
    # Corrective passes are useful for parse/schema/cyrillic issues, but they
    # usually just add load when the primary failure was a request-level outage/rate-limit.
    corrective_candidates: list[WorkRow] = [
        row
        for row in rows
        if (
            row.work_id in unresolved
            and "request failed" not in (unresolved.get(row.work_id, "")).lower()
        )
    ]
    if corrective_candidates:
        failed_rows = corrective_candidates
        for small_batch in chunked(failed_rows, corrective_batch_size):
            corr_success, corr_failed = attempt_translate_subset(
                small_batch,
                client,
                stage_name="corrective",
                corrective=True,
            )
            translated.update(corr_success)
            for work_id in corr_success:
                unresolved.pop(work_id, None)
            for work_id, reason in corr_failed.items():
                existing = unresolved.get(work_id)
                if existing and reason not in existing:
                    unresolved[work_id] = f"{existing} | {reason}"
                else:
                    unresolved[work_id] = reason

    failures: list[FailureRecord] = []
    updates: list[tuple[str, str, str, str]] = []
    preview_rows: list[tuple[str, str, str, str]] = []

    for row in rows:
        if row.work_id in unresolved:
            failures.append(
                FailureRecord(
                    work_id=row.work_id,
                    source_title=row.title,
                    source_title_without_series=row.title_without_series,
                    source_author=row.author,
                    reason=unresolved[row.work_id],
                )
            )
            continue
        tr = translated.get(row.work_id)
        if not tr:
            failures.append(
                FailureRecord(
                    work_id=row.work_id,
                    source_title=row.title,
                    source_title_without_series=row.title_without_series,
                    source_author=row.author,
                    reason="internal: missing translated row after processing",
                )
            )
            continue
        title = tr["title"]
        title_without_series = tr["title_without_series"]
        author = tr["author"]
        updates.append((title, title_without_series, author, row.work_id))
        preview_rows.append((row.work_id, title, title_without_series, author))

    return BatchResult(updates=updates, failures=failures, preview_rows=preview_rows)


def apply_updates(conn: psycopg.Connection, updates: list[tuple[str, str, str, str]]) -> None:
    if not updates:
        return
    with conn.cursor() as cur:
        cur.executemany(
            """
            UPDATE public.works
            SET title = %s,
                title_without_series = %s,
                author = %s
            WHERE work_id = %s;
            """,
            updates,
        )
    conn.commit()


def write_failures_csv(path: Path, failures: list[FailureRecord]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    failures_sorted = sorted(failures, key=lambda x: x.work_id)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["work_id", "source_title", "source_title_without_series", "source_author", "reason"])
        for rec in failures_sorted:
            writer.writerow(
                [
                    rec.work_id,
                    rec.source_title,
                    rec.source_title_without_series,
                    rec.source_author,
                    rec.reason,
                ]
            )


def run() -> int:
    args = parse_args()
    db_url = args.db_url or build_default_db_url()
    api_base_url = resolve_api_base_url(args.api_base_url)
    api_url = to_chat_completions_url(api_base_url)
    api_keys = resolve_api_keys(args.api_key, args.api_keys, args.api_keys_file)

    read_conn: psycopg.Connection | None = None
    write_conn: psycopg.Connection | None = None
    executor: ThreadPoolExecutor | None = None

    try:
        read_conn = psycopg.connect(db_url)
        total_works = get_works_count(read_conn)
        skip_already_translated = not args.force_retranslate
        rows_needing_translation = (
            get_rows_needing_translation_count(read_conn)
            if skip_already_translated
            else total_works
        )
        target_rows = (
            rows_needing_translation
            if args.limit is None
            else min(rows_needing_translation, args.limit)
        )

        print(f"DB rows in works: {total_works}", flush=True)
        if skip_already_translated:
            print(
                f"Rows already translated (auto-skipped): {max(0, total_works - rows_needing_translation)}",
                flush=True,
            )
        print(f"Rows needing translation: {rows_needing_translation}", flush=True)
        print(f"Rows targeted this run: {target_rows}", flush=True)
        print(
            f"Mode: {'dry-run (no DB writes)' if args.dry_run else 'live overwrite mode'}",
            flush=True,
        )
        print(
            f"Skip already translated: {'yes' if skip_already_translated else 'no (force-retranslate enabled)'}",
            flush=True,
        )
        print(
            "Throttle: min_interval="
            f"{args.min_request_interval_seconds:.2f}s, "
            f"max_interval={args.max_request_interval_seconds:.2f}s, "
            f"api_concurrency={args.api_concurrency}",
            flush=True,
        )
        print(
            f"Thinking mode: {'enabled' if args.enable_thinking else 'disabled (latency-optimized)'}",
            flush=True,
        )
        print(f"API key lanes: {len(api_keys)}", flush=True)
        if len(api_keys) > 1:
            print(
                "[warn] Multiple keys can improve throughput, but provider limits may still apply at account/project level.",
                flush=True,
            )
        if args.api_concurrency > 1:
            print(
                "[warn] api_concurrency > 1 increases 429 risk on stricter account limits.",
                flush=True,
            )
        print(f"API endpoint: {api_url}", flush=True)

        if target_rows == 0:
            write_failures_csv(FAILURES_CSV_PATH, [])
            print("No rows to process (all targeted books already translated).", flush=True)
            return 0

        if not api_keys:
            print(
                "Error: missing API key(s). Set ZAI_API_KEY/ ZAI_API_KEYS (or BIGMODEL_/GLM_/DEEPSEEK_ variants), "
                "or pass --api-key / --api-keys / --api-keys-file.",
                file=sys.stderr,
            )
            return 2

        if not args.dry_run:
            write_conn = psycopg.connect(db_url)
            works_count, backup_count = ensure_backup_table(write_conn)
            print(
                f"Backup validated: works={works_count}, works_translation_backup={backup_count}",
                flush=True,
            )

        rate_limiters: list[AdaptiveRateLimiter] = []
        clients: list[GLMClient] = []
        for api_key in api_keys:
            rate_limiter = AdaptiveRateLimiter(
                min_interval_seconds=args.min_request_interval_seconds,
                max_interval_seconds=args.max_request_interval_seconds,
            )
            rate_limiters.append(rate_limiter)
            clients.append(
                GLMClient(
                    api_key=api_key,
                    api_url=api_url,
                    model=args.model,
                    timeout_seconds=args.timeout_seconds,
                    max_retries=args.max_retries,
                    rate_limiter=rate_limiter,
                    api_concurrency=args.api_concurrency,
                    enable_thinking=args.enable_thinking,
                )
            )
        client: TranslationClient
        if len(clients) == 1:
            client = clients[0]
        else:
            client = MultiGLMClient(clients)

        corrective_batch_size = max(1, min(CORRECTIVE_BATCH_MAX, args.batch_size // 4))
        total_batches = int(math.ceil(target_rows / args.batch_size))
        max_inflight = max(1, args.concurrency)
        rows_iterator = iter_work_rows(
            read_conn,
            args.limit,
            skip_already_translated=skip_already_translated,
        )
        batches_iterator = batch_rows(rows_iterator, args.batch_size)

        processed_rows = 0
        updated_rows = 0
        completed_batches = 0
        all_failures: dict[str, FailureRecord] = {}
        preview: list[tuple[str, str, str, str]] = []
        start_time = time.monotonic()

        executor = ThreadPoolExecutor(max_workers=args.concurrency)
        pending: dict[Any, tuple[int, list[WorkRow]]] = {}
        next_batch_index = 1

        def submit_next_batch() -> bool:
            nonlocal next_batch_index
            try:
                rows = next(batches_iterator)
            except StopIteration:
                return False
            future = executor.submit(process_batch, rows, client, corrective_batch_size)
            pending[future] = (next_batch_index, rows)
            next_batch_index += 1
            return True

        for _ in range(max_inflight):
            if not submit_next_batch():
                break

        while pending:
            done, _ = wait(pending.keys(), return_when=FIRST_COMPLETED)
            for future in done:
                batch_index, batch_rows_input = pending.pop(future)
                try:
                    result = future.result()
                except Exception as exc:
                    result = BatchResult(
                        updates=[],
                        failures=[
                            FailureRecord(
                                work_id=row.work_id,
                                source_title=row.title,
                                source_title_without_series=row.title_without_series,
                                source_author=row.author,
                                reason=f"internal batch crash: {exc}",
                            )
                            for row in batch_rows_input
                        ],
                        preview_rows=[],
                    )

                if not args.dry_run:
                    apply_updates(write_conn, result.updates)  # type: ignore[arg-type]
                updated_rows += len(result.updates)

                processed_rows += len(batch_rows_input)
                completed_batches += 1

                for failure in result.failures:
                    all_failures[failure.work_id] = failure

                if args.dry_run and len(preview) < 5:
                    needed = 5 - len(preview)
                    preview.extend(result.preview_rows[:needed])

                if completed_batches % PROGRESS_EVERY_BATCHES == 0 or completed_batches == total_batches:
                    elapsed = time.monotonic() - start_time
                    rate = processed_rows / elapsed if elapsed > 0 else 0.0
                    remaining = max(0, target_rows - processed_rows)
                    eta = remaining / rate if rate > 0 else 0.0
                    print(
                        f"Progress {completed_batches}/{total_batches} batches | "
                        f"rows {processed_rows}/{target_rows} | "
                        f"updated {updated_rows} | failures {len(all_failures)} | "
                        f"rate {rate:.1f} rows/s | ETA {format_seconds(eta)} | "
                        f"throttle {format_throttle_status(rate_limiters)}",
                        flush=True,
                    )

                while len(pending) < max_inflight:
                    if not submit_next_batch():
                        break

        failures_list = list(all_failures.values())
        write_failures_csv(FAILURES_CSV_PATH, failures_list)
        print(f"Failure report: {FAILURES_CSV_PATH}", flush=True)

        if args.dry_run and preview:
            print("Dry-run preview (first successful rows):", flush=True)
            for work_id, title, title_without_series, author in preview:
                print(
                    f"  {work_id}: title={title!r}; title_without_series={title_without_series!r}; author={author!r}",
                    flush=True,
                )

        if failures_list:
            print(
                f"Completed with unresolved failures: {len(failures_list)} rows left unchanged.",
                file=sys.stderr,
                flush=True,
            )
            return 1

        print(f"Completed successfully. Updated rows: {updated_rows}", flush=True)
        return 0

    finally:
        if executor is not None:
            executor.shutdown(wait=True, cancel_futures=False)
        if write_conn is not None:
            write_conn.close()
        if read_conn is not None:
            read_conn.close()


if __name__ == "__main__":
    raise SystemExit(run())
