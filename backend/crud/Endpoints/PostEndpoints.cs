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
            await CreatePostAsync(http, db, body, PostStatus.Published));

        posts.MapPost("/suggest", async (HttpContext http, CrudDbContext db, CreatePostRequest body) =>
            await CreatePostAsync(http, db, body, PostStatus.Suggested));

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
            var (_, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var contentError = EndpointHelpers.RequireContent(body.Content);
            if (contentError is not null) return contentError;

            var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id);
            if (post is null) return Results.NotFound();

            post.Content = body.Content!.Trim();
            await db.SaveChangesAsync();
            return Results.Ok(ToDto(post));
        });

        posts.MapDelete("/{id:int}", async (HttpContext http, CrudDbContext db, int id) =>
        {
            var (_, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id);
            if (post is null) return Results.NotFound();

            db.Posts.Remove(post);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "deleted" });
        });

        app.MapGet("/api/communities/{id:int}/posts", async (CrudDbContext db, int id, int? page, int? pageSize) =>
        {
            var (p, ps) = EndpointHelpers.NormalizePagination(page, pageSize, defaultPageSize: 20, maxPageSize: 100);

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

    private static async Task<IResult> CreatePostAsync(HttpContext http, CrudDbContext db, CreatePostRequest body, PostStatus status)
    {
        var (userId, error) = EndpointHelpers.RequireUserId(http);
        if (error is not null) return error;

        var contentError = EndpointHelpers.RequireContent(body.Content);
        if (contentError is not null) return contentError;

        var communityExists = await db.Communities.AnyAsync(c => c.Id == body.CommunityId);
        if (!communityExists) return Results.NotFound(new { message = "community not found" });

        var bookExists = await db.Books.AnyAsync(b => b.Id == body.BookId);
        if (!bookExists) return Results.NotFound(new { message = "book not found" });

        var post = new Post
        {
            CommunityId = body.CommunityId,
            BookId = body.BookId,
            Content = body.Content!.Trim(),
            AuthorUserId = userId,
            Status = status,
            CreatedAt = DateTime.UtcNow
        };

        db.Posts.Add(post);
        await db.SaveChangesAsync();

        return Results.Ok(ToDto(post));
    }

    private static PostDto ToDto(Post post) =>
        new(post.Id, post.CommunityId, post.AuthorUserId, post.BookId, post.Content, post.Status, post.CreatedAt);
}

