using System.Net;
using Amazon.S3;
using Amazon.S3.Model;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(o =>
{
    o.Limits.MaxRequestBodySize = 6 * 1024 * 1024;
});

builder.Services.AddSingleton<IAmazonS3>(_ =>
{
    var endpoint = builder.Configuration["MinIO:Endpoint"] ?? "http://minio:9000";
    var accessKey = builder.Configuration["MinIO:AccessKey"] ?? "minio";
    var secretKey = builder.Configuration["MinIO:SecretKey"] ?? "minioadmin";
    var cfg = new AmazonS3Config
    {
        ServiceURL = endpoint,
        ForcePathStyle = true,
        AuthenticationRegion = "us-east-1",
    };
    return new AmazonS3Client(accessKey, secretKey, cfg);
});

var app = builder.Build();

var bucket = app.Configuration["MinIO:Bucket"] ?? "selectio-media";
await EnsureBucketExistsAsync(app.Services.GetRequiredService<IAmazonS3>(), bucket, app.Lifetime.ApplicationStopping);

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapPost("/internal/upload", async (HttpContext http, IAmazonS3 s3, IConfiguration cfg, CancellationToken cancellationToken) =>
{
    if (!IsAuthorizedGateway(http, cfg))
    {
        return Results.Unauthorized();
    }

    if (!http.Request.Headers.TryGetValue("X-User-Id", out var uidValues) ||
        !int.TryParse(uidValues.ToString(), out var userId) ||
        userId <= 0)
    {
        return Results.BadRequest(new { message = "X-User-Id is required" });
    }

    var form = await http.Request.ReadFormAsync(cancellationToken);
    var file = form.Files.GetFile("file") ?? form.Files.FirstOrDefault();
    if (file is null || file.Length == 0)
    {
        return Results.BadRequest(new { message = "multipart field 'file' is required" });
    }

    if (file.Length > 5 * 1024 * 1024)
    {
        return Results.BadRequest(new { message = "file too large (max 5MB)" });
    }

    var contentType = (file.ContentType ?? string.Empty).ToLowerInvariant();
    var ext = contentType switch
    {
        "image/jpeg" => ".jpg",
        "image/jpg" => ".jpg",
        "image/png" => ".png",
        "image/webp" => ".webp",
        _ => string.Empty,
    };
    if (ext.Length == 0)
    {
        return Results.BadRequest(new { message = "only image/jpeg, image/png, image/webp are allowed" });
    }

    var objectKey = $"{userId}/{Guid.NewGuid():N}{ext}";
    await using var stream = file.OpenReadStream();
    await s3.PutObjectAsync(new PutObjectRequest
    {
        BucketName = bucket,
        Key = objectKey,
        InputStream = stream,
        ContentType = file.ContentType ?? "application/octet-stream",
        AutoCloseStream = false,
    }, cancellationToken);

    var publicBase = (cfg["Gateway:PublicBaseUrl"] ?? "http://localhost:8000").TrimEnd('/');
    var url = $"{publicBase}/media/{objectKey}";
    return Results.Json(new { url });
})
.DisableAntiforgery();

app.MapGet("/internal/media/{**objectKey}", async (HttpContext http, IAmazonS3 s3, IConfiguration cfg, string objectKey, CancellationToken cancellationToken) =>
{
    if (!IsAuthorizedGateway(http, cfg))
    {
        return Results.Unauthorized();
    }

    try
    {
        var getResp = await s3.GetObjectAsync(bucket, objectKey, cancellationToken);
        var contentType = getResp.Headers.ContentType ?? "application/octet-stream";
        return Results.Stream(getResp.ResponseStream, contentType);
    }
    catch (AmazonS3Exception ex) when (ex.StatusCode == HttpStatusCode.NotFound)
    {
        return Results.NotFound();
    }
});

app.Run();

static bool IsAuthorizedGateway(HttpContext http, IConfiguration cfg)
{
    var expected = cfg["Gateway:InternalToken"];
    if (string.IsNullOrWhiteSpace(expected))
    {
        return false;
    }

    return http.Request.Headers.TryGetValue("X-Gateway-Internal-Token", out var sent) &&
           string.Equals(sent.ToString(), expected, StringComparison.Ordinal);
}

static async Task EnsureBucketExistsAsync(IAmazonS3 s3, string bucket, CancellationToken cancellationToken)
{
    try
    {
        await s3.PutBucketAsync(new PutBucketRequest { BucketName = bucket }, cancellationToken);
    }
    catch (AmazonS3Exception ex) when (
        ex.ErrorCode is "BucketAlreadyOwnedByYou" or "BucketAlreadyExists" ||
        string.Equals(ex.ErrorCode, "AccessDenied", StringComparison.OrdinalIgnoreCase))
    {
        // Bucket may already exist or be auto-created depending on MinIO policy.
    }
}
