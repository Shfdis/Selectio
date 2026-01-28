using System.Net;
using System.Text;
using gateway;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddHttpForwarder();

builder.Services.AddSingleton(_ => new HttpMessageInvoker(new SocketsHttpHandler
{
    // Reasonable defaults for a gateway.
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

// JWT validation (must match Auth service config).
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

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

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
CrudServiceGateway.Map(app, untrustedHeadersToStrip);

app.Run();
