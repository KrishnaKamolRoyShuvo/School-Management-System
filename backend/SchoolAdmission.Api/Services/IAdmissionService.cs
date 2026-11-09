using SchoolAdmission.Api.DTOs;

namespace SchoolAdmission.Api.Services;

/// <summary>
/// Defines the core domain contract for managing classes, seat holds, confirmations, cancellations,
/// automatic hold expiration, and administrative reporting.
/// </summary>
public interface IAdmissionService
{
    /// <summary>
    /// Scans all currently <c>HELD</c> applications whose <c>ExpiresAt</c> timestamp has passed
    /// and transitions them to <c>EXPIRED</c>, releasing their seats back to the available pool.
    /// </summary>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>The number of overdue holds transitioned to <c>EXPIRED</c>.</returns>
    Task<int> ExpireOverdueHoldsAsync(CancellationToken ct = default);

    /// <summary>
    /// Creates a new academic class with the specified name, shift, and seat capacity.
    /// </summary>
    Task<ServiceResult<CreateClassResponseDto>> CreateClassAsync(CreateClassRequestDto request, CancellationToken ct = default);

    /// <summary>
    /// Retrieves all classes ordered by name and shift with real-time available, held, and confirmed seat counts.
    /// </summary>
    Task<List<ClassSeatStatusDto>> GetAllClassesAsync(CancellationToken ct = default);

    /// <summary>
    /// Retrieves real-time seat inventory for a single class by its unique ID.
    /// </summary>
    Task<ServiceResult<ClassSeatStatusDto>> GetClassByIdAsync(string classId, CancellationToken ct = default);

    /// <summary>
    /// Atomically reserves a seat in the specified class for the given 17-digit student ID,
    /// enforcing both class capacity invariants and the Global One-Application Rule across all backend instances.
    /// </summary>
    Task<ServiceResult<CreateHoldResponseDto>> CreateHoldAsync(string classId, string studentId, CancellationToken ct = default);

    /// <summary>
    /// Retrieves details for a specific hold, enforcing ownership verification if <paramref name="studentIdHeader"/> is provided.
    /// </summary>
    Task<ServiceResult<HoldDetailsResponseDto>> GetHoldByIdAsync(string holdId, string? studentIdHeader, CancellationToken ct = default);

    /// <summary>
    /// Idempotently confirms an active, unexpired seat hold for the owning student.
    /// </summary>
    Task<ServiceResult<ConfirmHoldResponseDto>> ConfirmHoldAsync(string holdId, string studentId, CancellationToken ct = default);

    /// <summary>
    /// Cancels an active, unexpired seat hold for the owning student and immediately releases the seat.
    /// </summary>
    Task<ServiceResult<bool>> CancelHoldAsync(string holdId, string studentId, CancellationToken ct = default);

    /// <summary>
    /// Retrieves all applications for a specific student, applying the Section 4.8 visibility rule
    /// (hiding prior <c>EXPIRED</c> records once the student has a <c>CONFIRMED</c> admission).
    /// </summary>
    Task<ServiceResult<List<StudentHoldItemDto>>> GetStudentHoldsAsync(string studentId, CancellationToken ct = default);

    /// <summary>
    /// Computes aggregate school-wide seat and application metrics for the Admin Portal overview cards.
    /// </summary>
    Task<AdminOverviewDto> GetAdminOverviewAsync(CancellationToken ct = default);

    /// <summary>
    /// Retrieves all applications across the school for the Admin Portal table, applying the Section 4.8 visibility rule
    /// and optional status filtering.
    /// </summary>
    Task<List<HoldDetailsResponseDto>> GetAdminHoldsAsync(string? statusFilter, CancellationToken ct = default);
}
