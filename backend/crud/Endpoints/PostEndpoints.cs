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

        posts.MapGet("/recommended", async (HttpContext http, CrudDbContext db, NpgsqlDataSource dataSource, int? page, int? pageSize, CancellationToken cancellationToken) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;
            var (p, ps) = EndpointHelpers.NormalizePagination(page, pageSize, 20, 100);
            var userEmb = await EmbeddingService.GetUserEmbeddingAsync(db, userId, cancellationToken);
            if (userEmb is null)
            {
                return Results.Ok(new List<PostFeedItemDto>());
            }

            var ids = await EmbeddingAnnSearch.GetRecommendedPostIdsAsync(
                dataSource,
                userEmb,
                (p - 1) * ps,
                ps,
                cancellationToken);
            if (ids.Count == 0)
            {
                return Results.Ok(new List<PostFeedItemDto>());
            }

            var posts = await db.Posts
                .AsNoTracking()
                .Include(x => x.Book)
                .Where(post => ids.Contains(post.Id))
                .ToListAsync(cancellationToken);
            var ordered = ids.Select(id => posts.First(po => po.Id == id)).ToList();
            var dtos = await PostFeedMapper.ToFeedItemsAsync(db, ordered, userId, cancellationToken);
            return Results.Ok(dtos);
        })
        .WithSummary("Get recommended posts")
        .WithDescription(
            "Returns personalized published posts ranked by pgvector cosine distance (HNSW index) against the user's library-derived embedding. " +
            "Includes author username, nested book summary, like/comment counts, and whether the current user liked or favorited the post."
        )
        .Produces<List<PostFeedItemDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        posts.MapGet("/{id:int}", async (HttpContext http, CrudDbContext db, int id, CancellationToken cancellationToken) =>
        {
            var post = await db.Posts
                .AsNoTracking()
                .Include(x => x.Book)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

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

            var viewerId = GatewayIdentity.GetUserId(http);
            var dto = (await PostFeedMapper.ToFeedItemsAsync(db, new List<Post> { post }, viewerId, cancellationToken)).Single();
            return Results.Ok(dto);
        })
        .WithSummary("Get post by ID")
        .WithDescription(
            "Returns one post as a feed-shaped payload (author username, book summary, counts, liked/favorited for the current user when X-User-Id is present). " +
            "Suggested posts are hidden unless the X-Allow-Suggested header is true."
        )
        .Produces<PostFeedItemDto>(StatusCodes.Status200OK)
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

        app.MapGet("/api/communities/{id:int}/posts", async (HttpContext http, CrudDbContext db, int id, int? page, int? pageSize, CancellationToken cancellationToken) =>
        {
            var (p, ps) = EndpointHelpers.NormalizePagination(page, pageSize, defaultPageSize: 20, maxPageSize: 100);

            var items = await db.Posts
                .AsNoTracking()
                .Include(x => x.Book)
                .Where(post => post.CommunityId == id && post.Status == PostStatus.Published)
                .OrderByDescending(post => post.CreatedAt)
                .ThenByDescending(post => post.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync(cancellationToken);

            var viewerId = GatewayIdentity.GetUserId(http);
            var dtos = await PostFeedMapper.ToFeedItemsAsync(db, items, viewerId, cancellationToken);
            return Results.Ok(dtos);
        })
        .WithTags("Posts")
        .WithSummary("List posts in a community")
        .WithDescription(
            "Returns published posts for a community (newest first) with feed-shaped payloads. " +
            "When the request includes X-User-Id, likedByCurrentUser and favoritedByCurrentUser reflect that user."
        )
        .Produces<List<PostFeedItemDto>>(StatusCodes.Status200OK);

        app.MapGet("/api/users/me/feed", async (HttpContext http, CrudDbContext db, int? page, int? pageSize, CancellationToken cancellationToken) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;
            var (p, ps) = EndpointHelpers.NormalizePagination(page, pageSize, 20, 100);
            var communityIds = await db.CommunityMembers
                .Where(m => m.UserId == userId)
                .Select(m => m.CommunityId)
                .ToListAsync(cancellationToken);
            var allPosts = await db.Posts
                .AsNoTracking()
                .Include(x => x.Book)
                .Where(post => post.Status == PostStatus.Published && communityIds.Contains(post.CommunityId))
                .ToListAsync(cancellationToken);

            var userEmb = await EmbeddingService.GetUserEmbeddingAsync(db, userId);
            var slice = OrderPersonalizedFeed(allPosts, userEmb, p, ps);
            var dtos = await PostFeedMapper.ToFeedItemsAsync(db, slice, userId, cancellationToken);
            return Results.Ok(dtos);
        })
        .WithTags("Posts")
        .WithSummary("Get personalized community feed")
        .WithDescription(
            "Returns published posts from communities the user has joined. " +
            "When a user embedding exists (from books in their library), posts with embeddings are ranked by cosine similarity (higher first), " +
            "then by recency; posts without embeddings follow, ordered by recency. " +
            "Without a user embedding, ordering is purely by CreatedAt (newest first)."
        )
        .Produces<List<PostFeedItemDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        return app;
    }

    /// <summary>
    /// Rank posts for the home feed: cosine on embeddings when user embedding exists; append posts missing embeddings by recency.
    /// </summary>
    private static List<Post> OrderPersonalizedFeed(IReadOnlyList<Post> allPosts, float[]? userEmb, int page, int pageSize)
    {
        if (allPosts.Count == 0)
        {
            return new List<Post>();
        }

        if (userEmb is null)
        {
            return allPosts
                .OrderByDescending(p => p.CreatedAt)
                .ThenByDescending(p => p.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();
        }

        var withEmb = allPosts.Where(p => EmbeddingService.IsFullEmbedding(p.Embedding)).ToList();
        var withoutEmb = allPosts
            .Where(p => !EmbeddingService.IsFullEmbedding(p.Embedding))
            .OrderByDescending(p => p.CreatedAt)
            .ThenByDescending(p => p.Id)
            .ToList();

        var ranked = withEmb
            .Select(p => (Post: p, Score: EmbeddingService.CosineSimilarity(userEmb, p.Embedding!)))
            .OrderByDescending(x => x.Score)
            .ThenByDescending(x => x.Post.CreatedAt)
            .ThenByDescending(x => x.Post.Id)
            .Select(x => x.Post)
            .ToList();

        var merged = ranked.Concat(withoutEmb).ToList();
        return merged.Skip((page - 1) * pageSize).Take(pageSize).ToList();
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

