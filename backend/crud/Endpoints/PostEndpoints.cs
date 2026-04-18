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

public static class PostEndpoints
{
    private const string AllowSuggestedHeader = "X-Allow-Suggested";

    public static IEndpointRouteBuilder MapPostEndpoints(this IEndpointRouteBuilder app)
    {
        var posts = app.MapGroup("/api/posts").WithTags("Posts");

        posts.MapPost("", async (HttpContext http, CrudDbContext db, CreatePostRequest body) =>
            await CreatePostAsync(http, db, body, PostStatus.Published))
            .WithSummary("Create a published post")
            .WithDescription("Creates a new published post in a community for the authenticated user.")
            .Produces<PostDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound);

        posts.MapPost("/suggest", async (HttpContext http, CrudDbContext db, CreatePostRequest body) =>
            await CreatePostAsync(http, db, body, PostStatus.Suggested))
            .WithSummary("Suggest a post for moderation")
            .WithDescription("Creates a suggested post that requires moderator approval before becoming visible.")
            .Produces<PostDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound);

        posts.MapGet("/recommended", async (HttpContext http, CrudDbContext db, int? page, int? pageSize) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;
            var (p, ps) = EndpointHelpers.NormalizePagination(page, pageSize, 20, 100);
            var userEmb = await EmbeddingService.GetUserEmbeddingAsync(db, userId);
            var postsWithEmb = await db.Posts
                .Where(post => post.Status == PostStatus.Published && post.Embedding != null && post.Embedding.Length == EmbeddingService.Dimensions)
                .ToListAsync();
            if (userEmb == null || postsWithEmb.Count == 0)
            {
                return Results.Ok(new List<PostDto>());
            }
            var scored = postsWithEmb
                .Select(post => (Post: post, Score: EmbeddingService.CosineSimilarity(userEmb, post.Embedding!)))
                .OrderByDescending(x => x.Score)
                .ThenByDescending(x => x.Post.CreatedAt)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToList();
            var dtos = scored.Select(x => ToDto(x.Post)).ToList();
            return Results.Ok(dtos);
        })
        .WithSummary("Get recommended posts")
        .WithDescription("Returns personalized post recommendations based on the authenticated user's embedding.")
        .Produces<List<PostDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        posts.MapGet("/{id:int}", async (HttpContext http, CrudDbContext db, int id) =>
        {
            var post = await db.Posts
                .Where(p => p.Id == id)
                .Select(p => new PostDto(p.Id, p.CommunityId, p.AuthorUserId, p.BookId, p.Content, p.PhotoUrl, p.Status, p.CreatedAt))
                .FirstOrDefaultAsync();

            if (post is null)
            {
                return Results.NotFound();
            }

            if (post.Status == PostStatus.Suggested)
            {
                var allowSuggested =
                    http.Request.Headers.TryGetValue(AllowSuggestedHeader, out var value) &&
                    string.Equals(value.ToString(), "true", StringComparison.OrdinalIgnoreCase);

                if (!allowSuggested)
                {
                    return Results.NotFound();
                }
            }

            return Results.Ok(post);
        })
        .WithSummary("Get post by ID")
        .WithDescription("Returns a published post by ID. Suggested posts are hidden unless gateway marks the request as allowed.")
        .Produces<PostDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        posts.MapPut("/{id:int}", async (HttpContext http, CrudDbContext db, int id, UpdatePostRequest body) =>
        {
            var (_, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var contentError = EndpointHelpers.RequireContent(body.Content);
            if (contentError is not null) return contentError;

            var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id);
            if (post is null) return Results.NotFound();

            post.Content = body.Content!.Trim();
            if (body.PhotoUrl != null) post.PhotoUrl = body.PhotoUrl.Trim();
            await db.SaveChangesAsync();
            await EmbeddingService.UpdatePostAndCommunityEmbeddingsAsync(db, post.Id, post.CommunityId, post.BookId, post.Status);
            return Results.Ok(ToDto(post));
        })
        .WithSummary("Update a post")
        .WithDescription("Updates post content and optional photo URL for a post owned by the authenticated user.")
        .Produces<PostDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

        posts.MapDelete("/{id:int}", async (HttpContext http, CrudDbContext db, int id) =>
        {
            var (_, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id);
            if (post is null) return Results.NotFound();

            var communityId = post.CommunityId;
            db.Posts.Remove(post);
            await db.SaveChangesAsync();
            await EmbeddingService.OnPostDeletedAsync(db, communityId);
            return Results.Ok(new { message = "deleted" });
        })
        .WithSummary("Delete a post")
        .WithDescription("Deletes a post owned by the authenticated user.")
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

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
                    post.PhotoUrl,
                    post.Status,
                    post.CreatedAt
                ))
                .ToListAsync();

            return Results.Ok(items);
        })
        .WithTags("Posts")
        .WithSummary("List posts in a community")
        .WithDescription("Returns published posts for a community with pagination.")
        .Produces<List<PostDto>>(StatusCodes.Status200OK);

        app.MapGet("/api/users/me/feed", async (HttpContext http, CrudDbContext db, int? page, int? pageSize) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;
            var (p, ps) = EndpointHelpers.NormalizePagination(page, pageSize, 20, 100);
            var communityIds = await db.CommunityMembers
                .Where(m => m.UserId == userId)
                .Select(m => m.CommunityId)
                .ToListAsync();
            var items = await db.Posts
                .Where(post => post.Status == PostStatus.Published && communityIds.Contains(post.CommunityId))
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
                    post.PhotoUrl,
                    post.Status,
                    post.CreatedAt
                ))
                .ToListAsync();
            return Results.Ok(items);
        })
        .WithTags("Posts")
        .WithSummary("Get personalized community feed")
        .WithDescription("Returns recent published posts from communities that the authenticated user has joined.")
        .Produces<List<PostDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

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
            PhotoUrl = string.IsNullOrWhiteSpace(body.PhotoUrl) ? null : body.PhotoUrl!.Trim(),
            AuthorUserId = userId,
            Status = status,
            CreatedAt = DateTime.UtcNow
        };

        db.Posts.Add(post);
        await db.SaveChangesAsync();
        await EmbeddingService.UpdatePostAndCommunityEmbeddingsAsync(db, post.Id, post.CommunityId, post.BookId, post.Status);

        return Results.Ok(ToDto(post));
    }

    private static PostDto ToDto(Post post) =>
        new(post.Id, post.CommunityId, post.AuthorUserId, post.BookId, post.Content, post.PhotoUrl, post.Status, post.CreatedAt);
}

