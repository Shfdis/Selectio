using crud.Data;
using crud.Endpoints;
using crud.Services;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Pgvector;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

const string ServiceSchema = "crud";

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHostedService<SeenCleanupService>();

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

var crudConnectionString = builder.Configuration.GetConnectionString("CrudDb")
    ?? throw new InvalidOperationException("ConnectionStrings:CrudDb is required.");

// Ensure schema + pgvector extension exist BEFORE building NpgsqlDataSource so that
// UseVector() can load the vector type OID into the data source's type cache.
{
    await using var bootstrap = new NpgsqlConnection(crudConnectionString);
    await bootstrap.OpenAsync();
    await using var bootstrapCmd = bootstrap.CreateCommand();
    bootstrapCmd.CommandText =
        $"CREATE SCHEMA IF NOT EXISTS {ServiceSchema}; " +
        "CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;";
    await bootstrapCmd.ExecuteNonQueryAsync();
}

var crudDataSourceBuilder = new NpgsqlDataSourceBuilder(crudConnectionString);
crudDataSourceBuilder.UseVector();
var crudDataSource = crudDataSourceBuilder.Build();
builder.Services.AddSingleton(crudDataSource);
builder.Services.AddDbContext<CrudDbContext>(options =>
    options.UseNpgsql(
        crudDataSource,
        npgsql =>
        {
            npgsql.MigrationsHistoryTable("__EFMigrationsHistory", ServiceSchema);
            npgsql.UseVector();
        }));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CrudDbContext>();
    // Schema was already created in the bootstrap step above.
    await db.Database.MigrateAsync();
    // Reload Npgsql's type cache so any types added by the migration (e.g. pgvector
    // on a fresh database) are available to existing pooled connections.
    await using var reloadConn = await crudDataSource.OpenConnectionAsync();
    await reloadConn.ReloadTypesAsync();
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
