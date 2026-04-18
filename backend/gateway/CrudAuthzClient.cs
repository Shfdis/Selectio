using System.Net;

namespace gateway;

public sealed class CrudAuthzClient(IHttpClientFactory clients, IConfiguration configuration)
{
    private readonly IHttpClientFactory _clients = clients;
    private readonly IConfiguration _configuration = configuration;

    private HttpRequestMessage CreateInternalRequest(HttpContext http, string path)
    {
        var internalToken = _configuration["Gateway:InternalToken"] ?? string.Empty;

        var req = new HttpRequestMessage(HttpMethod.Get, path);
        req.Headers.TryAddWithoutValidation(GatewayHeaders.InternalToken, internalToken);
        req.Headers.TryAddWithoutValidation(GatewayHeaders.RequestId, http.Request.Headers[GatewayHeaders.RequestId].ToString());
        return req;
    }

    private async Task<T?> SendRequestAsync<T>(HttpContext http, string path, bool allowNotFound = true) where T : class
    {
        var req = CreateInternalRequest(http, path);
        var crud = _clients.CreateClient("crud-internal");
        var resp = await crud.SendAsync(req, http.RequestAborted);

        if (resp.StatusCode == HttpStatusCode.NotFound && allowNotFound)
        {
            return null;
        }

        if (!resp.IsSuccessStatusCode)
        {
            return null;
        }

        return await resp.Content.ReadFromJsonAsync<T>(cancellationToken: http.RequestAborted);
    }

    public async Task<PostInfo?> FetchPostInfo(HttpContext http, int postId)
    {
        return await SendRequestAsync<PostInfo>(http, $"/internal/posts/{postId}");
    }

    public async Task<PostCommentInfo?> FetchPostCommentInfo(HttpContext http, int commentId)
    {
        return await SendRequestAsync<PostCommentInfo>(http, $"/internal/post-comments/{commentId}");
    }

    public async Task<CommunityOwnerInfo?> FetchCommunityOwnerInfo(HttpContext http, int communityId)
    {
        return await SendRequestAsync<CommunityOwnerInfo>(http, $"/internal/communities/{communityId}");
    }

    public async Task<bool> IsModerator(HttpContext http, int userId, int communityId)
    {
        var req = CreateInternalRequest(http, $"/internal/communities/{communityId}/members/{userId}");
        var crud = _clients.CreateClient("crud-internal");
        var resp = await crud.SendAsync(req, http.RequestAborted);

        if (resp.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Forbidden or HttpStatusCode.Unauthorized ||
            !resp.IsSuccessStatusCode)
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
        if (path.StartsWith("/api/communities/", StringComparison.OrdinalIgnoreCase) &&
            path.EndsWith("/suggestions", StringComparison.OrdinalIgnoreCase))
        {
            var rest = path["/api/communities/".Length..];
            var idText = rest.Split('/', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
            return int.TryParse(idText, out var communityId) ? communityId : null;
        }

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

