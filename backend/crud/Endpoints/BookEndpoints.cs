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

        group.MapGet("", async (CrudDbContext db, int? page, int? pageSize) =>
        {
            var (p, ps) = NormalizePagination(page, pageSize);
            var items = await db.Books
                .OrderByDescending(b => b.Popularity)
                .ThenBy(b => b.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();
            var dtos = await ListBooksAsync(db, items, null);
            return Results.Ok(dtos);
        })
        .WithSummary("List books")
        .WithDescription(
            "Returns all books ordered by popularity descending, then id ascending. " +
            "Pagination: page defaults to 1, pageSize defaults to 20 (max 100). " +
            "Each item includes aggregate averageRating from book comments and library ratings when available."
        )
        .Produces<List<BookDto>>(StatusCodes.Status200OK);

        group.MapGet("/recommended", async (HttpContext http, CrudDbContext db, NpgsqlDataSource dataSource, int? page, int? pageSize, CancellationToken cancellationToken) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;
            var (p, ps) = NormalizePagination(page, pageSize);
            var userEmb = await EmbeddingService.GetUserEmbeddingAsync(db, userId, cancellationToken);
            var userBookIds = await db.UserBooks.Where(ub => ub.UserId == userId).Select(ub => ub.BookId).ToListAsync(cancellationToken);
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
            var dtos = await ListBooksAsync(db, ordered, null);
            return Results.Ok(dtos);
        })
        .WithSummary("Recommended books for current user")
        .WithDescription(
            "Requires the authenticated user (gateway injects user id). " +
            "Ranks books with embeddings using pgvector cosine distance (HNSW index) against the user's library-derived embedding. " +
            "Books already in the user's library are excluded. " +
            "Returns an empty list if the user has no embedding yet or no eligible books exist."
        )
        .Produces<List<BookDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

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
                .OrderByDescending(b => b.Popularity)
                .ThenBy(b => b.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();
            var dtos = await ListBooksAsync(db, items, null);
            return Results.Ok(dtos);
        })
        .WithSummary("Popular books, optionally filtered by genre")
        .WithDescription(
            "Ranks books by persisted popularity descending, tie-broken by book id ascending. " +
            "When genre is provided, matches case-insensitively against the book's genre field (substring match). " +
            "Pagination: page defaults to 1, pageSize defaults to 20 (max 100)."
        )
        .Produces<List<BookDto>>(StatusCodes.Status200OK);

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
        })
        .WithSummary("Get book by id")
        .WithDescription(
            "Returns one book with averageRating (from book comments + library ratings). " +
            "If the request includes an authenticated user, also returns that user's library status and rating for this book when present."
        )
        .Produces<BookDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        group.MapGet("/search", async (CrudDbContext db, string? query, int? page, int? pageSize) =>
        {
            if (string.IsNullOrWhiteSpace(query))
                return Results.BadRequest(new { message = "query is required" });
            var (p, ps) = NormalizePagination(page, pageSize);
            var pattern = $"%{query.Trim()}%";
            var q = db.Books.Where(b =>
                EF.Functions.ILike(b.Title, pattern) || EF.Functions.ILike(b.Author, pattern));
            var items = await q
                .OrderByDescending(b => b.Popularity)
                .ThenBy(b => b.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();
            var dtos = await ListBooksAsync(db, items, null);
            return Results.Ok(dtos);
        })
        .WithSummary("Search books by title or author")
        .WithDescription(
            "query is required. Case-insensitive match on title OR author (substring). " +
            "Results are ordered by popularity descending, then id ascending. " +
            "Pagination: page defaults to 1, pageSize defaults to 20 (max 100)."
        )
        .Produces<List<BookDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);

        group.MapGet("/popular", async (CrudDbContext db, int? page, int? pageSize) =>
        {
            var (p, ps) = NormalizePagination(page, pageSize);
            var items = await db.Books
                .OrderByDescending(b => b.Popularity)
                .ThenBy(b => b.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();
            var dtos = await ListBooksAsync(db, items, null);
            return Results.Ok(dtos);
        })
        .WithSummary("Popular books across all genres")
        .WithDescription(
            "Same ranking as popular-by-genre but without a genre filter: popularity descending, then by book id ascending. " +
            "Pagination: page defaults to 1, pageSize defaults to 20 (max 100)."
        )
        .Produces<List<BookDto>>(StatusCodes.Status200OK);

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

