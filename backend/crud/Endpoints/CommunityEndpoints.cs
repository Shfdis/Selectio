using crud.Contracts;
using crud.Data;
using crud.Entities;
using crud.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace crud.Endpoints;

public static class CommunityEndpoints
{
    public static IEndpointRouteBuilder MapCommunityEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/communities").WithTags("Communities");

        group.MapGet("", async (CrudDbContext db, string? query, string? genre, int? page, int? pageSize) =>
        {
            var p = page.GetValueOrDefault(1);
            var ps = pageSize.GetValueOrDefault(20);
            if (p < 1) p = 1;
            if (ps < 1) ps = 1;
            if (ps > 100) ps = 100;

            var q = db.Communities.AsQueryable();
            if (!string.IsNullOrWhiteSpace(query))
            {
                var pattern = $"%{query.Trim()}%";
                q = q.Where(c => EF.Functions.ILike(c.Name, pattern));
            }
            if (!string.IsNullOrWhiteSpace(genre))
            {
                var g = genre.Trim();
                q = q.Where(c => EF.Functions.ILike(c.Genre, $"%{g}%"));
            }

            var list = await q.OrderBy(c => c.Id).Skip((p - 1) * ps).Take(ps).ToListAsync();
            var items = new List<CommunityDto>();
            foreach (var c in list)
            {
                var count = await db.CommunityMembers.CountAsync(m => m.CommunityId == c.Id);
                items.Add(new CommunityDto(c.Id, c.Name, c.Description, c.CoverUrl, c.Genre, c.OwnerUserId, count));
            }
            return Results.Ok(items);
        })
        .WithSummary("List communities")
        .WithDescription(
            "Public list ordered by community id. " +
            "Optional query: case-insensitive substring match on community name (ILIKE). " +
            "Optional genre: case-insensitive substring match on the community genre field. " +
            "Pagination: page defaults to 1, pageSize defaults to 20 (max 100). " +
            "Each item includes subscriberCount (CommunityMembers rows for that community)."
        )
        .Produces<List<CommunityDto>>(StatusCodes.Status200OK);

