using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.DTOs;
using SchoolAdmission.Api.Services;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("admin")]
public class AdminController(IAdmissionService admissionService) : ControllerBase
{
    [HttpGet("overview")]
    [ProducesResponseType(typeof(AdminOverviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOverview(CancellationToken ct)
    {
        var overview = await admissionService.GetAdminOverviewAsync(ct);
        return Ok(overview);
    }

    [HttpGet("holds")]
    [ProducesResponseType(typeof(List<HoldDetailsResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAdminHolds([FromQuery] string? status, CancellationToken ct)
    {
        var holds = await admissionService.GetAdminHoldsAsync(status, ct);
        return Ok(holds);
    }
}
