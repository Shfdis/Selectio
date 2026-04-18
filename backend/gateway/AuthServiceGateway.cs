using Yarp.ReverseProxy.Forwarder;

namespace gateway;

public static class AuthServiceGateway
{
    public static void Map(WebApplication app, IReadOnlyCollection<string> untrustedHeadersToStrip)
    {
        var authGroup = app.MapGroup("/api/auth").WithTags("Auth");

        authGroup.MapPost("/register", async (HttpContext http, IHttpForwarder forwarder, HttpMessageInvoker invoker, GatewayProxy proxy) =>
        {
            GatewayRequestUtils.PrepareRequest(http, untrustedHeadersToStrip);

            await proxy.ProxyRaw(
                http,
                forwarder,
                invoker,
                destinationPrefix: "http://auth:8080",
                destinationPath: "/user",
                allowJwtForward: true
            );
        })
        .WithName("GatewayRegister")
        .WithSummary("Register a new account")
        .WithDescription("Creates a pending user registration and sends an email verification link.")
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status409Conflict)
        .Produces(StatusCodes.Status503ServiceUnavailable);

        authGroup.MapPost("/login", async (HttpContext http, IHttpForwarder forwarder, HttpMessageInvoker invoker, GatewayProxy proxy) =>
        {
            GatewayRequestUtils.PrepareRequest(http, untrustedHeadersToStrip);

            await proxy.ProxyRaw(
                http,
                forwarder,
                invoker,
                destinationPrefix: "http://auth:8080",
                destinationPath: "/user/verify",
                allowJwtForward: true
            );
        })
        .WithName("GatewayLogin")
        .WithSummary("Authenticate user credentials")
        .WithDescription("Validates email and password, then returns a JWT access token.")
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        authGroup.MapGet("/verify/{uuid}", async (HttpContext http, IHttpClientFactory clients) =>
        {
            GatewayRequestUtils.PrepareRequest(http, untrustedHeadersToStrip);

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
        })
        .WithName("GatewayVerifyEmailByGet")
        .WithSummary("Verify email by UUID")
        .WithDescription("Confirms pending account registration using the verification UUID from email link.")
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status404NotFound);

        authGroup.MapPost("/verify/{uuid}", async (HttpContext http, IHttpForwarder forwarder, HttpMessageInvoker invoker, GatewayProxy proxy) =>
        {
            GatewayRequestUtils.PrepareRequest(http, untrustedHeadersToStrip);

            var uuid = http.Request.RouteValues["uuid"]?.ToString() ?? string.Empty;
            await proxy.ProxyRaw(
                http,
                forwarder,
                invoker,
                destinationPrefix: "http://auth:8080",
                destinationPath: $"/user/verify/{uuid}",
                allowJwtForward: true
            );
        })
        .WithName("GatewayVerifyEmailByPost")
        .WithSummary("Verify email by UUID")
        .WithDescription("Confirms pending account registration for clients that call verification as POST.")
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

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
        })
        .WithName("GatewayGetCurrentUser")
        .WithSummary("Get current user profile")
        .WithDescription("Returns profile data for the authenticated user from the auth service.")
        .RequireAuthorization()
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

        authGroup.MapDelete("/me", async (HttpContext http, IHttpForwarder forwarder, HttpMessageInvoker invoker, GatewayProxy proxy) =>
        {
            GatewayRequestUtils.PrepareRequest(http, untrustedHeadersToStrip);

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
        })
        .WithName("GatewayDeleteCurrentUser")
        .WithSummary("Delete current user account")
        .WithDescription("Deletes the authenticated user's account.")
        .RequireAuthorization()
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);
    }
}

