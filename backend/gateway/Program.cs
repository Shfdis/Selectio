using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using gateway;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Swashbuckle.AspNetCore.SwaggerUI;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddHttpForwarder();

builder.Services.AddSingleton(_ => new HttpMessageInvoker(new SocketsHttpHandler
{
    UseProxy = false,
    AllowAutoRedirect = false,
    AutomaticDecompression = DecompressionMethods.None
}));

builder.Services.AddHttpClient("crud-internal", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Downstream:Crud"] ?? "http://crud:8090");
});

builder.Services.AddHttpClient("auth-internal", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Downstream:Auth"] ?? "http://auth:8080");
});

builder.Services.AddSingleton<GatewayProxy>();
builder.Services.AddSingleton<CrudAuthzClient>();

var jwtSecret = builder.Configuration["Jwt:SecretKey"]
    ?? "your-super-secret-key-change-this-in-production-minimum-32-characters";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "SelectioAuth";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "SelectioUsers";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();

var allowAnyOrigin = string.Equals(builder.Configuration["Cors:AllowAnyOrigin"], "true", StringComparison.OrdinalIgnoreCase);
var allowedOriginsConfig = builder.Configuration["Cors:AllowedOrigins"] ?? "";
var allowedOrigins = allowedOriginsConfig
    .Split(new[] { ';', ',' }, StringSplitOptions.RemoveEmptyEntries)
    .Select(o => o.Trim())
    .Where(o => o.Length > 0)
    .ToArray();
