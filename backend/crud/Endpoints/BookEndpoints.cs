using crud.Contracts;
using crud.Data;
using crud.Entities;
using crud.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

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
                .OrderBy(b => b.Id)
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
            int? userRating = null;
            if (userId is not null)
            {
                var ub = await db.UserBooks.FirstOrDefaultAsync(x => x.UserId == userId.Value && x.BookId == id);
                if (ub is not null)
                {
                    userStatus = ub.Status;
                    userRating = ub.Rating;
                }
            }

            return Results.Ok(ToBookDto(book, null, userStatus, userRating));
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
                .OrderBy(b => b.Id)
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
                .Select(b => new
                {
                    Book = b,
                    LibraryCount = db.UserBooks.Count(ub => ub.BookId == b.Id)
                })
                .OrderByDescending(x => x.LibraryCount)
                .ThenBy(x => x.Book.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .Select(x => x.Book)
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

        Dictionary<int, (LibraryStatus Status, int? Rating)> userLibrary = new();
        if (userId is not null)
        {
            var ids = books.Select(b => b.Id).ToList();
            var entries = await db.UserBooks
                .Where(ub => ub.UserId == userId.Value && ids.Contains(ub.BookId))
                .Select(ub => new { ub.BookId, ub.Status, ub.Rating })
                .ToListAsync();

            userLibrary = entries.ToDictionary(x => x.BookId, x => (x.Status, x.Rating));
        }

        return books.Select(b =>
        {
            LibraryStatus? status = null;
            int? rating = null;
            if (userLibrary.TryGetValue(b.Id, out var ur))
            {
                status = ur.Status;
                rating = ur.Rating;
            }
            return ToBookDto(b, null, status, rating);
        }).ToList();
    }

    private static BookDto ToBookDto(Book b, double? averageRating, LibraryStatus? userStatus, int? userRating) =>
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
            userStatus,
            userRating
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

