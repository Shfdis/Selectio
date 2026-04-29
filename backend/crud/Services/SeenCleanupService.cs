using crud.Data;
using Microsoft.EntityFrameworkCore;

namespace crud.Services;

public sealed class SeenCleanupService(IServiceScopeFactory scopeFactory, ILogger<SeenCleanupService> logger) : BackgroundService
{
    private static readonly TimeSpan CleanupInterval = TimeSpan.FromHours(24);
    private static readonly TimeSpan Retention = TimeSpan.FromDays(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Seen cleanup failed");
            }

            await Task.Delay(CleanupInterval, stoppingToken);
        }
    }

    private async Task CleanupAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CrudDbContext>();
        var cutoff = DateTime.UtcNow.Subtract(Retention);

        var removedPosts = await db.SeenPosts
            .Where(x => x.SeenAt < cutoff)
            .Where(x =>
                !db.PostLikes.Any(l => l.UserId == x.UserId && l.PostId == x.PostId) &&
                !db.FavoritePosts.Any(f => f.UserId == x.UserId && f.PostId == x.PostId) &&
                !db.PostComments.Any(c => c.AuthorUserId == x.UserId && c.PostId == x.PostId) &&
                !db.Posts.Any(p => p.AuthorUserId == x.UserId && p.Id == x.PostId))
            .ExecuteDeleteAsync(cancellationToken);
        var removedBooks = await db.SeenBooks
            .Where(x => x.SeenAt < cutoff)
            .Where(x =>
                !db.UserBooks.Any(ub => ub.UserId == x.UserId && ub.BookId == x.BookId) &&
                !db.BookComments.Any(c => c.AuthorUserId == x.UserId && c.BookId == x.BookId))
            .ExecuteDeleteAsync(cancellationToken);

        if (removedPosts > 0 || removedBooks > 0)
        {
            logger.LogInformation("Seen cleanup removed {PostCount} post rows and {BookCount} book rows", removedPosts, removedBooks);
        }
    }
}

