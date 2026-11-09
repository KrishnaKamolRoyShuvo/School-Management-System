using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SchoolAdmission.Api.Data;

namespace SchoolAdmission.Tests;

/// <summary>
/// Custom <see cref="WebApplicationFactory{TEntryPoint}"/> for running integration and concurrency tests
/// against a dedicated PostgreSQL test database (<c>school_admission_test</c>).
/// </summary>
public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _connectionString;

    /// <summary>
    /// Initializes a new instance of <see cref="TestWebApplicationFactory"/> using <c>TEST_DATABASE_URL</c> or local defaults.
    /// </summary>
    public TestWebApplicationFactory()
    {
        _connectionString = Environment.GetEnvironmentVariable("TEST_DATABASE_URL")
            ?? "Host=localhost;Port=5432;Database=school_admission_test;Username=postgres;Password=postgres;Include Error Detail=true";
    }

    /// <summary>
    /// Overrides the host configuration to use the <c>Testing</c> environment and connects <see cref="AdmissionDbContext"/>
    /// to the isolated PostgreSQL test database.
    /// </summary>
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = _connectionString,
                ["HOLD_DURATION_SECONDS"] = "600",
            });
        });

        builder.ConfigureServices(services =>
        {
            // Remove existing AdmissionDbContext descriptor
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AdmissionDbContext>));
            if (descriptor != null)
            {
                services.Remove(descriptor);
            }

            // Register DbContext pointing to test database
            services.AddDbContext<AdmissionDbContext>(options =>
            {
                options.UseNpgsql(_connectionString);
            });

            // Ensure schema is created
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
            db.Database.EnsureCreated();
        });
    }

    /// <summary>
    /// Truncates both <c>admission_holds</c> and <c>classes</c> tables between tests to guarantee deterministic test isolation.
    /// </summary>
    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
        await db.Database.ExecuteSqlRawAsync("TRUNCATE TABLE admission_holds, classes CASCADE;");
    }
}
