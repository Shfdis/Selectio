using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace gateway;

public static class GatewayRequestUtils
{
    public static void PrepareRequest(HttpContext http, IReadOnlyCollection<string> headersToStrip)
    {
        AddOrPreserveRequestId(http);
        StripUntrustedHeaders(http, headersToStrip);
    }

    public static void AddOrPreserveRequestId(HttpContext http)
    {
        if (!http.Request.Headers.TryGetValue(GatewayHeaders.RequestId, out var value) || string.IsNullOrWhiteSpace(value.ToString()))
        {
            http.Request.Headers[GatewayHeaders.RequestId] = Guid.NewGuid().ToString("n");
        }
    }

    public static void StripUntrustedHeaders(HttpContext http, IReadOnlyCollection<string> headersToStrip)
    {
        foreach (var header in headersToStrip)
        {
            http.Request.Headers.Remove(header);
        }
    }

    public static IResult Unauthorized(string message) =>
        Results.Json(new { error = new { code = "unauthorized", message } }, statusCode: StatusCodes.Status401Unauthorized);

    public static IResult Forbidden(string message) =>
        Results.Json(new { error = new { code = "forbidden", message } }, statusCode: StatusCodes.Status403Forbidden);

    public static async Task<IResult> RequireUserOr401(HttpContext http)
    {
        var identity = await RequireUser(http);
        return identity is null ? Unauthorized("missing_or_invalid_token") : Results.Ok(identity);
    }

    public static async Task<GatewayIdentity?> RequireUser(HttpContext http)
    {
        var result = await http.AuthenticateAsync(JwtBearerDefaults.AuthenticationScheme);
        if (!result.Succeeded || result.Principal is null)
        {
            return null;
        }

        var principal = result.Principal;
        var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim is null || !int.TryParse(userIdClaim.Value, out var userId))
        {
            return null;
        }

        return new GatewayIdentity(
            UserId: userId,
            Email: principal.FindFirst(ClaimTypes.Email)?.Value,
            Name: principal.FindFirst(ClaimTypes.Name)?.Value
        );
    }

    public static async Task<IResult> CopyHttpResponse(HttpResponseMessage resp)
    {
        var contentType = resp.Content.Headers.ContentType?.ToString() ?? "application/json";
        var body = await resp.Content.ReadAsStringAsync();
        return Results.Text(body, contentType, statusCode: (int)resp.StatusCode);
    }
}

