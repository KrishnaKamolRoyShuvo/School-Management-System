using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.DTOs;
using SchoolAdmission.Api.Services;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("classes")]
public class ClassesController(IAdmissionService admissionService) : ControllerBase
{
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

    [HttpGet]
    [ProducesResponseType(typeof(List<ClassSeatStatusDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllClasses(CancellationToken ct)
    {
        var classes = await admissionService.GetAllClassesAsync(ct);
        return Ok(classes);
    }

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
