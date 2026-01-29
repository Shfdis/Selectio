using auth.Data;
using Microsoft.EntityFrameworkCore;

namespace auth.Services;

public class PendingEmailCleanupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<PendingEmailCleanupService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromHours(1); // Check every hour

    public PendingEmailCleanupService(
        IServiceProvider serviceProvider,
        ILogger<PendingEmailCleanupService> logger
    )
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupOldPendingEmails(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while cleaning up old pending emails");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }
    }

    private async Task CleanupOldPendingEmails(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<UserDbContext>();

        var cutoffDate = DateTime.UtcNow.AddDays(-1);
        var oldPendingEmails = await dbContext.PendingEmails
            .Where(p => p.Timestamp < cutoffDate)
            .ToListAsync(cancellationToken);

        if (oldPendingEmails.Any())
        {
            dbContext.PendingEmails.RemoveRange(oldPendingEmails);
            var deletedCount = await dbContext.SaveChangesAsync(cancellationToken);
            _logger.LogInformation(
                "Deleted {Count} pending email(s) older than 1 day",
                deletedCount
            );
        }
    }
}