if (allowedOrigins.Length == 0 && builder.Environment.IsDevelopment())
{
    allowedOrigins = new[] { "http://localhost:8081", "http://localhost:8080" };
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("Default", policy =>
    {
        if (allowAnyOrigin)
        {
            policy.AllowAnyOrigin();
        }
        else if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins);
        }
        else
        {
            policy.AllowAnyOrigin();
        }
        policy.AllowAnyMethod();
        policy.AllowAnyHeader();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    static JsonObject MergeOpenApiDocs(string authJson, string crudJson)
    {
        var authDoc = JsonNode.Parse(authJson)?.AsObject() ?? new JsonObject();
        var crudDoc = JsonNode.Parse(crudJson)?.AsObject() ?? new JsonObject();

        var merged = new JsonObject
        {
            ["openapi"] = authDoc["openapi"]?.DeepClone() ?? crudDoc["openapi"]?.DeepClone() ?? "3.0.1",
            ["info"] = new JsonObject
            {
                ["title"] = "Selectio Development API",
                ["version"] = "v1"
            },
            ["paths"] = new JsonObject(),
            ["components"] = new JsonObject()
        };

        static void MergeObjectSection(JsonObject target, JsonObject source)
        {
            foreach (var kv in source)
            {
                if (kv.Value is not null)
                {
                    target[kv.Key] = kv.Value.DeepClone();
                }
            }
        }

        var mergedPaths = merged["paths"]!.AsObject();
        MergeObjectSection(mergedPaths, authDoc["paths"]?.AsObject() ?? new JsonObject());
        MergeObjectSection(mergedPaths, crudDoc["paths"]?.AsObject() ?? new JsonObject());

        var mergedComponents = merged["components"]!.AsObject();
        var authComponents = authDoc["components"]?.AsObject() ?? new JsonObject();
        var crudComponents = crudDoc["components"]?.AsObject() ?? new JsonObject();
        var componentSections = new[]
        {
            "schemas", "securitySchemes", "responses", "parameters", "requestBodies", "headers"
        };

        foreach (var sectionName in componentSections)
        {
            var section = new JsonObject();
            MergeObjectSection(section, authComponents[sectionName]?.AsObject() ?? new JsonObject());
            MergeObjectSection(section, crudComponents[sectionName]?.AsObject() ?? new JsonObject());
            if (section.Count > 0)
            {
                mergedComponents[sectionName] = section;
            }
        }

        return merged;
    }

    app.MapGet("/docs/auth/openapi.json", async (IHttpClientFactory clients, CancellationToken cancellationToken) =>
    {
        var client = clients.CreateClient("auth-internal");
        var response = await client.GetAsync("/swagger/v1/swagger.json", cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return Results.Problem(
                title: "Unable to load auth OpenAPI document",
                detail: $"Downstream auth responded with status {(int)response.StatusCode}.",
                statusCode: StatusCodes.Status502BadGateway
            );
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        return Results.Text(json, "application/json");
    });

    app.MapGet("/docs/crud/openapi.json", async (IHttpClientFactory clients, CancellationToken cancellationToken) =>
    {
        var client = clients.CreateClient("crud-internal");
        var response = await client.GetAsync("/swagger/v1/swagger.json", cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return Results.Problem(
                title: "Unable to load CRUD OpenAPI document",
                detail: $"Downstream crud responded with status {(int)response.StatusCode}.",
                statusCode: StatusCodes.Status502BadGateway
            );
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        return Results.Text(json, "application/json");
    });

    app.MapGet("/docs/all/openapi.json", async (IHttpClientFactory clients, CancellationToken cancellationToken) =>
    {
        var authClient = clients.CreateClient("auth-internal");
        var crudClient = clients.CreateClient("crud-internal");

        var authResponse = await authClient.GetAsync("/swagger/v1/swagger.json", cancellationToken);
        if (!authResponse.IsSuccessStatusCode)
        {
            return Results.Problem(
                title: "Unable to load auth OpenAPI document",
                detail: $"Downstream auth responded with status {(int)authResponse.StatusCode}.",
                statusCode: StatusCodes.Status502BadGateway
            );
        }

        var crudResponse = await crudClient.GetAsync("/swagger/v1/swagger.json", cancellationToken);
        if (!crudResponse.IsSuccessStatusCode)
        {
            return Results.Problem(
                title: "Unable to load CRUD OpenAPI document",
                detail: $"Downstream crud responded with status {(int)crudResponse.StatusCode}.",
                statusCode: StatusCodes.Status502BadGateway
            );
        }

        var authJson = await authResponse.Content.ReadAsStringAsync(cancellationToken);
        var crudJson = await crudResponse.Content.ReadAsStringAsync(cancellationToken);
        var merged = MergeOpenApiDocs(authJson, crudJson);
        var fragmentPath = Path.Combine(AppContext.BaseDirectory, "openapi-gateway-fragment.json");
        if (File.Exists(fragmentPath))
        {
            var fragmentJson = await File.ReadAllTextAsync(fragmentPath, cancellationToken);
            var fragment = JsonNode.Parse(fragmentJson)?.AsObject();
            var fragPaths = fragment?["paths"]?.AsObject();
            if (fragPaths is not null)
            {
                var mergedPathsObj = merged["paths"]!.AsObject();
                foreach (var kv in fragPaths)
                {
                    if (kv.Value is not null)
                    {
                        mergedPathsObj[kv.Key] = kv.Value.DeepClone();
                    }
                }
            }
        }

        return Results.Text(
            merged.ToJsonString(new JsonSerializerOptions { WriteIndented = false }),
            "application/json"
        );
    });

    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.ConfigObject.Urls = new List<UrlDescriptor>
        {
            new() { Url = "/docs/all/openapi.json", Name = "All APIs" },
            new() { Url = "/docs/auth/openapi.json", Name = "Auth API" },
            new() { Url = "/docs/crud/openapi.json", Name = "CRUD API" },
            new() { Url = "/swagger/v1/swagger.json", Name = "Gateway API" }
        };
        options.DocumentTitle = "Selectio Development API Docs";
    });
}

app.UseCors("Default");
app.UseAuthentication();
app.UseAuthorization();

var untrustedHeadersToStrip = new[]
{
    GatewayHeaders.UserId,
    GatewayHeaders.UserEmail,
    GatewayHeaders.UserName,
    GatewayHeaders.AllowSuggested,
    GatewayHeaders.InternalToken
};

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/version", () =>
{
    var version = typeof(Program).Assembly.GetName().Version?.ToString() ?? "0.0.0";
    return Results.Ok(new { service = "gateway", version });
});

AuthServiceGateway.Map(app, untrustedHeadersToStrip);
ImageServiceGateway.Map(app, untrustedHeadersToStrip);
CrudServiceGateway.Map(app, untrustedHeadersToStrip);

app.Run();
