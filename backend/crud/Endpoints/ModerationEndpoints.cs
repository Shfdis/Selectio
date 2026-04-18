using crud.Contracts;
using crud.Data;
using crud.Entities;
using crud.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace crud.Endpoints;

public static class ModerationEndpoints
{
    public static IEndpointRouteBuilder MapModerationEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/communities/{id:int}/suggestions", async (CrudDbContext db, int id, int? page, int? pageSize) =>
        {
            var p = page.GetValueOrDefault(1);
            var ps = pageSize.GetValueOrDefault(20);
            if (p < 1) p = 1;
            if (ps < 1) ps = 1;
            if (ps > 100) ps = 100;

            var exists = await db.Communities.AnyAsync(c => c.Id == id);
            if (!exists) return Results.NotFound();

            var items = await db.Posts
                .Where(post => post.CommunityId == id && post.Status == PostStatus.Suggested)
                .OrderByDescending(post => post.CreatedAt)
                .ThenByDescending(post => post.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .Select(post => new
                {
                    post.Id,
                    post.CommunityId,
                    post.AuthorUserId,
                    post.BookId,
                    post.Content,
                    post.Status,
                    post.CreatedAt
                })
                .ToListAsync();

            return Results.Ok(items);
        }).WithTags("Moderation");

        app.MapPost("/api/posts/{id:int}/approve", async (CrudDbContext db, int id) =>
        {
            var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id);
            if (post is null) return Results.NotFound();

            if (post.Status != PostStatus.Suggested)
            {
                return Results.Conflict(new { message = "post is not suggested" });
            }

            post.Status = PostStatus.Published;
            await db.SaveChangesAsync();
            await EmbeddingService.UpdatePostAndCommunityEmbeddingsAsync(db, post.Id, post.CommunityId, post.BookId, post.Status);

            return Results.Ok(new ModerationDecisionResponse(post.Id, post.Status.ToString()));
        }).WithTags("Moderation");

        app.MapPost("/api/posts/{id:int}/reject", async (CrudDbContext db, int id) =>
        {
            var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id);
            if (post is null) return Results.NotFound();

            if (post.Status != PostStatus.Suggested)
            {
                return Results.Conflict(new { message = "post is not suggested" });
            }

            var communityId = post.CommunityId;
            db.Posts.Remove(post);
            await db.SaveChangesAsync();
            await EmbeddingService.OnPostDeletedAsync(db, communityId);

            return Results.Ok(new { postId = id, status = "Rejected" });
        }).WithTags("Moderation");

        return app;
    }
}

