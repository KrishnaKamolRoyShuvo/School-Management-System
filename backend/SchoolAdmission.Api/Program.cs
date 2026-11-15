using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.BackgroundServices;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Services;

// ============================================================================
// Application Entry Point & Dependency Injection Configuration
// Configures controllers, PostgreSQL database context, background workers,
// CORS policies, and automatic schema initialization on startup.
// ============================================================================

LoadDotEnv();

var builder = WebApplication.CreateBuilder(args);

// Register REST API controllers and OpenAPI specification support
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// Resolve PostgreSQL connection string from DATABASE_URL or appsettings.json
var connectionString = GetPostgresConnectionString(builder.Configuration);

builder.Services.AddDbContext<AdmissionDbContext>(options =>
{
    options.UseNpgsql(connectionString);
});

// Register core domain services and background expiration worker
builder.Services.AddScoped<IAdmissionService, AdmissionService>();
builder.Services.AddHostedService<HoldExpirationBackgroundService>();

// Configure permissive CORS for local development and containerized frontend access
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Automatically verify and create the PostgreSQL schema on startup with retry logic
// (Skipped in "Testing" environment where TestWebApplicationFactory manages schema lifecycle)
if (app.Environment.EnvironmentName != "Testing")
{
    using var scope = app.Services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var db = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();

    const int maxRetries = 10;
    for (int retry = 1; retry <= maxRetries; retry++)
    {
        try
        {
            logger.LogInformation("Attempting database schema verification/creation (Attempt {Attempt}/{MaxRetries})...", retry, maxRetries);
            await db.Database.EnsureCreatedAsync();
            logger.LogInformation("Database schema verified and ready.");
            break;
        }
        catch (Exception ex) when (retry < maxRetries)
        {
            logger.LogWarning(ex, "Database connection attempt {Attempt} failed. Retrying in 2 seconds...", retry);
            await Task.Delay(2000);
        }
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.MapControllers();

// Root endpoint: returns API directory and service health
app.MapGet("/", () => Results.Ok(new
{
    service = "Onnorokom Ideal School Admission API",
    status = "Online",
    version = "1.0",
    description = "REST API for Onnorokom Ideal School Admission System. Student identity is provided via X-Student-Id header.",
    endpoints = new Dictionary<string, string>
    {
        ["GET /classes"] = "List all classes with seat quota and availability",
        ["GET /classes/{id}"] = "Get seat status for a specific class",
        ["POST /classes"] = "Create a new class (Admin)",
        ["POST /classes/{id}/holds"] = "Place a 10-minute temporary seat hold (Requires X-Student-Id header)",
        ["GET /holds/{id}"] = "Get details of an application hold",
        ["POST /holds/{id}/confirm"] = "Confirm admission fee payment (Requires X-Student-Id header)",
        ["DELETE /holds/{id}"] = "Cancel an active seat reservation (Requires X-Student-Id header)",
        ["GET /me/holds"] = "List application history for a student (Requires X-Student-Id header)",
        ["GET /admin/overview"] = "Aggregate school-wide admission metrics",
        ["GET /admin/holds"] = "Full audit log of student holds (supports ?status= filter)"
    },
    portals = new
    {
        studentPortal = "http://localhost:5173",
        adminPortal = "http://localhost:5173/admin"
    }
}));

app.Run();

/// <summary>
/// Resolves a valid Npgsql connection string from either the <c>DATABASE_URL</c> environment variable
/// (supporting <c>postgres://</c> URI format) or <c>ConnectionStrings:DefaultConnection</c>.
/// Automatically configures SSL Mode when connecting to cloud-hosted databases such as Neon.
/// </summary>
/// <param name="configuration">The application configuration provider.</param>
/// <returns>A formatted Npgsql key-value connection string.</returns>
static string GetPostgresConnectionString(IConfiguration configuration)
{
    var rawUrl = Environment.GetEnvironmentVariable("DATABASE_URL")
                 ?? Environment.GetEnvironmentVariable("DATABASE_URL_UNPOOLED")
                 ?? configuration.GetConnectionString("DefaultConnection");

    if (string.IsNullOrWhiteSpace(rawUrl))
    {
        return "Host=localhost;Port=5432;Database=school_admission;Username=postgres;Password=postgres";
    }

    if (rawUrl.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
        rawUrl.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        try
        {
            var uri = new Uri(rawUrl);
            var userInfo = uri.UserInfo.Split(':');
            var user = Uri.UnescapeDataString(userInfo[0]);
            var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
            var host = uri.Host;
            var port = uri.Port > 0 ? uri.Port : 5432;
            var database = uri.AbsolutePath.TrimStart('/');

            var sslRequired = uri.Query.Contains("sslmode=require", StringComparison.OrdinalIgnoreCase)
                              || host.EndsWith("neon.tech", StringComparison.OrdinalIgnoreCase);

            var sslPart = sslRequired ? ";SSL Mode=Require;Trust Server Certificate=true" : "";

            return $"Host={host};Port={port};Database={database};Username={user};Password={password};Include Error Detail=true{sslPart}";
        }
        catch
        {
            // Fall back to rawUrl if parsing as Uri fails
            return rawUrl;
        }
    }

    return rawUrl;
}

/// <summary>
/// Searches the working directory and parent directories for a <c>.env.local</c> or <c>.env</c> file
/// and populates environment variables that have not already been defined.
/// </summary>
static void LoadDotEnv()
{
    var current = new DirectoryInfo(Directory.GetCurrentDirectory());
    while (current != null)
    {
        var localEnv = Path.Combine(current.FullName, ".env.local");
        var baseEnv = Path.Combine(current.FullName, ".env");

        var targetFile = File.Exists(localEnv) ? localEnv : (File.Exists(baseEnv) ? baseEnv : null);
        if (targetFile != null)
        {
            foreach (var line in File.ReadAllLines(targetFile))
            {
                var trimmed = line.Trim();
                if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith("#")) continue;
                var eqIdx = trimmed.IndexOf('=');
                if (eqIdx <= 0) continue;

                var key = trimmed[..eqIdx].Trim();
                var val = trimmed[(eqIdx + 1)..].Trim().Trim('"', '\'');

                if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
                {
                    Environment.SetEnvironmentVariable(key, val);
                }
            }
            break;
        }

        current = current.Parent;
    }
}

/// <summary>
/// Partial Program class exposed to enable <c>WebApplicationFactory&lt;Program&gt;</c> in xUnit integration tests.
/// </summary>
public partial class Program { }
