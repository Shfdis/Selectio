using System.Text;
using auth.Data;
using auth.Endpoints;
using auth.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

const string ServiceSchema = "auth";

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var captureForTests = builder.Configuration.GetValue<bool>("Email:CaptureForTests", false);
if (captureForTests)
{
    builder.Services.AddSingleton<CapturingEmailService>();
    builder.Services.AddSingleton<IEmailService>(sp => sp.GetRequiredService<CapturingEmailService>());
}
else
{
    builder.Services.AddScoped<IEmailService, EmailService>();
}

builder.Services.AddHostedService<PendingEmailCleanupService>();

builder.Services.AddDbContext<UserDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("UsersDb"),
        npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory", ServiceSchema)
    )
);

var jwtSecret = builder.Configuration["Jwt:SecretKey"] 
    ?? "your-super-secret-key-change-this-in-production-minimum-32-characters";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "SelectioAuth";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "SelectioUsers";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
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

static void BaselineIfCreatedWithoutMigrations(DbContext db, string schema)
{
    var databaseCreator = db.GetService<IRelationalDatabaseCreator>();
    var history = db.GetService<IHistoryRepository>();

    static bool HasNonHistoryTables(DbContext db, string schema)
    {
        var provider = db.Database.ProviderName ?? string.Empty;

        if (provider.Contains("Sqlite", StringComparison.OrdinalIgnoreCase))
        {
            return db.Database.SqlQueryRaw<long>(
                    """
                    SELECT COUNT(*) AS cnt
                    FROM sqlite_master
                    WHERE type = 'table'
                      AND name NOT IN ('__EFMigrationsHistory', 'sqlite_sequence')
                    """
                )
                .AsEnumerable()
                .FirstOrDefault() > 0;
        }

        return db.Database.SqlQueryRaw<long>(
                """
                SELECT COUNT(*) AS cnt
                FROM information_schema.tables
                WHERE table_schema = {0}
                  AND table_type = 'BASE TABLE'
                  AND table_name <> '__EFMigrationsHistory'
                """
                ,
                schema
            )
            .AsEnumerable()
            .FirstOrDefault() > 0;
    }

    if (!databaseCreator.Exists())
    {
        return;
    }

    if (!databaseCreator.HasTables())
    {
        return;
    }

    if (!HasNonHistoryTables(db, schema))
    {
        return;
    }

    if (!history.Exists())
    {
        db.Database.ExecuteSqlRaw(history.GetCreateScript());
    }

    static bool HasIndex(DbContext db, string schema, string indexName)
    {
        var provider = db.Database.ProviderName ?? string.Empty;

        if (provider.Contains("Sqlite", StringComparison.OrdinalIgnoreCase))
        {
            return db.Database.SqlQueryRaw<long>(
                    """
                    SELECT COUNT(*) AS cnt
                    FROM sqlite_master
                    WHERE type = 'index' AND name = {0}
                    """,
                    indexName
                )
                .AsEnumerable()
                .FirstOrDefault() > 0;
        }

        return db.Database.SqlQueryRaw<long>(
                """
                SELECT COUNT(*) AS cnt
                FROM pg_indexes
                WHERE schemaname = {0}
                  AND indexname = {1}
                """,
                schema,
                indexName
            )
            .AsEnumerable()
            .FirstOrDefault() > 0;
    }

    var productVersion = Microsoft.EntityFrameworkCore.Infrastructure.ProductInfo.GetVersion();
    var applied = new HashSet<string>(db.Database.GetAppliedMigrations(), StringComparer.Ordinal);

    foreach (var migrationId in db.Database.GetMigrations())
    {
        if (applied.Contains(migrationId))
        {
            continue;
        }

        if (migrationId.Contains("DropUsernameUniqueIndex", StringComparison.Ordinal) &&
            HasIndex(db, schema, "IX_users_Username"))
        {
            continue;
        }

        var insert = history.GetInsertScript(new HistoryRow(migrationId, productVersion));
        db.Database.ExecuteSqlRaw(insert);
    }
}

using (var scope = app.Services.CreateScope())
{

    var userDb = scope.ServiceProvider.GetRequiredService<UserDbContext>();
    userDb.Database.ExecuteSqlRaw($"CREATE SCHEMA IF NOT EXISTS {ServiceSchema};");
    BaselineIfCreatedWithoutMigrations(userDb, ServiceSchema);
    userDb.Database.Migrate();

    var provider = userDb.Database.ProviderName ?? string.Empty;
    if (provider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) ||
        provider.Contains("Postgre", StringComparison.OrdinalIgnoreCase))
    {
        userDb.Database.ExecuteSqlRaw($"""DROP INDEX IF EXISTS {ServiceSchema}."IX_users_Username";""");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapUserEndpoints();

if (captureForTests)
{
    app.MapGet(
            "/test/emails-sent",
            () =>
            {
                var captured = CapturingEmailService.GetCaptured();
                return Results.Ok(captured.Select(c => new { c.Email, c.Username, c.VerificationUuid }));
            }
        )
        .WithName("GetTestEmailsSent")
        .WithOpenApi();
}

app.Run();
