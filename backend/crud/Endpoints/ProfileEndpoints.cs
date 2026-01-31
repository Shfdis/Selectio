using crud.Contracts;
using crud.Data;
using crud.Entities;
using crud.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace crud.Endpoints;

public static class ProfileEndpoints
{
    public static IEndpointRouteBuilder MapProfileEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Profiles");

        group.MapGet("/{id:int}", async (CrudDbContext db, int id) =>
        {
            var profile = await db.UserProfiles
                .Where(p => p.UserId == id)
                .Select(p => new PublicProfileDto(p.UserId, p.Username, p.Description, p.AvatarUrl))
                .FirstOrDefaultAsync();

            return profile is null ? Results.NotFound() : Results.Ok(profile);
        });

        group.MapPut("/profile", async (HttpContext http, CrudDbContext db, UpdateProfileRequest body) =>
        {
            if (!GatewayIdentity.TryGetUserId(http, out var userId))
            {
                return Results.Unauthorized();
            }

            if (string.IsNullOrWhiteSpace(body.Username))
            {
                return Results.BadRequest(new { message = "username is required" });
            }

            var username = body.Username.Trim();
            var description = (body.Description ?? string.Empty).Trim();
            var avatarUrl = (body.AvatarUrl ?? string.Empty).Trim();

            var profile = await db.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile is null)
            {
                profile = new UserProfile
                {
                    UserId = userId,
                    Username = username,
                    Description = description,
                    AvatarUrl = avatarUrl,
                    CreatedAt = DateTime.UtcNow
                };
                db.UserProfiles.Add(profile);
            }
            else
            {
                profile.Username = username;
                profile.Description = description;
                profile.AvatarUrl = avatarUrl;
            }

            await db.SaveChangesAsync();

            return Results.Ok(new PublicProfileDto(profile.UserId, profile.Username, profile.Description, profile.AvatarUrl));
        });

        return app;
    }
}

