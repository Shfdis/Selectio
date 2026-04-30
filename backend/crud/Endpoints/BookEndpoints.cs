using crud.Contracts;
using crud.Data;
using crud.Entities;
using crud.Infrastructure;
using crud.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace crud.Endpoints;

public static class BookEndpoints
{
    public static IEndpointRouteBuilder MapBookEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/books").WithTags("Books");

        group.MapGet("", async (HttpContext http, CrudDbContext db, int? page, int? pageSize, CancellationToken cancellationToken) =>
        {
            var (p, ps) = NormalizePagination(page, pageSize);
            var userId = GatewayIdentity.GetUserId(http);

            var items = await db.Books
                .OrderByDescending(b => b.Popularity)
                .ThenBy(b => b.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync(cancellationToken);

            return Results.Ok(await MapBooksToDtosAsync(db, items, userId, cancellationToken));
        });

        group.MapGet("/recommended", async (
            HttpContext http,
            CrudDbContext db,
            NpgsqlDataSource dataSource,
            int? page,
            int? pageSize,
            CancellationToken cancellationToken) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null)
            {
                return error;
            }

            var (p, ps) = NormalizePagination(page, pageSize);
            var userEmb = await EmbeddingService.GetUserEmbeddingAsync(db, userId, cancellationToken);
            var excludeBookIds = await SeenTracking.GetStaleSeenBookIdsAsync(db, userId, cancellationToken);

            if (userEmb is null)
            {
                return Results.Ok(new List<BookDto>());
            }

            var ids = await EmbeddingAnnSearch.GetRecommendedBookIdsAsync(
                dataSource,
                userEmb,
                excludeBookIds,
                (p - 1) * ps,
                ps,
                cancellationToken);

            if (ids.Count == 0)
            {
                return Results.Ok(new List<BookDto>());
            }

            var books = await db.Books.Where(b => ids.Contains(b.Id)).ToListAsync(cancellationToken);
            var ordered = ids.Select(id => books.First(b => b.Id == id)).ToList();
            var dtos = await MapBooksToDtosAsync(db, ordered, userId, cancellationToken);
            await SeenTracking.MarkBooksSeenAsync(db, userId, ordered.Select(b => b.Id), cancellationToken);
            return Results.Ok(dtos);
        });

        group.MapGet("/popular-by-genre", async (HttpContext http, CrudDbContext db, string? genre, int? page, int? pageSize, CancellationToken cancellationToken) =>
        {
            var (p, ps) = NormalizePagination(page, pageSize);
            var userId = GatewayIdentity.GetUserId(http);
            var q = db.Books.AsQueryable();
            if (!string.IsNullOrWhiteSpace(genre))
            {
                var g = genre.Trim();
                q = q.Where(b =>
                    EF.Functions.ILike(b.Genre, $"%{g}%") ||
                    EF.Functions.ILike(b.SecondGenre, $"%{g}%"));
            }

            var items = await q
                .OrderByDescending(b => b.Popularity)
                .ThenBy(b => b.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync(cancellationToken);

            return Results.Ok(await MapBooksToDtosAsync(db, items, userId, cancellationToken));
        });

        group.MapGet("/{id:int}", async (HttpContext http, CrudDbContext db, int id, CancellationToken cancellationToken) =>
        {
            var userId = GatewayIdentity.GetUserId(http);
            var book = await db.Books.FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
            if (book is null)
            {
                return Results.NotFound();
            }

            LibraryStatus? userStatus = null;
            if (userId is not null)
            {
                var ub = await db.UserBooks.FirstOrDefaultAsync(x => x.UserId == userId.Value && x.BookId == id, cancellationToken);
                if (ub is not null)
                {
                    userStatus = ub.Status;
                }
            }

            var avgs = await GetAverageRatingsByBookIdAsync(db, [id], cancellationToken);
            return Results.Ok(ToBookDto(book, avgs[id], userStatus));
        });

        group.MapGet("/search", async (HttpContext http, CrudDbContext db, string? query, int? page, int? pageSize, CancellationToken cancellationToken) =>
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return Results.BadRequest(new { message = "query is required" });
            }

            var (p, ps) = NormalizePagination(page, pageSize);
            var userId = GatewayIdentity.GetUserId(http);
            var q = query.Trim();
            var pattern = $"%{q}%";

            var items = await db.Books
                .Where(b =>
                    EF.Functions.ILike(b.Title, pattern) ||
                    EF.Functions.ILike(b.Author, pattern)
                )
                .OrderByDescending(b => b.Popularity)
                .ThenBy(b => b.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync(cancellationToken);

            return Results.Ok(await MapBooksToDtosAsync(db, items, userId, cancellationToken));
        });

        group.MapGet("/popular", async (HttpContext http, CrudDbContext db, int? page, int? pageSize, CancellationToken cancellationToken) =>
        {
            var (p, ps) = NormalizePagination(page, pageSize);
            var userId = GatewayIdentity.GetUserId(http);

            var items = await db.Books
                .OrderByDescending(b => b.Popularity)
                .ThenBy(b => b.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync(cancellationToken);

            return Results.Ok(await MapBooksToDtosAsync(db, items, userId, cancellationToken));
        });

        return app;
    }

    private static async Task<List<BookDto>> MapBooksToDtosAsync(
        CrudDbContext db,
        List<Book> books,
        int? userId,
        CancellationToken cancellationToken)
    {
        if (books.Count == 0)
        {
            return new List<BookDto>();
        }

        var bookIds = books.Select(b => b.Id).ToList();
        var averageByBookId = await GetAverageRatingsByBookIdAsync(db, bookIds, cancellationToken);

        Dictionary<int, LibraryStatus> userLibrary = new();
        if (userId is not null)
        {
            var entries = await db.UserBooks
                .Where(ub => ub.UserId == userId.Value && bookIds.Contains(ub.BookId))
                .Select(ub => new { ub.BookId, ub.Status })
                .ToListAsync(cancellationToken);

            userLibrary = entries.ToDictionary(x => x.BookId, x => x.Status);
        }

        return books.Select(b =>
        {
            LibraryStatus? status = null;
            if (userLibrary.TryGetValue(b.Id, out var ur))
            {
                status = ur;
            }
            return ToBookDto(b, averageByBookId[b.Id], status);
        }).ToList();
    }

    /// <summary>Per-bookId average of <see cref="BookComment.Rating"/>, 1-decimal rounded; null when no comments.</summary>
    private static async Task<Dictionary<int, double?>> GetAverageRatingsByBookIdAsync(
        CrudDbContext db,
        IReadOnlyList<int> bookIds,
        CancellationToken cancellationToken)
    {
        var result = bookIds.Distinct().ToDictionary(id => id, _ => (double?)null);
        if (result.Count == 0)
        {
            return result;
        }

        var rows = await db.BookComments
            .AsNoTracking()
            .Where(c => bookIds.Contains(c.BookId))
            .GroupBy(c => c.BookId)
            .Select(g => new { BookId = g.Key, Avg = g.Average(x => (double)x.Rating) })
            .ToListAsync(cancellationToken);

        foreach (var r in rows)
        {
            result[r.BookId] = Math.Round(r.Avg, 1, MidpointRounding.AwayFromZero);
        }

        return result;
    }

    private static BookDto ToBookDto(Book b, double? averageRating, LibraryStatus? userStatus) =>
        new(
            b.Id,
            b.Title,
            b.Author,
            b.Description,
            b.Genre,
            b.SecondGenre,
            b.CoverUrl,
            b.ReleaseDate,
            averageRating,
            userStatus
        );

    private static (int page, int pageSize) NormalizePagination(int? page, int? pageSize)
    {
        var p = page.GetValueOrDefault(1);
        var ps = pageSize.GetValueOrDefault(20);

        if (p < 1) p = 1;
        if (ps < 1) ps = 1;
        if (ps > 100) ps = 100;

        return (p, ps);
    }
}

