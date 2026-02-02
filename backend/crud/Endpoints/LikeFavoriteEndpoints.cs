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
        });

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
        });

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
        });

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
        });

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
        }).WithTags("LikesFavorites");

        return app;
    }
}

