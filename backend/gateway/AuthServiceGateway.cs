using Yarp.ReverseProxy.Forwarder;

namespace gateway;

public static class AuthServiceGateway
{
    public static void Map(WebApplication app, IReadOnlyCollection<string> untrustedHeadersToStrip)
    {
        var authGroup = app.MapGroup("/api/auth").WithTags("Auth");

        authGroup.MapPost("/register", async (HttpContext http, IHttpForwarder forwarder, HttpMessageInvoker invoker, GatewayProxy proxy) =>
        {
            GatewayRequestUtils.AddOrPreserveRequestId(http);
            GatewayRequestUtils.StripUntrustedHeaders(http, untrustedHeadersToStrip);

            await proxy.ProxyRaw(
                http,
                forwarder,
                invoker,
                destinationPrefix: "http://auth:8080",
                destinationPath: "/user",
                allowJwtForward: true
            );
        });

        authGroup.MapPost("/login", async (HttpContext http, IHttpForwarder forwarder, HttpMessageInvoker invoker, GatewayProxy proxy) =>
        {
            GatewayRequestUtils.AddOrPreserveRequestId(http);
            GatewayRequestUtils.StripUntrustedHeaders(http, untrustedHeadersToStrip);

            await proxy.ProxyRaw(
                http,
                forwarder,
                invoker,
                destinationPrefix: "http://auth:8080",
                destinationPath: "/user/verify",
                allowJwtForward: true
            );
        });

        // Support browser-friendly GET verification by converting it to POST to the auth service.
        authGroup.MapGet("/verify/{uuid}", async (HttpContext http, IHttpClientFactory clients) =>
        {
            GatewayRequestUtils.AddOrPreserveRequestId(http);
            GatewayRequestUtils.StripUntrustedHeaders(http, untrustedHeadersToStrip);

            var uuid = http.Request.RouteValues["uuid"]?.ToString();
            if (string.IsNullOrWhiteSpace(uuid))
            {
                return Results.BadRequest(new { error = new { code = "bad_request", message = "uuid is required" } });
            }

            var auth = clients.CreateClient("auth-internal");
            var req = new HttpRequestMessage(HttpMethod.Post, $"/user/verify/{uuid}");
            req.Headers.TryAddWithoutValidation(GatewayHeaders.RequestId, http.Request.Headers[GatewayHeaders.RequestId].ToString());
            var resp = await auth.SendAsync(req, http.RequestAborted);

            return await GatewayRequestUtils.CopyHttpResponse(resp);
        });

        authGroup.MapPost("/verify/{uuid}", async (HttpContext http, IHttpForwarder forwarder, HttpMessageInvoker invoker, GatewayProxy proxy) =>
        {
            GatewayRequestUtils.AddOrPreserveRequestId(http);
            GatewayRequestUtils.StripUntrustedHeaders(http, untrustedHeadersToStrip);

            var uuid = http.Request.RouteValues["uuid"]?.ToString() ?? string.Empty;
            await proxy.ProxyRaw(
                http,
                forwarder,
                invoker,
                destinationPrefix: "http://auth:8080",
                destinationPath: $"/user/verify/{uuid}",
                allowJwtForward: true
            );
        });

        authGroup.MapGet("/me", async (HttpContext http, IHttpForwarder forwarder, HttpMessageInvoker invoker, GatewayProxy proxy) =>
        {
            GatewayRequestUtils.AddOrPreserveRequestId(http);
            GatewayRequestUtils.StripUntrustedHeaders(http, untrustedHeadersToStrip);

            var identity = await GatewayRequestUtils.RequireUser(http);
            if (identity is null)
            {
                await GatewayRequestUtils.Unauthorized("missing_or_invalid_token").ExecuteAsync(http);
                return;
            }

            await proxy.ProxyWithGatewayIdentity(
                http,
                forwarder,
                invoker,
                destinationPrefix: "http://auth:8080",
                destinationPath: "/user/identify",
                identity
            );
        });

        authGroup.MapDelete("/me", async (HttpContext http, IHttpForwarder forwarder, HttpMessageInvoker invoker, GatewayProxy proxy) =>
        {
            GatewayRequestUtils.AddOrPreserveRequestId(http);
            GatewayRequestUtils.StripUntrustedHeaders(http, untrustedHeadersToStrip);

            var identity = await GatewayRequestUtils.RequireUser(http);
            if (identity is null)
            {
                await GatewayRequestUtils.Unauthorized("missing_or_invalid_token").ExecuteAsync(http);
                return;
            }

            await proxy.ProxyWithGatewayIdentity(
                http,
                forwarder,
                invoker,
                destinationPrefix: "http://auth:8080",
                destinationPath: "/user/delete",
                identity
            );
        });
    }
}

