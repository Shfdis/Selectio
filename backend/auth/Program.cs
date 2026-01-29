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

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register email service
builder.Services.AddScoped<IEmailService, EmailService>();

// Register background service for cleaning up old pending emails
builder.Services.AddHostedService<PendingEmailCleanupService>();

// Configure PostgreSQL for verified users
builder.Services.AddDbContext<UserDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("UsersDb"))
);

// Configure JWT Authentication
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

static void BaselineIfCreatedWithoutMigrations(DbContext db)
{
    // Scenario: DB was previously created via EnsureCreated().
    // Tables exist, but __EFMigrationsHistory doesn't, so Migrate() would try to re-create tables.
    var databaseCreator = db.GetService<IRelationalDatabaseCreator>();
    var history = db.GetService<IHistoryRepository>();

    static bool HasNonHistoryTables(DbContext db)
    {
        // Avoid treating a DB with only __EFMigrationsHistory as “existing schema”.
        var provider = db.Database.ProviderName ?? string.Empty;

        if (provider.Contains("Sqlite", StringComparison.OrdinalIgnoreCase))
        {
            // Exclude EF history and SQLite internal tables.
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

        // Default relational check (PostgreSQL, etc.)
        return db.Database.SqlQueryRaw<long>(
                """
                SELECT COUNT(*) AS cnt
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_type = 'BASE TABLE'
                  AND table_name <> '__EFMigrationsHistory'
                """
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

    // If the DB has no user tables, we should not “baseline”; just let Migrate() create everything.
    if (!HasNonHistoryTables(db))
    {
        return;
    }

    // Only baseline when the history table did not exist (e.g. DB was created via EnsureCreated).
    // If history already exists, do not insert unapplied migrations — let Migrate() run them.
    if (!history.Exists())
    {
        db.Database.ExecuteSqlRaw(history.GetCreateScript());
        var productVersion = Microsoft.EntityFrameworkCore.Infrastructure.ProductInfo.GetVersion();
        var applied = new HashSet<string>(db.Database.GetAppliedMigrations(), StringComparer.Ordinal);
        foreach (var migrationId in db.Database.GetMigrations())
        {
            if (applied.Contains(migrationId))
                continue;
            var insert = history.GetInsertScript(new HistoryRow(migrationId, productVersion));
            db.Database.ExecuteSqlRaw(insert);
        }
    }
}

// Apply migrations (with baseline for existing dev DBs)
using (var scope = app.Services.CreateScope())
{
    var userDb = scope.ServiceProvider.GetRequiredService<UserDbContext>();
    BaselineIfCreatedWithoutMigrations(userDb);
    userDb.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

// Map user endpoints
app.MapUserEndpoints();

app.Run();
