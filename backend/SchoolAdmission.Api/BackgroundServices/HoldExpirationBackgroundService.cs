using SchoolAdmission.Api.Services;

namespace SchoolAdmission.Api.BackgroundServices;

/// <summary>
/// Hosted background worker that periodically sweeps the database every 2 seconds
/// to transition overdue <c>HELD</c> applications (<c>ExpiresAt &lt;= UtcNow</c>) to <c>EXPIRED</c>.
/// </summary>
/// <remarks>
/// Works in tandem with inline lazy expiration inside <see cref="AdmissionService"/> so seats are
/// released both proactively in the background and immediately on read/write operations.
/// </remarks>
public class HoldExpirationBackgroundService(
    IServiceScopeFactory scopeFactory,
    ILogger<HoldExpirationBackgroundService> logger) : BackgroundService
{
    /// <summary>
    /// Executes the periodic 2-second timer loop until application shutdown.
    /// </summary>
    /// <param name="stoppingToken">Triggered when the host is performing a graceful shutdown.</param>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(2));
        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var admissionService = scope.ServiceProvider.GetRequiredService<IAdmissionService>();
                var expiredCount = await admissionService.ExpireOverdueHoldsAsync(stoppingToken);
                if (expiredCount > 0)
                {
                    logger.LogInformation("Automatically expired {Count} overdue seat holds.", expiredCount);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error occurred while expiring overdue seat holds.");
            }
        }
    }
}
