using crud.Data;
using crud.Endpoints;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

const string ServiceSchema = "crud";

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddDbContext<CrudDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("CrudDb"),
        npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory", ServiceSchema)
    )
);

var app = builder.Build();

// Apply migrations on startup (dev-focused; compose runs Development).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CrudDbContext>();
    await db.Database.ExecuteSqlRawAsync($"CREATE SCHEMA IF NOT EXISTS {ServiceSchema};");
    await db.Database.MigrateAsync();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/version", () =>
{
    var version = typeof(Program).Assembly.GetName().Version?.ToString() ?? "0.0.0";
    return Results.Ok(new { service = "crud", version });
});

app.MapBookEndpoints();
app.MapLibraryEndpoints();
app.MapProfileEndpoints();
app.MapCommunityEndpoints();
app.MapPostEndpoints();
app.MapCommentEndpoints();
app.MapLikeFavoriteEndpoints();
app.MapModerationEndpoints();
app.MapInternalAuthzEndpoints();

app.Run();
