-- Read-only: compare interaction tables to SeenPosts / SeenBooks.
\pset pager off

SELECT 'Verification: interacted items missing from Seen tables' AS check_name;

WITH post_ix AS (
    SELECT p."AuthorUserId" AS "UserId", p."Id" AS "PostId" FROM crud."Posts" p
    UNION
    SELECT pl."UserId", pl."PostId" FROM crud."PostLikes" pl
    UNION
    SELECT fp."UserId", fp."PostId" FROM crud."FavoritePosts" fp
    UNION
    SELECT pc."AuthorUserId", pc."PostId" FROM crud."PostComments" pc
)
SELECT
    (SELECT COUNT(*) FROM post_ix) AS distinct_post_interaction_pairs,
    (SELECT COUNT(*) FROM crud."SeenPosts") AS seen_posts_rows,
    (SELECT COUNT(*) FROM post_ix i WHERE NOT EXISTS (
        SELECT 1 FROM crud."SeenPosts" s
        WHERE s."UserId" = i."UserId" AND s."PostId" = i."PostId"
    )) AS post_pairs_missing_seen;

WITH book_ix AS (
    SELECT ub."UserId", ub."BookId" FROM crud."UserBooks" ub
    UNION
    SELECT bc."AuthorUserId", bc."BookId" FROM crud."BookComments" bc
)
SELECT
    (SELECT COUNT(*) FROM book_ix) AS distinct_book_interaction_pairs,
    (SELECT COUNT(*) FROM crud."SeenBooks") AS seen_books_rows,
    (SELECT COUNT(*) FROM book_ix i WHERE NOT EXISTS (
        SELECT 1 FROM crud."SeenBooks" s
        WHERE s."UserId" = i."UserId" AND s."BookId" = i."BookId"
    )) AS book_pairs_missing_seen;

SELECT 'Per-source post gaps (should be 0 each)' AS detail;
SELECT src, missing FROM (
    SELECT 'post_author' AS src,
        COUNT(*)::bigint AS missing
    FROM crud."Posts" p
    WHERE NOT EXISTS (
        SELECT 1 FROM crud."SeenPosts" s
        WHERE s."UserId" = p."AuthorUserId" AND s."PostId" = p."Id"
    )
    UNION ALL
    SELECT 'post_like',
        COUNT(*)::bigint
    FROM crud."PostLikes" pl
    WHERE NOT EXISTS (
        SELECT 1 FROM crud."SeenPosts" s
        WHERE s."UserId" = pl."UserId" AND s."PostId" = pl."PostId"
    )
    UNION ALL
    SELECT 'favorite',
        COUNT(*)::bigint
    FROM crud."FavoritePosts" fp
    WHERE NOT EXISTS (
        SELECT 1 FROM crud."SeenPosts" s
        WHERE s."UserId" = fp."UserId" AND s."PostId" = fp."PostId"
    )
    UNION ALL
    SELECT 'post_comment',
        COUNT(*)::bigint
    FROM crud."PostComments" pc
    WHERE NOT EXISTS (
        SELECT 1 FROM crud."SeenPosts" s
        WHERE s."UserId" = pc."AuthorUserId" AND s."PostId" = pc."PostId"
    )
) x ORDER BY src;

SELECT 'Per-source book gaps (should be 0 each)' AS detail;
SELECT src, missing FROM (
    SELECT 'user_library' AS src,
        COUNT(*)::bigint AS missing
    FROM crud."UserBooks" ub
    WHERE NOT EXISTS (
        SELECT 1 FROM crud."SeenBooks" s
        WHERE s."UserId" = ub."UserId" AND s."BookId" = ub."BookId"
    )
    UNION ALL
    SELECT 'book_review' AS src,
        COUNT(*)::bigint AS missing
    FROM crud."BookComments" bc
    WHERE NOT EXISTS (
        SELECT 1 FROM crud."SeenBooks" s
        WHERE s."UserId" = bc."AuthorUserId" AND s."BookId" = bc."BookId"
    )
) x ORDER BY src;

SELECT 'Sample missing post pairs (up to 5)' AS sample;
WITH post_ix AS (
    SELECT p."AuthorUserId" AS "UserId", p."Id" AS "PostId" FROM crud."Posts" p
    UNION
    SELECT pl."UserId", pl."PostId" FROM crud."PostLikes" pl
    UNION
    SELECT fp."UserId", fp."PostId" FROM crud."FavoritePosts" fp
    UNION
    SELECT pc."AuthorUserId", pc."PostId" FROM crud."PostComments" pc
)
SELECT i."UserId", i."PostId" FROM post_ix i
WHERE NOT EXISTS (
    SELECT 1 FROM crud."SeenPosts" s
    WHERE s."UserId" = i."UserId" AND s."PostId" = i."PostId"
)
LIMIT 5;

SELECT 'Sample missing book pairs (up to 5)' AS sample;
WITH book_ix AS (
    SELECT ub."UserId", ub."BookId" FROM crud."UserBooks" ub
    UNION
    SELECT bc."AuthorUserId", bc."BookId" FROM crud."BookComments" bc
)
SELECT i."UserId", i."BookId" FROM book_ix i
WHERE NOT EXISTS (
    SELECT 1 FROM crud."SeenBooks" s
    WHERE s."UserId" = i."UserId" AND s."BookId" = i."BookId"
)
LIMIT 5;
