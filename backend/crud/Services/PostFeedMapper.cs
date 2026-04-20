using crud.Contracts;
using crud.Data;
using crud.Entities;
using Microsoft.EntityFrameworkCore;

namespace crud.Services;

public static class PostFeedMapper
{
    public static async Task<List<PostFeedItemDto>> ToFeedItemsAsync(
        CrudDbContext db,
        IReadOnlyList<Post> posts,
        int? currentUserId,
        CancellationToken cancellationToken = default)
    {
        if (posts.Count == 0)
        {
            return new List<PostFeedItemDto>();
        }

        var postIds = posts.Select(p => p.Id).ToList();

        var likeCounts = await db.PostLikes
            .Where(l => postIds.Contains(l.PostId))
            .GroupBy(l => l.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);
        var likeCountMap = likeCounts.ToDictionary(x => x.PostId, x => x.Count);

        var commentCounts = await db.PostComments
            .Where(c => postIds.Contains(c.PostId))
            .GroupBy(c => c.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);
        var commentCountMap = commentCounts.ToDictionary(x => x.PostId, x => x.Count);

        HashSet<int> likedSet = new();
        HashSet<int> favSet = new();
        if (currentUserId.HasValue)
        {
            likedSet = (await db.PostLikes
                    .Where(l => postIds.Contains(l.PostId) && l.UserId == currentUserId.Value)
                    .Select(l => l.PostId)
                    .ToListAsync(cancellationToken))
                .ToHashSet();

            favSet = (await db.FavoritePosts
                    .Where(f => postIds.Contains(f.PostId) && f.UserId == currentUserId.Value)
                    .Select(f => f.PostId)
                    .ToListAsync(cancellationToken))
                .ToHashSet();
        }

        var authorIds = posts.Select(p => p.AuthorUserId).Distinct().ToList();
        var usernames = await db.UserProfiles
            .Where(u => authorIds.Contains(u.UserId))
            .ToDictionaryAsync(u => u.UserId, u => u.Username, cancellationToken);

        var result = new List<PostFeedItemDto>(posts.Count);
        foreach (var p in posts)
        {
            var book = p.Book;
            var bookDto = book is null
                ? new PostFeedBookDto(p.BookId, string.Empty, string.Empty, string.Empty, string.Empty)
                : new PostFeedBookDto(book.Id, book.Title, book.Author, book.Genre, book.CoverUrl);
            var username = usernames.GetValueOrDefault(p.AuthorUserId, string.Empty);
            if (string.IsNullOrEmpty(username))
            {
                username = $"user{p.AuthorUserId}";
            }

            result.Add(new PostFeedItemDto(
                p.Id,
                p.CommunityId,
                p.AuthorUserId,
                username,
                p.BookId,
                p.Content,
                p.PhotoUrl,
                p.Status,
                p.CreatedAt,
                bookDto,
                likeCountMap.GetValueOrDefault(p.Id),
                commentCountMap.GetValueOrDefault(p.Id),
                currentUserId.HasValue && likedSet.Contains(p.Id),
                currentUserId.HasValue && favSet.Contains(p.Id)
            ));
        }

        return result;
    }
}
