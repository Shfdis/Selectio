using Microsoft.AspNetCore.Http;

namespace crud.Infrastructure;

public static class GatewayIdentity
{
    public const string UserIdHeader = "X-User-Id";

    public static int? GetUserId(HttpContext httpContext)
    {
        if (!httpContext.Request.Headers.TryGetValue(UserIdHeader, out var value))
        {
            return null;
        }

        return int.TryParse(value.ToString(), out var userId) ? userId : null;
    }

    public static bool TryGetUserId(HttpContext httpContext, out int userId)
    {
        userId = default;
        var maybe = GetUserId(httpContext);
        if (maybe is null)
        {
            return false;
        }

        userId = maybe.Value;
        return true;
    }
}

