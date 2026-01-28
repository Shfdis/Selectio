using crud.Contracts;
using crud.Data;
using crud.Entities;
using crud.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace crud.Endpoints;

public static class PostEndpoints
{
    private const string AllowSuggestedHeader = "X-Allow-Suggested";

    public static IEndpointRouteBuilder MapPostEndpoints(this IEndpointRouteBuilder app)
    {
        var posts = app.MapGroup("/api/posts").WithTags("Posts");

        posts.MapPost("", async (HttpContext http, CrudDbContext db, CreatePostRequest body) =>
        {
            if (!GatewayIdentity.TryGetUserId(http, out var userId))
            {
                return Results.Unauthorized();
            }

            if (string.IsNullOrWhiteSpace(body.Content))
            {
                return Results.BadRequest(new { message = "content is required" });
            }

            var communityExists = await db.Communities.AnyAsync(c => c.Id == body.CommunityId);
            if (!communityExists) return Results.NotFound(new { message = "community not found" });

            var bookExists = await db.Books.AnyAsync(b => b.Id == body.BookId);
            if (!bookExists) return Results.NotFound(new { message = "book not found" });

            var post = new Post
            {
                CommunityId = body.CommunityId,
                BookId = body.BookId,
                Content = body.Content.Trim(),
                AuthorUserId = userId,
                Status = PostStatus.Published,
                CreatedAt = DateTime.UtcNow
            };

            db.Posts.Add(post);
            await db.SaveChangesAsync();

            return Results.Ok(ToDto(post));
        });

        posts.MapPost("/suggest", async (HttpContext http, CrudDbContext db, CreatePostRequest body) =>
        {
            if (!GatewayIdentity.TryGetUserId(http, out var userId))
            {
                return Results.Unauthorized();
            }

            if (string.IsNullOrWhiteSpace(body.Content))
            {
                return Results.BadRequest(new { message = "content is required" });
            }

            var communityExists = await db.Communities.AnyAsync(c => c.Id == body.CommunityId);
            if (!communityExists) return Results.NotFound(new { message = "community not found" });

            var bookExists = await db.Books.AnyAsync(b => b.Id == body.BookId);
            if (!bookExists) return Results.NotFound(new { message = "book not found" });

            var post = new Post
            {
                CommunityId = body.CommunityId,
                BookId = body.BookId,
                Content = body.Content.Trim(),
                AuthorUserId = userId,
                Status = PostStatus.Suggested,
                CreatedAt = DateTime.UtcNow
            };

            db.Posts.Add(post);
            await db.SaveChangesAsync();

            return Results.Ok(ToDto(post));
        });

        posts.MapGet("/{id:int}", async (HttpContext http, CrudDbContext db, int id) =>
        {
            var post = await db.Posts
                .Where(p => p.Id == id)
                .Select(p => new PostDto(p.Id, p.CommunityId, p.AuthorUserId, p.BookId, p.Content, p.Status, p.CreatedAt))
                .FirstOrDefaultAsync();

            if (post is null)
            {
                return Results.NotFound();
            }

            // Suggested posts should only be visible when the gateway explicitly allows it
            if (post.Status == PostStatus.Suggested)
            {
                var allowSuggested =
                    http.Request.Headers.TryGetValue(AllowSuggestedHeader, out var value) &&
                    string.Equals(value.ToString(), "true", StringComparison.OrdinalIgnoreCase);

                if (!allowSuggested)
                {
                    // Hide existence unless explicitly allowed.
                    return Results.NotFound();
                }
            }

            return Results.Ok(post);
        });

        posts.MapPut("/{id:int}", async (HttpContext http, CrudDbContext db, int id, UpdatePostRequest body) =>
        {
            if (!GatewayIdentity.TryGetUserId(http, out _))
            {
                return Results.Unauthorized();
            }

            if (string.IsNullOrWhiteSpace(body.Content))
            {
                return Results.BadRequest(new { message = "content is required" });
            }

            var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id);
            if (post is null) return Results.NotFound();

            post.Content = body.Content.Trim();
            await db.SaveChangesAsync();
            return Results.Ok(ToDto(post));
        });

        posts.MapDelete("/{id:int}", async (HttpContext http, CrudDbContext db, int id) =>
        {
            if (!GatewayIdentity.TryGetUserId(http, out _))
            {
                return Results.Unauthorized();
            }

            var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id);
            if (post is null) return Results.NotFound();

            db.Posts.Remove(post);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "deleted" });
        });

        app.MapGet("/api/communities/{id:int}/posts", async (CrudDbContext db, int id, int? page, int? pageSize) =>
        {
            var p = page.GetValueOrDefault(1);
            var ps = pageSize.GetValueOrDefault(20);
            if (p < 1) p = 1;
            if (ps < 1) ps = 1;
            if (ps > 100) ps = 100;

            var items = await db.Posts
                .Where(post => post.CommunityId == id && post.Status == PostStatus.Published)
                .OrderByDescending(post => post.CreatedAt)
                .ThenByDescending(post => post.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .Select(post => new PostDto(
                    post.Id,
                    post.CommunityId,
                    post.AuthorUserId,
                    post.BookId,
                    post.Content,
                    post.Status,
                    post.CreatedAt
                ))
                .ToListAsync();

            return Results.Ok(items);
        }).WithTags("Posts");

        return app;
    }

    private static PostDto ToDto(Post post) =>
        new(post.Id, post.CommunityId, post.AuthorUserId, post.BookId, post.Content, post.Status, post.CreatedAt);
}

