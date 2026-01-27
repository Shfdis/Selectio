using Microsoft.EntityFrameworkCore;
using auth.Models;

namespace auth.Data;

public class PendingEmailDbContext : DbContext
{
    public DbSet<PendingEmail> PendingEmails { get; set; }

    public PendingEmailDbContext(DbContextOptions<PendingEmailDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<PendingEmail>(entity =>
        {
            entity.HasKey(e => e.Uuid);
            entity.Property(e => e.Uuid).ValueGeneratedNever();
            entity.Property(e => e.Email).IsRequired();
            entity.Property(e => e.Username).IsRequired();
            entity.Property(e => e.Description).IsRequired();
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.Timestamp).IsRequired();
        });
    }
}
