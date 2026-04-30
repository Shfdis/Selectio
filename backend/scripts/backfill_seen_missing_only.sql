-- Fill only missing Seen rows for interaction pairs (does not change SeenAt for existing rows).
-- SeenAt = 25h ago so feed/rec treat as stale per 24h rule.

INSERT INTO crud."SeenPosts" ("UserId", "PostId", "SeenAt")
SELECT s."UserId", s."PostId", (NOW() AT TIME ZONE 'UTC' - INTERVAL '25 hours')
FROM (
    SELECT p."AuthorUserId" AS "UserId", p."Id" AS "PostId" FROM crud."Posts" p
    UNION
    SELECT pl."UserId", pl."PostId" FROM crud."PostLikes" pl
    UNION
    SELECT fp."UserId", fp."PostId" FROM crud."FavoritePosts" fp
    UNION
    SELECT pc."AuthorUserId" AS "UserId", pc."PostId" FROM crud."PostComments" pc
) s
ON CONFLICT ("UserId", "PostId") DO NOTHING;

INSERT INTO crud."SeenBooks" ("UserId", "BookId", "SeenAt")
SELECT s."UserId", s."BookId", (NOW() AT TIME ZONE 'UTC' - INTERVAL '25 hours')
FROM (
    SELECT ub."UserId", ub."BookId" FROM crud."UserBooks" ub
    UNION
    SELECT bc."AuthorUserId" AS "UserId", bc."BookId" FROM crud."BookComments" bc
) s
ON CONFLICT ("UserId", "BookId") DO NOTHING;
