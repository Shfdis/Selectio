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
        });

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

            var ownerMember = new CommunityMember
            {
                CommunityId = community.Id,
                UserId = userId,
                Role = CommunityRole.Owner
            };
            db.CommunityMembers.Add(ownerMember);
            await db.SaveChangesAsync();

            return Results.Ok(new CommunityDto(community.Id, community.Name, community.Description, community.CoverUrl, community.Genre, community.OwnerUserId, 1));
        });

        group.MapGet("/{id:int}", async (CrudDbContext db, int id) =>
        {
            var community = await db.Communities.FirstOrDefaultAsync(c => c.Id == id);
            if (community is null) return Results.NotFound();
            var subscriberCount = await db.CommunityMembers.CountAsync(m => m.CommunityId == id);
            return Results.Ok(new CommunityDto(community.Id, community.Name, community.Description, community.CoverUrl, community.Genre, community.OwnerUserId, subscriberCount));
        });

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
        });

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
        });

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
        }).WithTags("Communities");

        return app;
    }
}

