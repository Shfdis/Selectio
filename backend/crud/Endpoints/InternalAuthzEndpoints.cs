using crud.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace crud.Endpoints;

public static class InternalAuthzEndpoints
{
    private const string InternalTokenHeader = "X-Gateway-Internal-Token";

    public static IEndpointRouteBuilder MapInternalAuthzEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/internal").WithTags("Internal");
        group.AddEndpointFilter<InternalTokenFilter>();

        group.MapGet("/posts/{id:int}", async (CrudDbContext db, int id) =>
        {
            var post = await db.Posts
                .Where(p => p.Id == id)
                .Select(p => new
                {
                    id = p.Id,
                    communityId = p.CommunityId,
                    authorUserId = p.AuthorUserId,
                    status = p.Status.ToString()
                })
                .FirstOrDefaultAsync();

            return post is null ? Results.NotFound() : Results.Ok(post);
        });

        group.MapGet("/post-comments/{id:int}", async (CrudDbContext db, int id) =>
        {
            var comment = await db.PostComments
                .Where(c => c.Id == id)
                .Select(c => new
                {
                    id = c.Id,
                    postId = c.PostId,
                    authorUserId = c.AuthorUserId
                })
                .FirstOrDefaultAsync();

            return comment is null ? Results.NotFound() : Results.Ok(comment);
        });

        group.MapGet("/communities/{communityId:int}/members/{userId:int}", async (CrudDbContext db, int communityId, int userId) =>
        {
            var member = await db.CommunityMembers
                .Where(m => m.CommunityId == communityId && m.UserId == userId)
                .Select(m => new
                {
                    communityId = m.CommunityId,
                    userId = m.UserId,
                    role = m.Role.ToString()
                })
                .FirstOrDefaultAsync();

            return member is null ? Results.NotFound() : Results.Ok(member);
        });

        return app;
    }

    private sealed class InternalTokenFilter(IConfiguration configuration) : IEndpointFilter
    {
        private readonly IConfiguration _configuration = configuration;

        public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
        {
            var expected = _configuration["Gateway:InternalToken"] ?? string.Empty;
            if (string.IsNullOrWhiteSpace(expected))
            {
                return Results.Unauthorized();
            }

            if (!context.HttpContext.Request.Headers.TryGetValue(InternalTokenHeader, out var provided) ||
                !string.Equals(provided.ToString(), expected, StringComparison.Ordinal))
            {
                return Results.Unauthorized();
            }

            return await next(context);
        }
    }
}

