using Microsoft.AspNetCore.Http;

namespace crud.Infrastructure;

public static class EndpointHelpers
{
    public static (int userId, IResult? error) RequireUserId(HttpContext http)
    {
        if (!GatewayIdentity.TryGetUserId(http, out var userId))
        {
            return (default, Results.Unauthorized());
        }
        return (userId, null);
    }

    public static (int page, int pageSize) NormalizePagination(int? page, int? pageSize, int defaultPageSize, int maxPageSize)
    {
        var p = page.GetValueOrDefault(1);
        var ps = pageSize.GetValueOrDefault(defaultPageSize);
        if (p < 1) p = 1;
        if (ps < 1) ps = 1;
        if (ps > maxPageSize) ps = maxPageSize;
        return (p, ps);
    }

    public static IResult? RequireContent(string? content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return Results.BadRequest(new { message = "content is required" });
        }
        return null;
    }
}
