using System.Text.Json.Serialization;

namespace SchoolAdmission.Api.DTOs;

public record CreateClassRequestDto(
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("shift")] string? Shift,
    [property: JsonPropertyName("totalSeats")] int TotalSeats,
    [property: JsonPropertyName("availableSeats")] int? AvailableSeats = null
);

public record CreateClassResponseDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("shift")] string Shift,
    [property: JsonPropertyName("totalSeats")] int TotalSeats
);

public record ClassSeatStatusDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("shift")] string Shift,
    [property: JsonPropertyName("totalSeats")] int TotalSeats,
    [property: JsonPropertyName("heldSeats")] int HeldSeats,
    [property: JsonPropertyName("confirmedSeats")] int ConfirmedSeats,
    [property: JsonPropertyName("availableSeats")] int AvailableSeats
);

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

public record ConfirmHoldResponseDto(
    [property: JsonPropertyName("holdId")] string HoldId,
    [property: JsonPropertyName("status")] string Status
);

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

public record ApiErrorResponseDto(
    [property: JsonPropertyName("code")] string Code,
    [property: JsonPropertyName("message")] string Message,
    [property: JsonPropertyName("existingHoldId")][property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? ExistingHoldId = null,
    [property: JsonPropertyName("existingClassId")][property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? ExistingClassId = null,
    [property: JsonPropertyName("existingClassName")][property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? ExistingClassName = null,
    [property: JsonPropertyName("existingShift")][property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? ExistingShift = null,
    [property: JsonPropertyName("existingStatus")][property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? ExistingStatus = null
);
