using crud.Contracts;
using crud.Data;
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

        group.MapGet("", async (CrudDbContext db, int? page, int? pageSize) =>
        {
            var (p, ps) = NormalizePagination(page, pageSize);

            var items = await db.Books
                .OrderBy(b => b.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .Select(b => new BookDto(b.Id, b.Title, b.Author, b.Description, b.Genre, b.CoverUrl))
                .ToListAsync();

            return Results.Ok(items);
        });

        group.MapGet("/{id:int}", async (CrudDbContext db, int id) =>
        {
            var book = await db.Books
                .Where(b => b.Id == id)
                .Select(b => new BookDto(b.Id, b.Title, b.Author, b.Description, b.Genre, b.CoverUrl))
                .FirstOrDefaultAsync();

            return book is null ? Results.NotFound() : Results.Ok(book);
        });

        group.MapGet("/search", async (CrudDbContext db, string? query, int? page, int? pageSize) =>
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return Results.BadRequest(new { message = "query is required" });
            }

            var (p, ps) = NormalizePagination(page, pageSize);
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
                .Select(b => new BookDto(b.Id, b.Title, b.Author, b.Description, b.Genre, b.CoverUrl))
                .ToListAsync();

            return Results.Ok(items);
        });

        group.MapGet("/popular", async (CrudDbContext db, int? page, int? pageSize) =>
        {
            var (p, ps) = NormalizePagination(page, pageSize);

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
                .Select(x => new BookDto(
                    x.Book.Id,
                    x.Book.Title,
                    x.Book.Author,
                    x.Book.Description,
                    x.Book.Genre,
                    x.Book.CoverUrl
                ))
                .ToListAsync();

            return Results.Ok(items);
        });

        return app;
    }

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

