using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.DTOs;
using SchoolAdmission.Api.Services;

namespace SchoolAdmission.Api.Controllers;

/// <summary>
/// REST controller for managing academic classes, querying real-time seat inventory,
/// and creating temporary seat holds (<c>/classes</c>).
/// </summary>
[ApiController]
[Route("classes")]
public class ClassesController(IAdmissionService admissionService) : ControllerBase
{
    /// <summary>
    /// Creates a new academic class with a name, shift, and total seat capacity (<c>POST /classes</c>).
    /// </summary>
    /// <param name="request">Class creation payload.</param>
    /// <param name="ct">Request cancellation token.</param>
    /// <returns>201 Created with the created class details, 400 Bad Request on validation failure, or 409 Conflict if duplicate.</returns>
    [HttpPost]
    [ProducesResponseType(typeof(CreateClassResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiErrorResponseDto), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateClass([FromBody] CreateClassRequestDto request, CancellationToken ct)
    {
        var result = await admissionService.CreateClassAsync(request, ct);
        if (!result.IsSuccess)
        {
            return StatusCode(result.StatusCode, result.Error);
        }

        return StatusCode(StatusCodes.Status201Created, result.Data);
    }

    /// <summary>
    /// Lists all classes with their real-time <c>totalSeats</c>, <c>heldSeats</c>, <c>confirmedSeats</c>, and <c>availableSeats</c> (<c>GET /classes</c>).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<ClassSeatStatusDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllClasses(CancellationToken ct)
    {
        var classes = await admissionService.GetAllClassesAsync(ct);
        return Ok(classes);
    }

    /// <summary>
    /// Retrieves real-time seat inventory for a specific class by ID (<c>GET /classes/{classId}</c>).
    /// </summary>
    [HttpGet("{classId}")]
    [ProducesResponseType(typeof(ClassSeatStatusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponseDto), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetClassById(string classId, CancellationToken ct)
    {
        var result = await admissionService.GetClassByIdAsync(classId, ct);
        if (!result.IsSuccess)
        {
            return StatusCode(result.StatusCode, result.Error);
        }

        return Ok(result.Data);
    }

    /// <summary>
    /// Places a temporary seat hold in the specified class for the student identified by the <c>X-Student-Id</c> header (<c>POST /classes/{classId}/holds</c>).
    /// </summary>
    /// <param name="classId">Target class identifier.</param>
    /// <param name="ct">Request cancellation token.</param>
    /// <returns>
    /// 201 Created with hold details and expiry timestamp;
    /// 400 Bad Request if <c>X-Student-Id</c> is not a 17-digit number;
    /// 404 Not Found if the class does not exist;
    /// 409 Conflict if no seats are available or the student already has an active/confirmed application.
    /// </returns>
    [HttpPost("{classId}/holds")]
    [ProducesResponseType(typeof(CreateHoldResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiErrorResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiErrorResponseDto), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateHold(string classId, CancellationToken ct)
    {
        var studentId = Request.Headers["X-Student-Id"].ToString();
        var result = await admissionService.CreateHoldAsync(classId, studentId, ct);
        if (!result.IsSuccess)
        {
            return StatusCode(result.StatusCode, result.Error);
        }

        return StatusCode(StatusCodes.Status201Created, result.Data);
    }
}
