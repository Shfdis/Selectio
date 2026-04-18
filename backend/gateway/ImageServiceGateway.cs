using Yarp.ReverseProxy.Forwarder;

namespace gateway;

public static class ImageServiceGateway
{
    public static void Map(WebApplication app, IReadOnlyCollection<string> untrustedHeadersToStrip)
    {
        var imageServiceBase = app.Configuration["Downstream:ImageService"] ?? "http://image-service:8085";

        app.MapPost("/api/images", async (
            HttpContext http,
            IHttpForwarder forwarder,
            HttpMessageInvoker invoker,
            GatewayProxy proxy) =>
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
                destinationPrefix: imageServiceBase,
                destinationPath: "/internal/upload",
                identity);
        })
        .WithTags("Gateway", "Media")
        .WithSummary("Upload an image")
        .WithDescription(
            "Multipart upload (field name `file`). Returns JSON `{ \"url\" }` where `url` is served by this gateway under `/media/...`. " +
            "Requires a valid JWT."
        )
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized)
        .DisableAntiforgery();

        app.MapGet("/media/{**objectKey}", async (
            HttpContext http,
            IHttpForwarder forwarder,
            HttpMessageInvoker invoker,
            GatewayProxy proxy) =>
        {
            GatewayRequestUtils.PrepareRequest(http, untrustedHeadersToStrip);

            var path = http.Request.Path.Value ?? string.Empty;
            var dest = "/internal/media" + path["/media".Length..];
            await proxy.ProxyWithGatewayIdentity(
                http,
                forwarder,
                invoker,
                destinationPrefix: imageServiceBase,
                destinationPath: dest,
                identity: null);
        })
        .WithTags("Gateway", "Media")
        .WithSummary("Download uploaded media")
        .WithDescription("Streams an object previously uploaded via POST /api/images. Public in v1.")
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);
    }
}
