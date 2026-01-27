using System.Net;

namespace gateway;

public sealed class CrudAuthzClient(IHttpClientFactory clients, IConfiguration configuration)
{
    private readonly IHttpClientFactory _clients = clients;
    private readonly IConfiguration _configuration = configuration;

    public async Task<PostInfo?> FetchPostInfo(HttpContext http, int postId)
    {
        var crud = _clients.CreateClient("crud-internal");
        var internalToken = _configuration["Gateway:InternalToken"] ?? string.Empty;

        var req = new HttpRequestMessage(HttpMethod.Get, $"/internal/posts/{postId}");
        req.Headers.TryAddWithoutValidation(GatewayHeaders.InternalToken, internalToken);
        req.Headers.TryAddWithoutValidation(GatewayHeaders.RequestId, http.Request.Headers[GatewayHeaders.RequestId].ToString());

        var resp = await crud.SendAsync(req, http.RequestAborted);
        if (resp.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        if (!resp.IsSuccessStatusCode)
        {
            return null;
        }

        return await resp.Content.ReadFromJsonAsync<PostInfo>(cancellationToken: http.RequestAborted);
    }

    public async Task<PostCommentInfo?> FetchPostCommentInfo(HttpContext http, int commentId)
    {
        var crud = _clients.CreateClient("crud-internal");
        var internalToken = _configuration["Gateway:InternalToken"] ?? string.Empty;

        var req = new HttpRequestMessage(HttpMethod.Get, $"/internal/post-comments/{commentId}");
        req.Headers.TryAddWithoutValidation(GatewayHeaders.InternalToken, internalToken);
        req.Headers.TryAddWithoutValidation(GatewayHeaders.RequestId, http.Request.Headers[GatewayHeaders.RequestId].ToString());

        var resp = await crud.SendAsync(req, http.RequestAborted);
        if (resp.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        if (!resp.IsSuccessStatusCode)
        {
            return null;
        }

        return await resp.Content.ReadFromJsonAsync<PostCommentInfo>(cancellationToken: http.RequestAborted);
    }

    public async Task<bool> IsModerator(HttpContext http, int userId, int communityId)
    {
        var crud = _clients.CreateClient("crud-internal");
        var internalToken = _configuration["Gateway:InternalToken"] ?? string.Empty;

        var req = new HttpRequestMessage(HttpMethod.Get, $"/internal/communities/{communityId}/members/{userId}");
        req.Headers.TryAddWithoutValidation(GatewayHeaders.InternalToken, internalToken);
        req.Headers.TryAddWithoutValidation(GatewayHeaders.RequestId, http.Request.Headers[GatewayHeaders.RequestId].ToString());

        var resp = await crud.SendAsync(req, http.RequestAborted);
        if (resp.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Forbidden or HttpStatusCode.Unauthorized)
        {
            return false;
        }

        if (!resp.IsSuccessStatusCode)
        {
            return false;
        }

        var data = await resp.Content.ReadFromJsonAsync<MemberRoleInfo>(cancellationToken: http.RequestAborted);
        if (data is null) return false;

        return string.Equals(data.Role, "Moderator", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(data.Role, "Owner", StringComparison.OrdinalIgnoreCase);
    }

    public async Task<int?> ResolveCommunityIdForModeratorRequirement(HttpContext http, string path)
    {
        // /api/communities/{id}/suggestions
        if (path.StartsWith("/api/communities/", StringComparison.OrdinalIgnoreCase) &&
            path.EndsWith("/suggestions", StringComparison.OrdinalIgnoreCase))
        {
            var rest = path["/api/communities/".Length..];
            var idText = rest.Split('/', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
            return int.TryParse(idText, out var communityId) ? communityId : null;
        }

        // /api/posts/{id}/approve or /reject
        if (path.StartsWith("/api/posts/", StringComparison.OrdinalIgnoreCase) &&
            (path.EndsWith("/approve", StringComparison.OrdinalIgnoreCase) || path.EndsWith("/reject", StringComparison.OrdinalIgnoreCase)))
        {
            var rest = path["/api/posts/".Length..];
            var idText = rest.Split('/', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
            if (!int.TryParse(idText, out var postId)) return null;

            var info = await FetchPostInfo(http, postId);
            return info?.CommunityId;
        }

        return null;
    }
}

