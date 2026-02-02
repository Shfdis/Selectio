using crud.Contracts;
using crud.Data;
using crud.Entities;
using crud.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace crud.Endpoints;

public static class CommentEndpoints
{
    public static IEndpointRouteBuilder MapCommentEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/posts/{id:int}/comments", async (CrudDbContext db, int id, int? page, int? pageSize) =>
        {
            var (p, ps) = EndpointHelpers.NormalizePagination(page, pageSize, defaultPageSize: 50, maxPageSize: 200);

            var exists = await db.Posts.AnyAsync(x => x.Id == id);
            if (!exists) return Results.NotFound();

            var items = await db.PostComments
                .Where(c => c.PostId == id)
                .OrderBy(c => c.CreatedAt)
                .ThenBy(c => c.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .Select(c => new PostCommentDto(c.Id, c.PostId, c.AuthorUserId, c.Content, c.CreatedAt))
                .ToListAsync();

            return Results.Ok(items);
        }).WithTags("Comments");

        app.MapPost("/api/posts/{id:int}/comments", async (HttpContext http, CrudDbContext db, int id, CreateCommentRequest body) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var contentError = EndpointHelpers.RequireContent(body.Content);
            if (contentError is not null) return contentError;

            var exists = await db.Posts.AnyAsync(x => x.Id == id);
            if (!exists) return Results.NotFound();

            var comment = new PostComment
            {
                PostId = id,
                AuthorUserId = userId,
                Content = body.Content!.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            db.PostComments.Add(comment);
            await db.SaveChangesAsync();

            return Results.Ok(new PostCommentDto(comment.Id, comment.PostId, comment.AuthorUserId, comment.Content, comment.CreatedAt));
        }).WithTags("Comments");

        app.MapPut("/api/comments/{id:int}", async (HttpContext http, CrudDbContext db, int id, UpdateCommentRequest body) =>
        {
            var (_, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var contentError = EndpointHelpers.RequireContent(body.Content);
            if (contentError is not null) return contentError;

            var comment = await db.PostComments.FirstOrDefaultAsync(c => c.Id == id);
            if (comment is null) return Results.NotFound();

            comment.Content = body.Content!.Trim();
            await db.SaveChangesAsync();

            return Results.Ok(new PostCommentDto(comment.Id, comment.PostId, comment.AuthorUserId, comment.Content, comment.CreatedAt));
        }).WithTags("Comments");

        app.MapDelete("/api/comments/{id:int}", async (HttpContext http, CrudDbContext db, int id) =>
        {
            var (_, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var comment = await db.PostComments.FirstOrDefaultAsync(c => c.Id == id);
            if (comment is null) return Results.NotFound();

            db.PostComments.Remove(comment);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "deleted" });
        }).WithTags("Comments");

        app.MapGet("/api/books/{id:int}/comments", async (CrudDbContext db, int id, int? page, int? pageSize) =>
        {
            var (p, ps) = EndpointHelpers.NormalizePagination(page, pageSize, defaultPageSize: 50, maxPageSize: 200);

            var exists = await db.Books.AnyAsync(x => x.Id == id);
            if (!exists) return Results.NotFound();

            var items = await db.BookComments
                .Where(c => c.BookId == id)
                .OrderBy(c => c.CreatedAt)
                .ThenBy(c => c.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .Select(c => new BookCommentDto(c.Id, c.BookId, c.AuthorUserId, c.Content, c.Rating, c.CreatedAt))
                .ToListAsync();

            return Results.Ok(items);
        }).WithTags("Comments");

        app.MapPost("/api/books/{id:int}/comments", async (HttpContext http, CrudDbContext db, int id, CreateBookCommentRequest body) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var contentError = EndpointHelpers.RequireContent(body.Content);
            if (contentError is not null) return contentError;

            if (body.Rating is < 1 or > 5)
            {
                return Results.BadRequest(new { message = "rating must be between 1 and 5" });
            }

            var exists = await db.Books.AnyAsync(x => x.Id == id);
            if (!exists) return Results.NotFound();

            var comment = new BookComment
            {
                BookId = id,
                AuthorUserId = userId,
                Content = body.Content!.Trim(),
                Rating = body.Rating,
                CreatedAt = DateTime.UtcNow
            };

            db.BookComments.Add(comment);
            await db.SaveChangesAsync();

            return Results.Ok(new BookCommentDto(comment.Id, comment.BookId, comment.AuthorUserId, comment.Content, comment.Rating, comment.CreatedAt));
        }).WithTags("Comments");

        app.MapGet("/api/users/me/book-comments", async (HttpContext http, CrudDbContext db, int? page, int? pageSize) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var (p, ps) = EndpointHelpers.NormalizePagination(page, pageSize, defaultPageSize: 50, maxPageSize: 200);

            var items = await db.BookComments
                .Where(c => c.AuthorUserId == userId)
                .OrderBy(c => c.CreatedAt)
                .ThenBy(c => c.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .Select(c => new BookCommentDto(c.Id, c.BookId, c.AuthorUserId, c.Content, c.Rating, c.CreatedAt))
                .ToListAsync();

            return Results.Ok(items);
        }).WithTags("Comments");

        return app;
    }
}

