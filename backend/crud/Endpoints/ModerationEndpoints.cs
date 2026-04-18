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
        })
        .WithTags("Moderation")
        .WithSummary("List suggested posts for a community")
        .WithDescription(
            "Returns posts in Suggested status for the given community id, newest first. " +
            "Public at the CRUD layer; when called through the API gateway, only community moderators can access this path."
        )
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

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
        })
        .WithTags("Moderation")
        .WithSummary("Approve a suggested post")
        .WithDescription(
            "Only valid when the post status is Suggested; sets status to Published and refreshes embeddings for the post/community/book graph. " +
            "Returns 409 if the post exists but is not in Suggested status. " +
            "When called through the API gateway, only community moderators can access this path."
        )
        .Produces<ModerationDecisionResponse>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status409Conflict);

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
        })
        .WithTags("Moderation")
        .WithSummary("Reject a suggested post")
        .WithDescription(
            "Only valid when the post status is Suggested; deletes the post and runs the same embedding cleanup as a normal delete. " +
            "Returns 409 if the post exists but is not in Suggested status. " +
            "When called through the API gateway, only community moderators can access this path."
        )
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status409Conflict);

        return app;
    }
}

