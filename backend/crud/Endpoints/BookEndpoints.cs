using crud.Contracts;
using crud.Data;
using crud.Entities;
using crud.Infrastructure;
using crud.Services;
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
            var items = await db.Books.OrderBy(b => b.Id).Skip((p - 1) * ps).Take(ps).ToListAsync();
            var dtos = await ListBooksAsync(db, items, null);
            return Results.Ok(dtos);
        });

        group.MapGet("/recommended", async (HttpContext http, CrudDbContext db, int? page, int? pageSize) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;
            var (p, ps) = NormalizePagination(page, pageSize);
            var userEmb = await EmbeddingService.GetUserEmbeddingAsync(db, userId);
            var userBookIds = await db.UserBooks.Where(ub => ub.UserId == userId).Select(ub => ub.BookId).ToListAsync();
            var booksWithEmb = await db.Books
                .Where(b => b.Embedding != null && b.Embedding.Length == EmbeddingService.Dimensions && !userBookIds.Contains(b.Id))
                .ToListAsync();
            if (userEmb == null || booksWithEmb.Count == 0)
            {
                return Results.Ok(new List<BookDto>());
            }
            var scored = booksWithEmb
                .Select(b => (Book: b, Score: EmbeddingService.CosineSimilarity(userEmb, b.Embedding!)))
                .OrderByDescending(x => x.Score)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToList();
            var ids = scored.Select(x => x.Book.Id).ToList();
            var ordered = await db.Books.Where(b => ids.Contains(b.Id)).ToListAsync();
            ordered = ordered.OrderBy(b => ids.IndexOf(b.Id)).ToList();
            var dtos = await ListBooksAsync(db, ordered, null);
            return Results.Ok(dtos);
        });

        group.MapGet("/popular-by-genre", async (CrudDbContext db, string? genre, int? page, int? pageSize) =>
        {
            var (p, ps) = NormalizePagination(page, pageSize);
            var q = db.Books.AsQueryable();
            if (!string.IsNullOrWhiteSpace(genre))
            {
                var g = genre.Trim();
                q = q.Where(b => EF.Functions.ILike(b.Genre, $"%{g}%"));
            }
            var items = await q
                .Select(b => new { Book = b, LibraryCount = db.UserBooks.Count(ub => ub.BookId == b.Id) })
                .OrderByDescending(x => x.LibraryCount)
                .ThenBy(x => x.Book.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .Select(x => x.Book)
                .ToListAsync();
            var dtos = await ListBooksAsync(db, items, null);
            return Results.Ok(dtos);
        });

        group.MapGet("/{id:int}", async (HttpContext http, CrudDbContext db, int id) =>
        {
            var book = await db.Books.FirstOrDefaultAsync(b => b.Id == id);
            if (book is null) return Results.NotFound();
            int? userId = GatewayIdentity.GetUserId(http);
            var avgRating = await GetAverageRatingAsync(db, id);
            LibraryStatus? userStatus = null;
            int? userRating = null;
            if (userId.HasValue)
            {
                var ub = await db.UserBooks.FirstOrDefaultAsync(ub => ub.UserId == userId && ub.BookId == id);
                if (ub != null) { userStatus = ub.Status; userRating = ub.Rating; }
            }
            var dto = ToBookDto(book, avgRating, userStatus, userRating);
            return Results.Ok(dto);
        });

        group.MapGet("/search", async (CrudDbContext db, string? query, int? page, int? pageSize) =>
        {
            if (string.IsNullOrWhiteSpace(query))
                return Results.BadRequest(new { message = "query is required" });
            var (p, ps) = NormalizePagination(page, pageSize);
            var pattern = $"%{query.Trim()}%";
            var q = db.Books.Where(b =>
                EF.Functions.ILike(b.Title, pattern) || EF.Functions.ILike(b.Author, pattern));
            var items = await q.OrderBy(b => b.Id).Skip((p - 1) * ps).Take(ps).ToListAsync();
            var dtos = await ListBooksAsync(db, items, null);
            return Results.Ok(dtos);
        });

        group.MapGet("/popular", async (CrudDbContext db, int? page, int? pageSize) =>
        {
            var (p, ps) = NormalizePagination(page, pageSize);
            var items = await db.Books
                .Select(b => new { Book = b, LibraryCount = db.UserBooks.Count(ub => ub.BookId == b.Id) })
                .OrderByDescending(x => x.LibraryCount)
                .ThenBy(x => x.Book.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .Select(x => x.Book)
                .ToListAsync();
            var dtos = await ListBooksAsync(db, items, null);
            return Results.Ok(dtos);
        });

        return app;
    }

    private static async Task<List<BookDto>> ListBooksAsync(CrudDbContext db, List<Book> books, int? userId)
    {
        var ids = books.Select(b => b.Id).ToList();
        if (ids.Count == 0) return new List<BookDto>();
        var commentRatings = await db.BookComments.Where(c => ids.Contains(c.BookId))
            .Select(c => new { c.BookId, c.Rating })
            .ToListAsync();
        var libraryRatings = await db.UserBooks.Where(ub => ub.Rating != null && ids.Contains(ub.BookId))
            .Select(ub => new { ub.BookId, Rating = ub.Rating!.Value })
            .ToListAsync();
        var allRatings = commentRatings.Select(c => new { c.BookId, Rating = (double)c.Rating })
            .Concat(libraryRatings.Select(l => new { l.BookId, Rating = (double)l.Rating }))
            .GroupBy(x => x.BookId)
            .ToDictionary(g => g.Key, g => (double?)g.Average(x => x.Rating));
        Dictionary<int, (LibraryStatus Status, int? Rating)>? userLib = null;
        if (userId.HasValue)
        {
            var ubs = await db.UserBooks.Where(ub => ub.UserId == userId && ids.Contains(ub.BookId))
                .Select(ub => new { ub.BookId, ub.Status, ub.Rating })
                .ToListAsync();
            userLib = ubs.ToDictionary(x => x.BookId, x => (x.Status, x.Rating));
        }
        return books.Select(b =>
        {
            LibraryStatus? status = null;
            int? rating = null;
            if (userLib != null && userLib.TryGetValue(b.Id, out var uv))
            {
                status = uv.Status;
                rating = uv.Rating;
            }
            return ToBookDto(b, allRatings.GetValueOrDefault(b.Id), status, rating);
        }).ToList();
    }

    private static async Task<double?> GetAverageRatingAsync(CrudDbContext db, int bookId)
    {
        var fromComments = await db.BookComments.Where(c => c.BookId == bookId).Select(c => (double)c.Rating).ToListAsync();
        var fromLibrary = await db.UserBooks.Where(ub => ub.BookId == bookId && ub.Rating != null).Select(ub => (double)ub.Rating!.Value).ToListAsync();
        var all = fromComments.Concat(fromLibrary).ToList();
        if (all.Count == 0) return null;
        return all.Average();
    }

    private static BookDto ToBookDto(Book b, double? averageRating, LibraryStatus? userStatus, int? userRating) =>
        new(b.Id, b.Title, b.Author, b.Description, b.Genre, b.CoverUrl, b.ReleaseDate, averageRating, userStatus, userRating);

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

