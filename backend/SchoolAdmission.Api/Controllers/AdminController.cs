using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.DTOs;
using SchoolAdmission.Api.Services;

namespace SchoolAdmission.Api.Controllers;

/// <summary>
/// REST controller providing school-wide aggregate statistics and application listings for the Admin Portal (<c>/admin</c>).
/// </summary>
[ApiController]
[Route("admin")]
public class AdminController(IAdmissionService admissionService) : ControllerBase
{
    /// <summary>
    /// Returns aggregate capacity, hold, confirmation, expiration, and cancellation metrics across all classes (<c>GET /admin/overview</c>).
    /// </summary>
    [HttpGet("overview")]
    [ProducesResponseType(typeof(AdminOverviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOverview(CancellationToken ct)
    {
        var overview = await admissionService.GetAdminOverviewAsync(ct);
        return Ok(overview);
    }

    /// <summary>
    /// Lists all student applications across the school for the Admin Portal table, optionally filtered by status (<c>GET /admin/holds</c>).
    /// </summary>
    /// <param name="status">Optional status filter (<c>HELD</c>, <c>CONFIRMED</c>, <c>EXPIRED</c>, or <c>CANCELLED</c>).</param>
    /// <param name="ct">Request cancellation token.</param>
    [HttpGet("holds")]
    [ProducesResponseType(typeof(List<HoldDetailsResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAdminHolds([FromQuery] string? status, CancellationToken ct)
    {
        var holds = await admissionService.GetAdminHoldsAsync(status, ct);
        return Ok(holds);
    }
}
