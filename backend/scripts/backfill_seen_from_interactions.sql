-- Run on production after deploy (SeenPosts / SeenBooks tables exist).
-- Marks prior interactions as seen long enough ago that feed/rec exclude them (24h rule uses SeenAt < now - 24h).

-- Posts: authors, likes, favorites, comment authors
INSERT INTO crud."SeenPosts" ("UserId", "PostId", "SeenAt")
SELECT s."UserId", s."PostId", (NOW() AT TIME ZONE 'UTC' - INTERVAL '25 hours')
FROM (
    SELECT p."AuthorUserId" AS "UserId", p."Id" AS "PostId" FROM crud."Posts" p
    UNION ALL
    SELECT pl."UserId", pl."PostId" FROM crud."PostLikes" pl
    UNION ALL
    SELECT fp."UserId", fp."PostId" FROM crud."FavoritePosts" fp
    UNION ALL
    SELECT pc."AuthorUserId" AS "UserId", pc."PostId" FROM crud."PostComments" pc
) s
ON CONFLICT ("UserId", "PostId") DO UPDATE SET "SeenAt" = EXCLUDED."SeenAt";

-- Books: library + review authors
INSERT INTO crud."SeenBooks" ("UserId", "BookId", "SeenAt")
SELECT s."UserId", s."BookId", (NOW() AT TIME ZONE 'UTC' - INTERVAL '25 hours')
FROM (
    SELECT ub."UserId", ub."BookId" FROM crud."UserBooks" ub
    UNION ALL
    SELECT bc."AuthorUserId" AS "UserId", bc."BookId" FROM crud."BookComments" bc
) s
ON CONFLICT ("UserId", "BookId") DO UPDATE SET "SeenAt" = EXCLUDED."SeenAt";
