using crud.Entities;
using Microsoft.EntityFrameworkCore;
using Pgvector.EntityFrameworkCore;

namespace crud.Data;

public class CrudDbContext : DbContext
{
    public CrudDbContext(DbContextOptions<CrudDbContext> options) : base(options) { }

    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<UserBook> UserBooks => Set<UserBook>();
    public DbSet<Community> Communities => Set<Community>();
    public DbSet<CommunityMember> CommunityMembers => Set<CommunityMember>();
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<BookComment> BookComments => Set<BookComment>();
    public DbSet<PostComment> PostComments => Set<PostComment>();
    public DbSet<PostLike> PostLikes => Set<PostLike>();
    public DbSet<FavoritePost> FavoritePosts => Set<FavoritePost>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("crud");

        modelBuilder.Entity<UserProfile>(e =>
        {
            e.HasKey(x => x.UserId);
            e.Property(x => x.Username).IsRequired();
            e.Property(x => x.Description).IsRequired().HasDefaultValue(string.Empty);
            e.Property(x => x.AvatarUrl).HasDefaultValue(string.Empty);
        });

        modelBuilder.Entity<Book>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedOnAdd();
            e.Property(x => x.Title).IsRequired();
            e.Property(x => x.Author).IsRequired();
            e.Property(x => x.Description).IsRequired().HasDefaultValue(string.Empty);
            e.Property(x => x.Genre).IsRequired().HasDefaultValue(string.Empty);
            e.Property(x => x.CoverUrl).IsRequired().HasDefaultValue(string.Empty);
            e.Property(x => x.Popularity).HasDefaultValue(0);
            e.Property(x => x.ReleaseDate);
            e.Property(x => x.Embedding).HasColumnType("vector(72)");
            e.HasIndex(x => new { x.Popularity, x.Id })
                .HasDatabaseName("IX_Books_Popularity_Id")
                .IsDescending(true, false);
            e.HasIndex(x => new { x.Title, x.Author });
        });

        modelBuilder.Entity<UserBook>(e =>
        {
            e.HasKey(x => new { x.UserId, x.BookId });
            e.Property(x => x.Status).IsRequired();
            e.Property(x => x.Rating);
            e.HasOne(x => x.Book).WithMany().HasForeignKey(x => x.BookId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Community>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedOnAdd();
            e.Property(x => x.Name).IsRequired();
            e.Property(x => x.Description).IsRequired().HasDefaultValue(string.Empty);
            e.Property(x => x.CoverUrl).IsRequired().HasDefaultValue(string.Empty);
            e.Property(x => x.Genre).IsRequired().HasDefaultValue(string.Empty);
            e.Property(x => x.OwnerUserId).IsRequired();
            e.Property(x => x.Embedding).HasColumnType("vector(72)");
            e.HasIndex(x => x.Name).IsUnique();
        });

        modelBuilder.Entity<CommunityMember>(e =>
        {
            e.HasKey(x => new { x.CommunityId, x.UserId });
            e.Property(x => x.Role).IsRequired();
            e.HasOne(x => x.Community).WithMany().HasForeignKey(x => x.CommunityId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.UserId);
        });

        modelBuilder.Entity<Post>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedOnAdd();
            e.Property(x => x.CommunityId).IsRequired();
            e.Property(x => x.AuthorUserId).IsRequired();
            e.Property(x => x.BookId).IsRequired();
            e.Property(x => x.Content).IsRequired();
            e.Property(x => x.PhotoUrl);
            e.Property(x => x.Status).IsRequired();
            e.Property(x => x.CreatedAt).IsRequired();
            e.Property(x => x.Embedding).HasColumnType("vector(72)");
            e.HasOne(x => x.Community).WithMany().HasForeignKey(x => x.CommunityId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Book).WithMany().HasForeignKey(x => x.BookId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.CommunityId);
            e.HasIndex(x => x.AuthorUserId);
        });

        modelBuilder.Entity<BookComment>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedOnAdd();
            e.Property(x => x.BookId).IsRequired();
            e.Property(x => x.AuthorUserId).IsRequired();
            e.Property(x => x.Content).IsRequired();
            e.Property(x => x.Rating).IsRequired();
            e.Property(x => x.CreatedAt).IsRequired();
            e.HasOne(x => x.Book).WithMany().HasForeignKey(x => x.BookId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.BookId);
        });

        modelBuilder.Entity<PostComment>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedOnAdd();
            e.Property(x => x.PostId).IsRequired();
            e.Property(x => x.AuthorUserId).IsRequired();
            e.Property(x => x.Content).IsRequired();
            e.Property(x => x.CreatedAt).IsRequired();
            e.HasOne(x => x.Post).WithMany().HasForeignKey(x => x.PostId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.PostId);
        });

        modelBuilder.Entity<PostLike>(e =>
        {
            e.HasKey(x => new { x.PostId, x.UserId });
            e.Property(x => x.CreatedAt).IsRequired();
            e.HasOne(x => x.Post).WithMany().HasForeignKey(x => x.PostId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.UserId);
        });

        modelBuilder.Entity<FavoritePost>(e =>
        {
            e.HasKey(x => new { x.UserId, x.PostId });
            e.Property(x => x.CreatedAt).IsRequired();
            e.HasOne(x => x.Post).WithMany().HasForeignKey(x => x.PostId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.PostId);
        });
    }
}

