using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.DTOs;
using SchoolAdmission.Api.Services;

namespace SchoolAdmission.Api.Controllers;

/// <summary>
/// REST controller for querying, confirming, and cancelling student seat holds (<c>/holds</c> and <c>/me/holds</c>).
/// </summary>
[ApiController]
public class HoldsController(IAdmissionService admissionService) : ControllerBase
{
    /// <summary>
    /// Retrieves full status and timestamp details for a specific seat hold (<c>GET /holds/{holdId}</c>).
    /// </summary>
    /// <remarks>
    /// If the <c>X-Student-Id</c> header is supplied, verifies that the hold belongs to that student (returning 403 Forbidden on mismatch).
    /// </remarks>
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

    /// <summary>
    /// Permanently confirms an active seat hold for the student specified in <c>X-Student-Id</c> (<c>POST /holds/{holdId}/confirm</c>).
    /// </summary>
    /// <remarks>
    /// This endpoint is idempotent: confirming an already-<c>CONFIRMED</c> hold owned by the same student returns 200 OK without double-counting seats.
    /// </remarks>
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

    /// <summary>
    /// Cancels an active <c>HELD</c> application for the student specified in <c>X-Student-Id</c> and immediately releases the seat (<c>DELETE /holds/{holdId}</c>).
    /// </summary>
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

    /// <summary>
    /// Lists all applications belonging to the student specified in <c>X-Student-Id</c> (<c>GET /me/holds</c>).
    /// </summary>
    /// <remarks>
    /// Applies the Section 4.8 visibility rule: if the student has a <c>CONFIRMED</c> admission, prior <c>EXPIRED</c> records are filtered out of the response.
    /// </remarks>
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
