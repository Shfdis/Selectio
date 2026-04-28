using Yarp.ReverseProxy.Forwarder;

namespace gateway;

public sealed class GatewayTransformer : HttpTransformer
{
    private readonly HttpContext _http;
    private readonly GatewayIdentity? _identity;
    private readonly string _destinationPath;
    private readonly bool _allowJwtForward;
    private readonly string? _internalToken;

    public GatewayTransformer(
        HttpContext http,
        GatewayIdentity? identity,
        string destinationPath,
        bool allowJwtForward,
        string? internalToken
    )
    {
        _http = http;
        _identity = identity;
        _destinationPath = destinationPath;
        _allowJwtForward = allowJwtForward;
        _internalToken = internalToken;
    }

    public override async ValueTask TransformRequestAsync(
        HttpContext httpContext,
        HttpRequestMessage proxyRequest,
        string destinationPrefix,
        CancellationToken cancellationToken
    )
    {
        await base.TransformRequestAsync(httpContext, proxyRequest, destinationPrefix, cancellationToken);

        proxyRequest.RequestUri = RequestUtilities.MakeDestinationAddress(
            destinationPrefix,
            _destinationPath,
            httpContext.Request.QueryString
        );

        if (_http.Request.Headers.TryGetValue(GatewayHeaders.RequestId, out var requestId))
        {
            proxyRequest.Headers.TryAddWithoutValidation(GatewayHeaders.RequestId, requestId.ToString());
        }

        proxyRequest.Headers.Remove(GatewayHeaders.UserId);
        proxyRequest.Headers.Remove(GatewayHeaders.UserEmail);
        proxyRequest.Headers.Remove(GatewayHeaders.UserName);
        proxyRequest.Headers.Remove(GatewayHeaders.AllowSuggested);
        proxyRequest.Headers.Remove(GatewayHeaders.InternalToken);

        if (!_allowJwtForward)
        {
            proxyRequest.Headers.Remove("Authorization");
        }

        if (_identity is not null)
        {
            proxyRequest.Headers.TryAddWithoutValidation(GatewayHeaders.UserId, _identity.UserId.ToString());
            if (!string.IsNullOrWhiteSpace(_identity.Email))
            {
                proxyRequest.Headers.TryAddWithoutValidation(GatewayHeaders.UserEmail, _identity.Email);
            }
        }

        if (_http.Items.TryGetValue(GatewayHeaders.AllowSuggested, out var allowSuggested) && allowSuggested is string allowSuggestedValue)
        {
            proxyRequest.Headers.TryAddWithoutValidation(GatewayHeaders.AllowSuggested, allowSuggestedValue);
        }

        if (!string.IsNullOrWhiteSpace(_internalToken))
        {
            proxyRequest.Headers.TryAddWithoutValidation(GatewayHeaders.InternalToken, _internalToken);
        }
    }
}

