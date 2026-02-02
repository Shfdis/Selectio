from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict

import numpy as np


def ensure_dir(path: str | Path) -> Path:
    p = Path(path)
    p.mkdir(parents=True, exist_ok=True)
    return p


def write_json(path: str | Path, obj: Any) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True).encode("utf-8")
    p.write_bytes(data)


def read_json(path: str | Path) -> Any:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def save_npz(path: str | Path, **arrays: np.ndarray) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(str(p), **arrays)


def load_npz(path: str | Path) -> Dict[str, np.ndarray]:
    with np.load(str(path), allow_pickle=False) as data:
        return {k: data[k] for k in data.files}


def _find_git_root(start: Path) -> Path | None:
    p = start.resolve()
    for parent in [p, *p.parents]:
        if (parent / ".git").exists():
            return parent
    return None


def resolve_path_maybe_from_git_root(path: str | Path) -> Path:
    """
    If `path` exists as given, return it.
    Otherwise, if it looks relative, try resolving it from the git repo root.
    """
    p = Path(path)
    if p.exists():
        return p
    if p.is_absolute():
        return p
    root = _find_git_root(Path.cwd())
    if root is None:
        return p
    return root / p

