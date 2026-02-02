using Yarp.ReverseProxy.Forwarder;

namespace gateway;

public sealed class GatewayProxy(IConfiguration configuration)
{
    private readonly IConfiguration _configuration = configuration;

    public async Task ProxyRaw(
        HttpContext http,
        IHttpForwarder forwarder,
        HttpMessageInvoker invoker,
        string destinationPrefix,
        string destinationPath,
        bool allowJwtForward
    )
    {
        var error = await forwarder.SendAsync(
            http,
            destinationPrefix,
            invoker,
            ForwarderRequestConfig.Empty,
            new GatewayTransformer(http, identity: null, destinationPath, allowJwtForward, internalToken: null)
        );

        if (error != ForwarderError.None && !http.Response.HasStarted)
        {
            await Results.Json(
                    new { error = new { code = "bad_gateway", message = error.ToString() } },
                    statusCode: StatusCodes.Status502BadGateway
                )
                .ExecuteAsync(http);
        }
    }

    public async Task ProxyWithGatewayIdentity(
        HttpContext http,
        IHttpForwarder forwarder,
        HttpMessageInvoker invoker,
        string destinationPrefix,
        string destinationPath,
        GatewayIdentity? identity,
        bool allowJwtForward = false
    )
    {
        var internalToken = _configuration["Gateway:InternalToken"];

        var error = await forwarder.SendAsync(
            http,
            destinationPrefix,
            invoker,
            ForwarderRequestConfig.Empty,
            new GatewayTransformer(http, identity, destinationPath, allowJwtForward, internalToken)
        );

        if (error != ForwarderError.None && !http.Response.HasStarted)
        {
            await Results.Json(
                    new { error = new { code = "bad_gateway", message = error.ToString() } },
                    statusCode: StatusCodes.Status502BadGateway
                )
                .ExecuteAsync(http);
        }
    }
}

