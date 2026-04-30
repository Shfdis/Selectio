using crud.Data;
using crud.Entities;
using Microsoft.EntityFrameworkCore;

namespace crud.Services;

public static class SeenTracking
{
    public static readonly TimeSpan SeenTtl = TimeSpan.FromHours(24);

    public static async Task<List<int>> GetStaleSeenPostIdsAsync(
        CrudDbContext db,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var cutoff = DateTime.UtcNow.Subtract(SeenTtl);
        return await db.SeenPosts
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.SeenAt < cutoff)
            .Select(s => s.PostId)
            .Distinct()
            .ToListAsync(cancellationToken);
    }

    public static async Task<List<int>> GetStaleSeenBookIdsAsync(
        CrudDbContext db,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var cutoff = DateTime.UtcNow.Subtract(SeenTtl);
        return await db.SeenBooks
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.SeenAt < cutoff)
            .Select(s => s.BookId)
            .Distinct()
            .ToListAsync(cancellationToken);
    }

    public static async Task UpsertSeenPostAsync(
        CrudDbContext db,
        int userId,
        int postId,
        DateTime seenAt,
        CancellationToken cancellationToken = default)
    {
        var row = await db.SeenPosts.FirstOrDefaultAsync(
            s => s.UserId == userId && s.PostId == postId,
            cancellationToken);
        if (row is null)
        {
            db.SeenPosts.Add(new SeenPost { UserId = userId, PostId = postId, SeenAt = seenAt });
        }
        else
        {
            row.SeenAt = seenAt;
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public static async Task UpsertSeenBookAsync(
        CrudDbContext db,
        int userId,
        int bookId,
        DateTime seenAt,
        CancellationToken cancellationToken = default)
    {
        var row = await db.SeenBooks.FirstOrDefaultAsync(
            s => s.UserId == userId && s.BookId == bookId,
            cancellationToken);
        if (row is null)
        {
            db.SeenBooks.Add(new SeenBook { UserId = userId, BookId = bookId, SeenAt = seenAt });
        }
        else
        {
            row.SeenAt = seenAt;
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public static async Task MarkPostsSeenAsync(
        CrudDbContext db,
        int userId,
        IEnumerable<int> postIds,
        CancellationToken cancellationToken = default)
    {
        var seenAt = DateTime.UtcNow;
        var ids = postIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return;
        }

        var existing = await db.SeenPosts
            .Where(s => s.UserId == userId && ids.Contains(s.PostId))
            .ToListAsync(cancellationToken);
        var map = existing.ToDictionary(x => x.PostId);
        foreach (var id in ids)
        {
            if (map.TryGetValue(id, out var row))
            {
                row.SeenAt = seenAt;
            }
            else
            {
                db.SeenPosts.Add(new SeenPost { UserId = userId, PostId = id, SeenAt = seenAt });
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public static async Task MarkBooksSeenAsync(
        CrudDbContext db,
        int userId,
        IEnumerable<int> bookIds,
        CancellationToken cancellationToken = default)
    {
        var seenAt = DateTime.UtcNow;
        var ids = bookIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return;
        }

        var existing = await db.SeenBooks
            .Where(s => s.UserId == userId && ids.Contains(s.BookId))
            .ToListAsync(cancellationToken);
        var map = existing.ToDictionary(x => x.BookId);
        foreach (var id in ids)
        {
            if (map.TryGetValue(id, out var row))
            {
                row.SeenAt = seenAt;
            }
            else
            {
                db.SeenBooks.Add(new SeenBook { UserId = userId, BookId = id, SeenAt = seenAt });
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
