using Yarp.ReverseProxy.Forwarder;

namespace gateway;

public static class CrudServiceGateway
{
    public static void Map(WebApplication app, IReadOnlyCollection<string> untrustedHeadersToStrip)
    {
        app.Map("/api/{**path}", async (
            HttpContext http,
            IHttpForwarder forwarder,
            HttpMessageInvoker invoker,
            GatewayProxy proxy,
            CrudAuthzClient authzClient
        ) =>
        {
            GatewayRequestUtils.PrepareRequest(http, untrustedHeadersToStrip);

            var path = http.Request.Path.Value ?? string.Empty;
            var method = http.Request.Method ?? "GET";

            if (path.StartsWith("/api/auth", StringComparison.OrdinalIgnoreCase))
            {
                await Results.NotFound().ExecuteAsync(http);
                return;
            }

            var requirement = GatewayAuthzClassifier.Classify(method, path);

            GatewayIdentity? identity = null;
            if (requirement != AuthzRequirement.Public)
            {
                identity = await GatewayRequestUtils.RequireUser(http);
                if (identity is null)
                {
                    await GatewayRequestUtils.Unauthorized("missing_or_invalid_token").ExecuteAsync(http);
                    return;
                }
            }

            if (GatewayAuthzClassifier.IsGetPostById(method, path, out var postIdForVisibility))
            {
                var postInfo = await authzClient.FetchPostInfo(http, postIdForVisibility);
                if (postInfo is null)
                {
                    await Results.NotFound().ExecuteAsync(http);
                    return;
                }

                if (string.Equals(postInfo.Status, "Suggested", StringComparison.OrdinalIgnoreCase))
                {
                    identity ??= await GatewayRequestUtils.RequireUser(http);
                    if (identity is null)
                    {
                        await GatewayRequestUtils.Unauthorized("missing_or_invalid_token").ExecuteAsync(http);
                        return;
                    }

                    var ok = await authzClient.IsModerator(http, identity.UserId, postInfo.CommunityId);
                    if (!ok)
                    {
                        await GatewayRequestUtils.Forbidden("not_moderator").ExecuteAsync(http);
                        return;
                    }

                    http.Items[GatewayHeaders.AllowSuggested] = "true";
                }
            }

            if (requirement == AuthzRequirement.Owner && identity is not null)
            {
                var error = await RequireOwnerOr403(authzClient, http, identity.UserId, path, method);
                if (error is not null)
                {
                    await error.ExecuteAsync(http);
                    return;
                }
            }

            if (requirement == AuthzRequirement.Moderator && identity is not null)
            {
                var error = await RequireModeratorOr403(authzClient, http, identity.UserId, path);
                if (error is not null)
                {
                    await error.ExecuteAsync(http);
                    return;
                }
            }

            await proxy.ProxyWithGatewayIdentity(
                http,
                forwarder,
                invoker,
                destinationPrefix: "http://crud:8090",
                destinationPath: path,
                identity
            );
        });
    }

    private static async Task<IResult?> RequireOwnerOr403(CrudAuthzClient authzClient, HttpContext http, int userId, string path, string method)
    {
        if (TryGetSingleSegmentId(path, "/api/posts/", out var postId))
        {
            var info = await authzClient.FetchPostInfo(http, postId);
            if (info is null) return Results.NotFound();
            if (info.AuthorUserId != userId) return GatewayRequestUtils.Forbidden("not_owner");
            return null;
        }

        if (TryGetSingleSegmentId(path, "/api/comments/", out var commentId))
        {
            var info = await authzClient.FetchPostCommentInfo(http, commentId);
            if (info is null) return Results.NotFound();
            if (info.AuthorUserId != userId) return GatewayRequestUtils.Forbidden("not_owner");
            return null;
        }

        if (HttpMethods.IsPut(method) && TryGetSingleSegmentId(path, "/api/communities/", out var communityId))
        {
            var info = await authzClient.FetchCommunityOwnerInfo(http, communityId);
            if (info is null) return Results.NotFound();
            if (info.OwnerUserId != userId) return GatewayRequestUtils.Forbidden("not_owner");
            return null;
        }

        return GatewayRequestUtils.Forbidden("not_owner");
    }

    private static async Task<IResult?> RequireModeratorOr403(CrudAuthzClient authzClient, HttpContext http, int userId, string path)
    {
        var communityId = await authzClient.ResolveCommunityIdForModeratorRequirement(http, path);
        if (communityId is null)
        {
            return Results.NotFound();
        }

        var ok = await authzClient.IsModerator(http, userId, communityId.Value);
        if (!ok)
        {
            return GatewayRequestUtils.Forbidden("not_moderator");
        }

        return null;
    }

    private static bool TryGetSingleSegmentId(string path, string prefix, out int id)
    {
        id = default;
        if (!path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var rest = path[prefix.Length..];
        if (rest.Contains('/'))
        {
            return false;
        }

        return int.TryParse(rest, out id);
    }
}

