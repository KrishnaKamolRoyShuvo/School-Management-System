using SchoolAdmission.Api.DTOs;

namespace SchoolAdmission.Api.Services;

public record ServiceResult<T>(
    bool IsSuccess,
    int StatusCode,
    T? Data = default,
    ApiErrorResponseDto? Error = null
)
{
    public static ServiceResult<T> Success(T data, int statusCode = 200) =>
        new(true, statusCode, data, null);

    public static ServiceResult<T> Failure(
        int statusCode,
        string code,
        string message,
        string? existingHoldId = null,
        string? existingClassId = null,
        string? existingClassName = null,
        string? existingShift = null,
        string? existingStatus = null) =>
        new(false, statusCode, default, new ApiErrorResponseDto(code, message, existingHoldId, existingClassId, existingClassName, existingShift, existingStatus));
}
