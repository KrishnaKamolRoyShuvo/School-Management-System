using System.Text.Json.Serialization;

namespace SchoolAdmission.Api.DTOs;

/// <summary>
/// Request payload for creating a new school class via <c>POST /classes</c>.
/// </summary>
/// <param name="Name">The display name of the class (e.g., "Class 6 - Morning").</param>
/// <param name="Shift">Optional shift name ("Morning" or "Day"). Defaults to "Morning" when omitted.</param>
/// <param name="TotalSeats">Total seat capacity for the class (must be between 1 and 120).</param>
/// <param name="AvailableSeats">Optional initial available seats (0 to TotalSeats). If lower than TotalSeats, pre-fills confirmed seats.</param>
public record CreateClassRequestDto(
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("shift")] string? Shift,
    [property: JsonPropertyName("totalSeats")] int TotalSeats,
    [property: JsonPropertyName("availableSeats")] int? AvailableSeats = null
);

/// <summary>
/// Response payload returned after successfully creating a class via <c>POST /classes</c>.
/// </summary>
public record CreateClassResponseDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("shift")] string Shift,
    [property: JsonPropertyName("totalSeats")] int TotalSeats
);

/// <summary>
/// Represents real-time seat inventory and capacity breakdown for a class (<c>GET /classes</c> and <c>GET /classes/{classId}</c>).
/// </summary>
/// <remarks>
/// Guaranteed invariant: <c>HeldSeats + ConfirmedSeats + AvailableSeats == TotalSeats</c> and <c>AvailableSeats &gt;= 0</c>.
/// </remarks>
public record ClassSeatStatusDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("shift")] string Shift,
    [property: JsonPropertyName("totalSeats")] int TotalSeats,
    [property: JsonPropertyName("heldSeats")] int HeldSeats,
    [property: JsonPropertyName("confirmedSeats")] int ConfirmedSeats,
    [property: JsonPropertyName("availableSeats")] int AvailableSeats
);

/// <summary>
/// Response payload returned when a seat hold is newly created (<c>POST /classes/{classId}/holds</c>).
/// </summary>
public record CreateHoldResponseDto(
    [property: JsonPropertyName("holdId")] string HoldId,
    [property: JsonPropertyName("classId")] string ClassId,
    [property: JsonPropertyName("className")] string ClassName,
    [property: JsonPropertyName("shift")] string Shift,
    [property: JsonPropertyName("studentId")] string StudentId,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("expiresAt")] DateTime ExpiresAt,
    [property: JsonPropertyName("createdAt")] DateTime CreatedAt
);

/// <summary>
/// Detailed representation of a seat hold or application (<c>GET /holds/{holdId}</c> and <c>GET /admin/holds</c>).
/// </summary>
public record HoldDetailsResponseDto(
    [property: JsonPropertyName("holdId")] string HoldId,
    [property: JsonPropertyName("classId")] string ClassId,
    [property: JsonPropertyName("className")] string ClassName,
    [property: JsonPropertyName("shift")] string Shift,
    [property: JsonPropertyName("studentId")] string StudentId,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("expiresAt")] DateTime ExpiresAt,
    [property: JsonPropertyName("createdAt")] DateTime CreatedAt,
    [property: JsonPropertyName("confirmedAt")] DateTime? ConfirmedAt,
    [property: JsonPropertyName("cancelledAt")] DateTime? CancelledAt
);

/// <summary>
/// Response payload returned when a hold is confirmed (<c>POST /holds/{holdId}/confirm</c>).
/// </summary>
public record ConfirmHoldResponseDto(
    [property: JsonPropertyName("holdId")] string HoldId,
    [property: JsonPropertyName("status")] string Status
);

/// <summary>
/// Represents a single application entry in a student's personal application history (<c>GET /me/holds</c>).
/// </summary>
public record StudentHoldItemDto(
    [property: JsonPropertyName("holdId")] string HoldId,
    [property: JsonPropertyName("classId")] string ClassId,
    [property: JsonPropertyName("className")] string ClassName,
    [property: JsonPropertyName("shift")] string Shift,
    [property: JsonPropertyName("studentId")] string StudentId,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("expiresAt")] DateTime ExpiresAt,
    [property: JsonPropertyName("createdAt")] DateTime CreatedAt,
    [property: JsonPropertyName("confirmedAt")] DateTime? ConfirmedAt,
    [property: JsonPropertyName("cancelledAt")] DateTime? CancelledAt
);

/// <summary>
/// Aggregate school-wide seat and application metrics for the Admin Portal dashboard (<c>GET /admin/overview</c>).
/// </summary>
public record AdminOverviewDto(
    [property: JsonPropertyName("totalClasses")] int TotalClasses,
    [property: JsonPropertyName("totalSeats")] int TotalSeats,
    [property: JsonPropertyName("totalAvailableSeats")] int TotalAvailableSeats,
    [property: JsonPropertyName("totalHeldSeats")] int TotalHeldSeats,
    [property: JsonPropertyName("totalConfirmedSeats")] int TotalConfirmedSeats,
    [property: JsonPropertyName("totalActiveApplications")] int TotalActiveApplications,
    [property: JsonPropertyName("totalExpiredApplications")] int TotalExpiredApplications,
    [property: JsonPropertyName("totalCancelledApplications")] int TotalCancelledApplications
);

/// <summary>
/// Standardized error payload returned by the API for 4xx/5xx responses.
/// Includes optional redirect metadata when a student already holds an active or confirmed application.
/// </summary>
public record ApiErrorResponseDto(
    [property: JsonPropertyName("code")] string Code,
    [property: JsonPropertyName("message")] string Message,
    [property: JsonPropertyName("existingHoldId")][property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? ExistingHoldId = null,
    [property: JsonPropertyName("existingClassId")][property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? ExistingClassId = null,
    [property: JsonPropertyName("existingClassName")][property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? ExistingClassName = null,
    [property: JsonPropertyName("existingShift")][property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? ExistingShift = null,
    [property: JsonPropertyName("existingStatus")][property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? ExistingStatus = null
);
