using SchoolAdmission.Api.DTOs;

namespace SchoolAdmission.Api.Services;

public interface IAdmissionService
{
    Task<int> ExpireOverdueHoldsAsync(CancellationToken ct = default);
    Task<ServiceResult<CreateClassResponseDto>> CreateClassAsync(CreateClassRequestDto request, CancellationToken ct = default);
    Task<List<ClassSeatStatusDto>> GetAllClassesAsync(CancellationToken ct = default);
    Task<ServiceResult<ClassSeatStatusDto>> GetClassByIdAsync(string classId, CancellationToken ct = default);
    Task<ServiceResult<CreateHoldResponseDto>> CreateHoldAsync(string classId, string studentId, CancellationToken ct = default);
    Task<ServiceResult<HoldDetailsResponseDto>> GetHoldByIdAsync(string holdId, string? studentIdHeader, CancellationToken ct = default);
    Task<ServiceResult<ConfirmHoldResponseDto>> ConfirmHoldAsync(string holdId, string studentId, CancellationToken ct = default);
    Task<ServiceResult<bool>> CancelHoldAsync(string holdId, string studentId, CancellationToken ct = default);
    Task<ServiceResult<List<StudentHoldItemDto>>> GetStudentHoldsAsync(string studentId, CancellationToken ct = default);
    Task<AdminOverviewDto> GetAdminOverviewAsync(CancellationToken ct = default);
    Task<List<HoldDetailsResponseDto>> GetAdminHoldsAsync(string? statusFilter, CancellationToken ct = default);
}
