using SchoolAdmission.Api.DTOs;

namespace SchoolAdmission.Api.Services;

/// <summary>
/// Encapsulates the outcome of a domain service operation, carrying either a typed success payload
/// or an HTTP status code with a structured <see cref="ApiErrorResponseDto"/>.
/// </summary>
/// <typeparam name="T">The type of the data payload returned on success.</typeparam>
public record ServiceResult<T>(
    bool IsSuccess,
    int StatusCode,
    T? Data = default,
    ApiErrorResponseDto? Error = null
)
{
    /// <summary>
    /// Creates a successful <see cref="ServiceResult{T}"/> with the specified data and HTTP status code.
    /// </summary>
    /// <param name="data">The result payload.</param>
    /// <param name="statusCode">HTTP status code (defaults to 200 OK).</param>
    public static ServiceResult<T> Success(T data, int statusCode = 200) =>
        new(true, statusCode, data, null);

    /// <summary>
    /// Creates a failed <see cref="ServiceResult{T}"/> with a structured error code, human-readable message,
    /// and optional existing-application metadata for 409 conflict redirects.
    /// </summary>
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
