using crud.Contracts;
using crud.Data;
using crud.Entities;
using crud.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace crud.Endpoints;

public static class LikeFavoriteEndpoints
{
    public static IEndpointRouteBuilder MapLikeFavoriteEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/posts").WithTags("LikesFavorites");

        group.MapPost("/{id:int}/like", async (HttpContext http, CrudDbContext db, int id) =>
        {
            if (!GatewayIdentity.TryGetUserId(http, out var userId))
            {
                return Results.Unauthorized();
            }

            var postExists = await db.Posts.AnyAsync(p => p.Id == id);
            if (!postExists) return Results.NotFound();

            var like = await db.PostLikes.FirstOrDefaultAsync(l => l.PostId == id && l.UserId == userId);
            if (like is null)
            {
                like = new PostLike
                {
                    PostId = id,
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow
                };
                db.PostLikes.Add(like);
                await db.SaveChangesAsync();
            }

            return Results.Ok(new { postId = id, userId, liked = true });
        })
        .WithSummary("Like a post")
        .WithDescription(
            "Idempotent: creates a PostLikes row for (postId, current user) if missing; if already liked, returns liked=true without error. " +
            "Does not change post content or status."
        )
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

        group.MapDelete("/{id:int}/like", async (HttpContext http, CrudDbContext db, int id) =>
        {
            if (!GatewayIdentity.TryGetUserId(http, out var userId))
            {
                return Results.Unauthorized();
            }

            var like = await db.PostLikes.FirstOrDefaultAsync(l => l.PostId == id && l.UserId == userId);
            if (like is not null)
            {
                db.PostLikes.Remove(like);
                await db.SaveChangesAsync();
            }

            return Results.Ok(new { postId = id, userId, liked = false });
        })
        .WithSummary("Unlike a post")
        .WithDescription(
            "Idempotent: removes the user's like for this post if it exists; if not liked, returns liked=false without error."
        )
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

        group.MapPost("/{id:int}/favorite", async (HttpContext http, CrudDbContext db, int id) =>
        {
            if (!GatewayIdentity.TryGetUserId(http, out var userId))
            {
                return Results.Unauthorized();
            }

            var postExists = await db.Posts.AnyAsync(p => p.Id == id);
            if (!postExists) return Results.NotFound();

            var fav = await db.FavoritePosts.FirstOrDefaultAsync(f => f.PostId == id && f.UserId == userId);
            if (fav is null)
            {
                fav = new FavoritePost
                {
                    PostId = id,
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow
                };
                db.FavoritePosts.Add(fav);
                await db.SaveChangesAsync();
            }

            return Results.Ok(new { postId = id, userId, favorited = true });
        })
        .WithSummary("Favorite a post")
        .WithDescription(
            "Idempotent: creates a FavoritePosts row for (postId, current user) if missing; if already favorited, returns favorited=true without error. " +
            "Use GET /api/users/favorites to list favorited posts for the current user."
        )
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

        group.MapDelete("/{id:int}/favorite", async (HttpContext http, CrudDbContext db, int id) =>
        {
            if (!GatewayIdentity.TryGetUserId(http, out var userId))
            {
                return Results.Unauthorized();
            }

            var fav = await db.FavoritePosts.FirstOrDefaultAsync(f => f.PostId == id && f.UserId == userId);
            if (fav is not null)
            {
                db.FavoritePosts.Remove(fav);
                await db.SaveChangesAsync();
            }

            return Results.Ok(new { postId = id, userId, favorited = false });
        })
        .WithSummary("Unfavorite a post")
        .WithDescription(
            "Idempotent: removes the user's favorite for this post if it exists; if not favorited, returns favorited=false without error."
        )
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

        app.MapGet("/api/users/favorites", async (HttpContext http, CrudDbContext db, int? page, int? pageSize) =>
        {
            if (!GatewayIdentity.TryGetUserId(http, out var userId))
            {
                return Results.Unauthorized();
            }

            var p = page.GetValueOrDefault(1);
            var ps = pageSize.GetValueOrDefault(20);
            if (p < 1) p = 1;
            if (ps < 1) ps = 1;
            if (ps > 100) ps = 100;

            var items = await db.FavoritePosts
                .Where(f => f.UserId == userId)
                .Join(db.Posts, f => f.PostId, p0 => p0.Id, (f, post) => new { f, post })
                .OrderByDescending(x => x.f.CreatedAt)
                .ThenByDescending(x => x.post.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .Select(x => new FavoritePostDto(
                    x.post.Id,
                    x.post.CommunityId,
                    x.post.AuthorUserId,
                    x.post.BookId,
                    x.post.Content,
                    x.post.CreatedAt,
                    x.f.CreatedAt
                ))
                .ToListAsync();

            return Results.Ok(items);
        })
        .WithTags("LikesFavorites")
        .WithSummary("List my favorited posts")
        .WithDescription(
            "Returns posts the authenticated user has favorited, newest favorites first, with basic post fields and when it was favorited. " +
            "Pagination: page defaults to 1, pageSize defaults to 20 (max 100)."
        )
        .Produces<List<FavoritePostDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        return app;
    }
}

