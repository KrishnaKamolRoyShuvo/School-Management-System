using SchoolAdmission.Api.Services;

namespace SchoolAdmission.Api.BackgroundServices;

public class HoldExpirationBackgroundService(
    IServiceScopeFactory scopeFactory,
    ILogger<HoldExpirationBackgroundService> logger) : BackgroundService
{
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
