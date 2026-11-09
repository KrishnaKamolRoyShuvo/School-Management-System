using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.DTOs;
using SchoolAdmission.Api.Services;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
public class HoldsController(IAdmissionService admissionService) : ControllerBase
{
    [HttpGet("holds/{holdId}")]
    [ProducesResponseType(typeof(HoldDetailsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiErrorResponseDto), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ApiErrorResponseDto), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetHoldById(string holdId, CancellationToken ct)
    {
        string? studentIdHeader = Request.Headers.TryGetValue("X-Student-Id", out var hVal) && !string.IsNullOrWhiteSpace(hVal)
            ? hVal.ToString()
            : null;

        var result = await admissionService.GetHoldByIdAsync(holdId, studentIdHeader, ct);
        if (!result.IsSuccess)
        {
            return StatusCode(result.StatusCode, result.Error);
        }

        return Ok(result.Data);
    }

    [HttpPost("holds/{holdId}/confirm")]
    [ProducesResponseType(typeof(ConfirmHoldResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiErrorResponseDto), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ApiErrorResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiErrorResponseDto), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ConfirmHold(string holdId, CancellationToken ct)
    {
        var studentId = Request.Headers["X-Student-Id"].ToString();
        var result = await admissionService.ConfirmHoldAsync(holdId, studentId, ct);
        if (!result.IsSuccess)
        {
            return StatusCode(result.StatusCode, result.Error);
        }

        return Ok(result.Data);
    }

    [HttpDelete("holds/{holdId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiErrorResponseDto), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ApiErrorResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiErrorResponseDto), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CancelHold(string holdId, CancellationToken ct)
    {
        var studentId = Request.Headers["X-Student-Id"].ToString();
        var result = await admissionService.CancelHoldAsync(holdId, studentId, ct);
        if (!result.IsSuccess)
        {
            return StatusCode(result.StatusCode, result.Error);
        }

        return NoContent();
    }

    [HttpGet("me/holds")]
    [ProducesResponseType(typeof(List<StudentHoldItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetMyHolds(CancellationToken ct)
    {
        var studentId = Request.Headers["X-Student-Id"].ToString();
        var result = await admissionService.GetStudentHoldsAsync(studentId, ct);
        if (!result.IsSuccess)
        {
            return StatusCode(result.StatusCode, result.Error);
        }

        return Ok(result.Data);
    }
}
