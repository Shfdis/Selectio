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

        group.MapGet("", async (HttpContext http, CrudDbContext db, int? page, int? pageSize) =>
        {
            var (p, ps) = NormalizePagination(page, pageSize);
            var userId = GatewayIdentity.GetUserId(http);

            var items = await db.Books
                .OrderByDescending(b => b.Popularity)
                .ThenBy(b => b.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();

            return Results.Ok(await MapBooksToDtosAsync(db, items, userId));
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
            var userBookIds = await db.UserBooks
                .Where(ub => ub.UserId == userId)
                .Select(ub => ub.BookId)
                .ToListAsync(cancellationToken);

            if (userEmb is null)
            {
                return Results.Ok(new List<BookDto>());
            }

            var ids = await EmbeddingAnnSearch.GetRecommendedBookIdsAsync(
                dataSource,
                userEmb,
                userBookIds,
                (p - 1) * ps,
                ps,
                cancellationToken);

            if (ids.Count == 0)
            {
                return Results.Ok(new List<BookDto>());
            }

            var books = await db.Books.Where(b => ids.Contains(b.Id)).ToListAsync(cancellationToken);
            var ordered = ids.Select(id => books.First(b => b.Id == id)).ToList();
            return Results.Ok(await MapBooksToDtosAsync(db, ordered, userId));
        });

        group.MapGet("/popular-by-genre", async (HttpContext http, CrudDbContext db, string? genre, int? page, int? pageSize) =>
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
                .ToListAsync();

            return Results.Ok(await MapBooksToDtosAsync(db, items, userId));
        });

        group.MapGet("/{id:int}", async (HttpContext http, CrudDbContext db, int id) =>
        {
            var userId = GatewayIdentity.GetUserId(http);
            var book = await db.Books.FirstOrDefaultAsync(b => b.Id == id);
            if (book is null)
            {
                return Results.NotFound();
            }

            LibraryStatus? userStatus = null;
            if (userId is not null)
            {
                var ub = await db.UserBooks.FirstOrDefaultAsync(x => x.UserId == userId.Value && x.BookId == id);
                if (ub is not null)
                {
                    userStatus = ub.Status;
                }
            }

            return Results.Ok(ToBookDto(book, null, userStatus));
        });

        group.MapGet("/search", async (HttpContext http, CrudDbContext db, string? query, int? page, int? pageSize) =>
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
                .ToListAsync();

            return Results.Ok(await MapBooksToDtosAsync(db, items, userId));
        });

        group.MapGet("/popular", async (HttpContext http, CrudDbContext db, int? page, int? pageSize) =>
        {
            var (p, ps) = NormalizePagination(page, pageSize);
            var userId = GatewayIdentity.GetUserId(http);

            var items = await db.Books
                .OrderByDescending(b => b.Popularity)
                .ThenBy(b => b.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();

            return Results.Ok(await MapBooksToDtosAsync(db, items, userId));
        });

        return app;
    }

    private static async Task<List<BookDto>> MapBooksToDtosAsync(CrudDbContext db, List<Book> books, int? userId)
    {
        if (books.Count == 0)
        {
            return new List<BookDto>();
        }

        Dictionary<int, LibraryStatus> userLibrary = new();
        if (userId is not null)
        {
            var ids = books.Select(b => b.Id).ToList();
            var entries = await db.UserBooks
                .Where(ub => ub.UserId == userId.Value && ids.Contains(ub.BookId))
                .Select(ub => new { ub.BookId, ub.Status })
                .ToListAsync();

            userLibrary = entries.ToDictionary(x => x.BookId, x => x.Status);
        }

        return books.Select(b =>
        {
            LibraryStatus? status = null;
            if (userLibrary.TryGetValue(b.Id, out var ur))
            {
                status = ur;
            }
            return ToBookDto(b, null, status);
        }).ToList();
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

