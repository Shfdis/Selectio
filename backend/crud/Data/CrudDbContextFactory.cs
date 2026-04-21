using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace crud.Data;

public class CrudDbContextFactory : IDesignTimeDbContextFactory<CrudDbContext>
{
    public CrudDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<CrudDbContext>();
        var connectionString = Environment.GetEnvironmentVariable("CRUD_DB_CONNECTION")
            ?? "Host=localhost;Port=5432;Database=selectio_main;Username=postgres;Password=postgres;Search Path=crud";
        optionsBuilder.UseNpgsql(connectionString, npgsql =>
        {
            npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "crud");
            npgsql.UseVector();
        });

        return new CrudDbContext(optionsBuilder.Options);
    }
}
