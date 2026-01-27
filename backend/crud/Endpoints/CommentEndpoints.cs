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
        // Post comments
        app.MapGet("/api/posts/{id:int}/comments", async (CrudDbContext db, int id, int? page, int? pageSize) =>
        {
            var p = page.GetValueOrDefault(1);
            var ps = pageSize.GetValueOrDefault(50);
            if (p < 1) p = 1;
            if (ps < 1) ps = 1;
            if (ps > 200) ps = 200;

            var exists = await db.Posts.AnyAsync(x => x.Id == id);
            if (!exists) return Results.NotFound();

            var items = await db.PostComments
                .Where(c => c.PostId == id)
                .OrderBy(c => c.CreatedAt)
                .ThenBy(c => c.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .Select(c => new PostCommentDto(c.Id, c.PostId, c.AuthorUserId, c.Content, c.ParentCommentId, c.CreatedAt))
                .ToListAsync();

            return Results.Ok(items);
        }).WithTags("Comments");

        app.MapPost("/api/posts/{id:int}/comments", async (HttpContext http, CrudDbContext db, int id, CreateCommentRequest body) =>
        {
            if (!GatewayIdentity.TryGetUserId(http, out var userId))
            {
                return Results.Unauthorized();
            }

            if (string.IsNullOrWhiteSpace(body.Content))
            {
                return Results.BadRequest(new { message = "content is required" });
            }

            var exists = await db.Posts.AnyAsync(x => x.Id == id);
            if (!exists) return Results.NotFound();

            var comment = new PostComment
            {
                PostId = id,
                AuthorUserId = userId,
                Content = body.Content.Trim(),
                ParentCommentId = body.ParentCommentId,
                CreatedAt = DateTime.UtcNow
            };

            db.PostComments.Add(comment);
            await db.SaveChangesAsync();

            return Results.Ok(new PostCommentDto(comment.Id, comment.PostId, comment.AuthorUserId, comment.Content, comment.ParentCommentId, comment.CreatedAt));
        }).WithTags("Comments");

        // Comment edit/delete (post comments only; book comments are immutable for now)
        app.MapPut("/api/comments/{id:int}", async (HttpContext http, CrudDbContext db, int id, UpdateCommentRequest body) =>
        {
            if (!GatewayIdentity.TryGetUserId(http, out var userId))
            {
                return Results.Unauthorized();
            }

            if (string.IsNullOrWhiteSpace(body.Content))
            {
                return Results.BadRequest(new { message = "content is required" });
            }

            var comment = await db.PostComments.FirstOrDefaultAsync(c => c.Id == id);
            if (comment is null) return Results.NotFound();

            if (comment.AuthorUserId != userId)
            {
                return Results.Forbid();
            }

            comment.Content = body.Content.Trim();
            await db.SaveChangesAsync();

            return Results.Ok(new PostCommentDto(comment.Id, comment.PostId, comment.AuthorUserId, comment.Content, comment.ParentCommentId, comment.CreatedAt));
        }).WithTags("Comments");

        app.MapDelete("/api/comments/{id:int}", async (HttpContext http, CrudDbContext db, int id) =>
        {
            if (!GatewayIdentity.TryGetUserId(http, out var userId))
            {
                return Results.Unauthorized();
            }

            var comment = await db.PostComments.FirstOrDefaultAsync(c => c.Id == id);
            if (comment is null) return Results.NotFound();

            if (comment.AuthorUserId != userId)
            {
                return Results.Forbid();
            }

            db.PostComments.Remove(comment);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "deleted" });
        }).WithTags("Comments");

        // Book comments
        app.MapGet("/api/books/{id:int}/comments", async (CrudDbContext db, int id, int? page, int? pageSize) =>
        {
            var p = page.GetValueOrDefault(1);
            var ps = pageSize.GetValueOrDefault(50);
            if (p < 1) p = 1;
            if (ps < 1) ps = 1;
            if (ps > 200) ps = 200;

            var exists = await db.Books.AnyAsync(x => x.Id == id);
            if (!exists) return Results.NotFound();

            var items = await db.BookComments
                .Where(c => c.BookId == id)
                .OrderBy(c => c.CreatedAt)
                .ThenBy(c => c.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .Select(c => new BookCommentDto(c.Id, c.BookId, c.AuthorUserId, c.Content, c.Rating, c.ParentCommentId, c.CreatedAt))
                .ToListAsync();

            return Results.Ok(items);
        }).WithTags("Comments");

        app.MapPost("/api/books/{id:int}/comments", async (HttpContext http, CrudDbContext db, int id, CreateBookCommentRequest body) =>
        {
            if (!GatewayIdentity.TryGetUserId(http, out var userId))
            {
                return Results.Unauthorized();
            }

            if (string.IsNullOrWhiteSpace(body.Content))
            {
                return Results.BadRequest(new { message = "content is required" });
            }

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
                Content = body.Content.Trim(),
                Rating = body.Rating,
                ParentCommentId = body.ParentCommentId,
                CreatedAt = DateTime.UtcNow
            };

            db.BookComments.Add(comment);
            await db.SaveChangesAsync();

            return Results.Ok(new BookCommentDto(comment.Id, comment.BookId, comment.AuthorUserId, comment.Content, comment.Rating, comment.ParentCommentId, comment.CreatedAt));
        }).WithTags("Comments");

        return app;
    }
}

