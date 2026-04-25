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
                    Status = body?.Status ?? LibraryStatus.WantToRead,
                    AddedAt = DateTime.UtcNow
                };
                db.UserBooks.Add(userBook);
                await db.SaveChangesAsync();
            }

            return Results.Ok(new UserLibraryStateDto(userBook.UserId, userBook.BookId, userBook.Status, userBook.AddedAt));
        })
        .WithTags("Library")
        .WithSummary("Add book to my library")
        .WithDescription(
            "Idempotent: if the user does not yet have this book in UserBooks, inserts a row with status from the body or WantToRead. " +
            "If already present, returns the existing row without changing status."
        )
        .Produces<UserLibraryStateDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

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

            return Results.Ok(new UserLibraryStateDto(userBook.UserId, userBook.BookId, userBook.Status, userBook.AddedAt));
        })
        .WithTags("Library")
        .WithSummary("Update library status for a book")
        .WithDescription("Sets UserBooks.Status for the authenticated user and book id. Returns 404 if the book is not in the user's library.")
        .Produces<UserLibraryStateDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

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

            return Results.Ok(new LibraryRemovedDto("removed"));
        })
        .WithTags("Library")
        .WithSummary("Remove book from my library")
        .WithDescription("Deletes the UserBooks row for the authenticated user and book id. Returns 404 if not in the library.")
        .Produces<LibraryRemovedDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

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
                    x.ub.AddedAt
                ))
                .ToListAsync();

            return Results.Ok(items);
        })
        .WithTags("Library")
        .WithSummary("List books in a user's library")
        .WithDescription(
            "Public: returns books the user has in UserBooks with pagination (page default 1, pageSize default 20, max 100). " +
            "Optional status filter matches UserBooks.Status exactly."
        )
        .Produces<List<UserLibraryItemDto>>(StatusCodes.Status200OK);

        return app;
    }
}