        group.MapPost("", async (HttpContext http, CrudDbContext db, CreateCommunityRequest body) =>
        {
            if (!GatewayIdentity.TryGetUserId(http, out var userId))
            {
                return Results.Unauthorized();
            }

            if (string.IsNullOrWhiteSpace(body.Name))
            {
                return Results.BadRequest(new { message = "name is required" });
            }

            var name = body.Name.Trim();
            var description = (body.Description ?? string.Empty).Trim();

            var nameTaken = await db.Communities.AnyAsync(c => c.Name == name);
            if (nameTaken)
            {
                return Results.BadRequest(new { message = "community name already exists" });
            }

            var coverUrl = (body.CoverUrl ?? string.Empty).Trim();
            var genre = (body.Genre ?? string.Empty).Trim();
            var community = new Community
            {
                Name = name,
                Description = description,
                CoverUrl = coverUrl,
                Genre = genre,
                OwnerUserId = userId
            };

            db.Communities.Add(community);
            await db.SaveChangesAsync();

            return Results.Ok(new CommunityDto(community.Id, community.Name, community.Description, community.CoverUrl, community.Genre, community.OwnerUserId, 0));
        })
        .WithSummary("Create community")
        .WithDescription(
            "Creates a community owned by the authenticated user. " +
            "Name is required and must be unique (trimmed, exact match). " +
            "Description, coverUrl, and genre are optional strings (trimmed; empty strings allowed)."
        )
        .Produces<CommunityDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/{id:int}", async (CrudDbContext db, int id) =>
        {
            var community = await db.Communities.FirstOrDefaultAsync(c => c.Id == id);
            if (community is null) return Results.NotFound();
            var subscriberCount = await db.CommunityMembers.CountAsync(m => m.CommunityId == id);
            return Results.Ok(new CommunityDto(community.Id, community.Name, community.Description, community.CoverUrl, community.Genre, community.OwnerUserId, subscriberCount));
        })
        .WithSummary("Get community by ID")
        .WithDescription(
            "Returns one community by id with subscriberCount computed from CommunityMembers. " +
            "Does not include whether the current user is a member; use join or list user communities for that."
        )
        .Produces<CommunityDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        group.MapPut("/{id:int}", async (HttpContext http, CrudDbContext db, int id, UpdateCommunityRequest body) =>
        {
            if (!GatewayIdentity.TryGetUserId(http, out var userId))
            {
                return Results.Unauthorized();
            }

            var community = await db.Communities.FirstOrDefaultAsync(c => c.Id == id);
            if (community is null)
            {
                return Results.NotFound();
            }

            if (community.OwnerUserId != userId)
            {
                // Avoid Results.Forbid() here: it expects IAuthenticationService and throws without auth middleware.
                return Results.StatusCode(StatusCodes.Status403Forbidden);
            }

            if (body.Name is not null)
            {
                var name = body.Name.Trim();
                if (string.IsNullOrWhiteSpace(name))
                {
                    return Results.BadRequest(new { message = "name cannot be empty" });
                }

                var taken = await db.Communities.AnyAsync(c => c.Name == name && c.Id != id);
                if (taken)
                {
                    return Results.BadRequest(new { message = "community name already exists" });
                }

                community.Name = name;
            }

            if (body.Description is not null)
            {
                community.Description = body.Description.Trim();
            }

            if (body.CoverUrl is not null)
            {
                community.CoverUrl = body.CoverUrl.Trim();
            }

            if (body.Genre is not null)
            {
                community.Genre = body.Genre.Trim();
            }

            await db.SaveChangesAsync();
            var subscriberCount = await db.CommunityMembers.CountAsync(m => m.CommunityId == id);
            return Results.Ok(new CommunityDto(community.Id, community.Name, community.Description, community.CoverUrl, community.Genre, community.OwnerUserId, subscriberCount));
        })
        .WithSummary("Update community (owner only)")
        .WithDescription(
            "Owner-only: updates name, description, coverUrl, and/or genre. Null fields are left unchanged. " +
            "Name must remain unique among communities (excluding this id)."
        )
        .Produces<CommunityDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status403Forbidden)
        .Produces(StatusCodes.Status404NotFound);

        group.MapDelete("/{id:int}", async (HttpContext http, CrudDbContext db, int id) =>
        {
            if (!GatewayIdentity.TryGetUserId(http, out var userId))
            {
                return Results.Unauthorized();
            }

            var community = await db.Communities.FirstOrDefaultAsync(c => c.Id == id);
            if (community is null)
            {
                return Results.NotFound();
            }

            if (community.OwnerUserId != userId)
            {
                return Results.StatusCode(StatusCodes.Status403Forbidden);
            }

            db.Communities.Remove(community);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "deleted" });
        })
        .WithSummary("Delete community (owner only)")
        .WithDescription(
            "Owner-only hard delete of a community. " +
            "Deletes the community row and dependent data via configured cascading foreign keys."
        )
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status403Forbidden)
        .Produces(StatusCodes.Status404NotFound);

        group.MapPost("/{id:int}/join", async (HttpContext http, CrudDbContext db, int id) =>
        {
            if (!GatewayIdentity.TryGetUserId(http, out var userId))
            {
                return Results.Unauthorized();
            }

            var exists = await db.Communities.AnyAsync(c => c.Id == id);
            if (!exists)
            {
                return Results.NotFound();
            }
            var isOwner = await db.Communities.AnyAsync(c => c.Id == id && c.OwnerUserId == userId);
            if (isOwner)
            {
                return Results.BadRequest(new { message = "owner cannot join own community" });
            }

            var member = await db.CommunityMembers.FirstOrDefaultAsync(m => m.CommunityId == id && m.UserId == userId);
            if (member is null)
            {
                member = new CommunityMember
                {
                    CommunityId = id,
                    UserId = userId,
                    Role = CommunityRole.Member
                };
                db.CommunityMembers.Add(member);
                await db.SaveChangesAsync();
            }

            return Results.Ok(new CommunityMemberDto(member.CommunityId, member.UserId, member.Role));
        })
        .WithSummary("Join a community")
        .WithDescription(
            "Idempotent subscribe: if the user is not a member yet, creates a row with role Member. " +
            "If already a member, returns the existing membership without error. " +
            "Owners cannot join their own community."
        )
        .Produces<CommunityMemberDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

        group.MapPost("/{id:int}/leave", async (HttpContext http, CrudDbContext db, int id) =>
        {
            if (!GatewayIdentity.TryGetUserId(http, out var userId))
            {
                return Results.Unauthorized();
            }

            var member = await db.CommunityMembers.FirstOrDefaultAsync(m => m.CommunityId == id && m.UserId == userId);
            if (member is null)
            {
                return Results.NotFound();
            }

            db.CommunityMembers.Remove(member);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "left" });
        })
        .WithSummary("Leave a community")
        .WithDescription(
            "Removes the authenticated user's CommunityMembers row for this community. " +
            "Returns 404 if they were not a member."
        )
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

        app.MapGet("/api/users/{id:int}/communities", async (CrudDbContext db, int id, int? page, int? pageSize) =>
        {
            var p = page.GetValueOrDefault(1);
            var ps = pageSize.GetValueOrDefault(20);
            if (p < 1) p = 1;
            if (ps < 1) ps = 1;
            if (ps > 100) ps = 100;

            var joined = await db.CommunityMembers
                .Where(m => m.UserId == id)
                .Join(db.Communities, m => m.CommunityId, c => c.Id, (m, c) => new { m, c })
                .OrderBy(x => x.c.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();
            var items = new List<CommunityDto>();
            foreach (var x in joined)
            {
                var count = await db.CommunityMembers.CountAsync(m => m.CommunityId == x.c.Id);
                items.Add(new CommunityDto(x.c.Id, x.c.Name, x.c.Description, x.c.CoverUrl, x.c.Genre, x.c.OwnerUserId, count));
            }
            return Results.Ok(items);
        })
        .WithTags("Communities")
        .WithSummary("List user communities")
        .WithDescription(
            "Public: returns communities the given user id has joined, ordered by community id. " +
            "Pagination: page defaults to 1, pageSize defaults to 20 (max 100). " +
            "Each item includes subscriberCount for that community."
        )
        .Produces<List<CommunityDto>>(StatusCodes.Status200OK);

        return app;
    }
}

