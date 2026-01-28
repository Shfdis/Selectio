using crud.Contracts;
using crud.Data;
using crud.Entities;
using crud.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace crud.Endpoints;

public static class LibraryEndpoints
{
    public static IEndpointRouteBuilder MapLibraryEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/books/{id:int}/library", async (HttpContext http, CrudDbContext db, int id, AddToLibraryRequest? body) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var exists = await db.Books.AnyAsync(b => b.Id == id);
            if (!exists)
            {
                return Results.NotFound();
            }

            var userBook = await db.UserBooks.FirstOrDefaultAsync(x => x.UserId == userId && x.BookId == id);
            if (userBook is null)
            {
                userBook = new UserBook
                {
                    UserId = userId,
                    BookId = id,
                    Status = body?.Status ?? LibraryStatus.WantToRead
                };
                db.UserBooks.Add(userBook);
                await db.SaveChangesAsync();
            }

            return Results.Ok(new
            {
                userId = userBook.UserId,
                bookId = userBook.BookId,
                status = userBook.Status,
                rating = userBook.Rating
            });
        }).WithTags("Library");

        app.MapPut("/api/books/{id:int}/library", async (HttpContext http, CrudDbContext db, int id, UpdateLibraryStatusRequest body) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var userBook = await db.UserBooks.FirstOrDefaultAsync(x => x.UserId == userId && x.BookId == id);
            if (userBook is null)
            {
                return Results.NotFound();
            }

            userBook.Status = body.Status;
            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                userId = userBook.UserId,
                bookId = userBook.BookId,
                status = userBook.Status,
                rating = userBook.Rating
            });
        }).WithTags("Library");

        app.MapDelete("/api/books/{id:int}/library", async (HttpContext http, CrudDbContext db, int id) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var userBook = await db.UserBooks.FirstOrDefaultAsync(x => x.UserId == userId && x.BookId == id);
            if (userBook is null)
            {
                return Results.NotFound();
            }

            db.UserBooks.Remove(userBook);
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "removed" });
        }).WithTags("Library");

        app.MapPut("/api/books/{id:int}/rate", async (HttpContext http, CrudDbContext db, int id, SetRatingRequest body) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            if (body.Rating is < 1 or > 5)
            {
                return Results.BadRequest(new { message = "rating must be between 1 and 5" });
            }

            var userBook = await db.UserBooks.FirstOrDefaultAsync(x => x.UserId == userId && x.BookId == id);
            if (userBook is null)
            {
                return Results.NotFound();
            }

            userBook.Rating = body.Rating;
            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                userId = userBook.UserId,
                bookId = userBook.BookId,
                status = userBook.Status,
                rating = userBook.Rating
            });
        }).WithTags("Library");

        app.MapGet("/api/users/{id:int}/books", async (CrudDbContext db, int id, LibraryStatus? status, int? page, int? pageSize) =>
        {
            var (p, ps) = EndpointHelpers.NormalizePagination(page, pageSize, defaultPageSize: 20, maxPageSize: 100);

            var q = db.UserBooks
                .Where(ub => ub.UserId == id)
                .Join(db.Books, ub => ub.BookId, b => b.Id, (ub, b) => new { ub, b });

            if (status is not null)
            {
                q = q.Where(x => x.ub.Status == status);
            }

            var items = await q
                .OrderBy(x => x.b.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .Select(x => new UserLibraryItemDto(
                    x.b.Id,
                    x.b.Title,
                    x.b.Author,
                    x.b.Description,
                    x.b.Genre,
                    x.b.CoverUrl,
                    x.ub.Status,
                    x.ub.Rating
                ))
                .ToListAsync();

            return Results.Ok(items);
        }).WithTags("Library");

        return app;
    }
}

