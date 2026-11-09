using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.DTOs;
using SchoolAdmission.Api.Entities;

namespace SchoolAdmission.Api.Services;

public class AdmissionService : IAdmissionService
{
    private readonly AdmissionDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AdmissionService> _logger;

    public AdmissionService(
        AdmissionDbContext db,
        IConfiguration configuration,
        ILogger<AdmissionService> logger)
    {
        _db = db;
        _configuration = configuration;
        _logger = logger;
    }

    private int GetHoldDurationSeconds()
    {
        if (int.TryParse(_configuration["HOLD_DURATION_SECONDS"], out var seconds) && seconds > 0)
        {
            return seconds;
        }
        return 600; // 10 minutes default
    }

    private static bool IsValidStudentId(string? studentId)
    {
        return !string.IsNullOrWhiteSpace(studentId) &&
               studentId.Trim().Length == 17 &&
               studentId.Trim().All(char.IsDigit);
    }

    public async Task<int> ExpireOverdueHoldsAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        try
        {
            var expiredHolds = await _db.Holds
                .Where(h => h.Status == HoldStatus.Held && h.ExpiresAt <= now)
                .ToListAsync(ct);

            if (expiredHolds.Count == 0) return 0;

            foreach (var hold in expiredHolds)
            {
                hold.Status = HoldStatus.Expired;
            }

            await _db.SaveChangesAsync(ct);
            return expiredHolds.Count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while expiring overdue holds.");
            return 0;
        }
    }

    public async Task<ServiceResult<CreateClassResponseDto>> CreateClassAsync(CreateClassRequestDto request, CancellationToken ct = default)
    {
        var name = (request.Name ?? "").Trim();
        var shift = string.IsNullOrWhiteSpace(request.Shift) ? "Morning" : request.Shift.Trim();
        var totalSeats = request.TotalSeats;

        if (string.IsNullOrWhiteSpace(name))
        {
            return ServiceResult<CreateClassResponseDto>.Failure(400, "VALIDATION_ERROR", "Class name is required.");
        }

        if (totalSeats is < 1 or > 120)
        {
            return ServiceResult<CreateClassResponseDto>.Failure(400, "VALIDATION_ERROR", "Total seats must be between 1 and 120.");
        }

        var availableSeats = request.AvailableSeats ?? totalSeats;
        if (availableSeats < 0 || availableSeats > totalSeats)
        {
            return ServiceResult<CreateClassResponseDto>.Failure(400, "VALIDATION_ERROR", $"Available seats must be between 0 and {totalSeats}.");
        }

        var existing = await _db.Classes
            .AnyAsync(c => c.Name.ToLower() == name.ToLower() && c.Shift.ToLower() == shift.ToLower(), ct);

        if (existing)
        {
            return ServiceResult<CreateClassResponseDto>.Failure(409, "DUPLICATE_CLASS", "A class with this name and shift already exists.");
        }

        var now = DateTime.UtcNow;
        var schoolClass = new SchoolClass
        {
            Id = Guid.NewGuid(),
            Name = name,
            Shift = shift,
            TotalSeats = totalSeats,
            CreatedAt = now
        };

        _db.Classes.Add(schoolClass);

        // Pre-fill confirmed seats if availableSeats was set lower than totalSeats by admin
        var preOccupiedCount = totalSeats - availableSeats;
        for (var i = 1; i <= preOccupiedCount; i++)
        {
            var randSuffix = Random.Shared.Next(1000000, 9999999).ToString("D7");
            var preHold = new AdmissionHold
            {
                Id = Guid.NewGuid(),
                ClassId = schoolClass.Id,
                StudentId = $"2010000000{randSuffix}".PadRight(17, '0')[..17],
                Status = HoldStatus.Confirmed,
                CreatedAt = now.AddMinutes(-5),
                ExpiresAt = now.AddMinutes(5),
                ConfirmedAt = now.AddMinutes(-5),
                CancelledAt = null
            };
            _db.Holds.Add(preHold);
        }

        await _db.SaveChangesAsync(ct);

        var response = new CreateClassResponseDto(
            schoolClass.Id.ToString(),
            schoolClass.Name,
            schoolClass.Shift,
            schoolClass.TotalSeats
        );

        return ServiceResult<CreateClassResponseDto>.Success(response, 201);
    }

    public async Task<List<ClassSeatStatusDto>> GetAllClassesAsync(CancellationToken ct = default)
    {
        await ExpireOverdueHoldsAsync(ct);
        var now = DateTime.UtcNow;

        var classes = await _db.Classes
            .OrderBy(c => c.Name)
            .ThenBy(c => c.Shift)
            .ToListAsync(ct);

        var result = new List<ClassSeatStatusDto>();

        foreach (var c in classes)
        {
            var heldSeats = await _db.Holds.CountAsync(
                h => h.ClassId == c.Id && h.Status == HoldStatus.Held && h.ExpiresAt > now, ct);

            var confirmedSeats = await _db.Holds.CountAsync(
                h => h.ClassId == c.Id && h.Status == HoldStatus.Confirmed, ct);

            var availableSeats = Math.Max(0, c.TotalSeats - heldSeats - confirmedSeats);

            result.Add(new ClassSeatStatusDto(
                c.Id.ToString(),
                c.Name,
                c.Shift,
                c.TotalSeats,
                heldSeats,
                confirmedSeats,
                availableSeats
            ));
        }

        return result;
    }

    public async Task<ServiceResult<ClassSeatStatusDto>> GetClassByIdAsync(string classId, CancellationToken ct = default)
    {
        if (!Guid.TryParse(classId, out var classGuid))
        {
            return ServiceResult<ClassSeatStatusDto>.Failure(404, "CLASS_NOT_FOUND", "The requested class was not found.");
        }

        await ExpireOverdueHoldsAsync(ct);
        var now = DateTime.UtcNow;

        var schoolClass = await _db.Classes.FindAsync(new object[] { classGuid }, ct);
        if (schoolClass == null)
        {
            return ServiceResult<ClassSeatStatusDto>.Failure(404, "CLASS_NOT_FOUND", "The requested class was not found.");
        }

        var heldSeats = await _db.Holds.CountAsync(
            h => h.ClassId == schoolClass.Id && h.Status == HoldStatus.Held && h.ExpiresAt > now, ct);

        var confirmedSeats = await _db.Holds.CountAsync(
            h => h.ClassId == schoolClass.Id && h.Status == HoldStatus.Confirmed, ct);

        var availableSeats = Math.Max(0, schoolClass.TotalSeats - heldSeats - confirmedSeats);

        var dto = new ClassSeatStatusDto(
            schoolClass.Id.ToString(),
            schoolClass.Name,
            schoolClass.Shift,
            schoolClass.TotalSeats,
            heldSeats,
            confirmedSeats,
            availableSeats
        );

        return ServiceResult<ClassSeatStatusDto>.Success(dto);
    }

    public async Task<ServiceResult<CreateHoldResponseDto>> CreateHoldAsync(string classId, string studentId, CancellationToken ct = default)
    {
        var cleanStudentId = (studentId ?? "").Trim();
        if (!IsValidStudentId(cleanStudentId))
        {
            return ServiceResult<CreateHoldResponseDto>.Failure(
                400, "INVALID_STUDENT_ID", "Please enter a valid 17-digit birth registration number.");
        }

        if (!Guid.TryParse(classId, out var classGuid))
        {
            return ServiceResult<CreateHoldResponseDto>.Failure(
                404, "CLASS_NOT_FOUND", "The selected class could not be found.");
        }

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            // 1. Acquire PostgreSQL advisory lock on studentId to serialize requests for the same student
            if (_db.Database.IsRelational())
            {
                await _db.Database.ExecuteSqlInterpolatedAsync(
                    $"SELECT pg_advisory_xact_lock(hashtext({cleanStudentId}))", ct);
            }

            // 2. Lock class row for update to serialize seat availability
            SchoolClass? schoolClass = null;
            if (_db.Database.IsRelational())
            {
                schoolClass = await _db.Classes
                    .FromSqlInterpolated($"SELECT * FROM classes WHERE id = {classGuid} FOR UPDATE")
                    .FirstOrDefaultAsync(ct);
            }
            else
            {
                schoolClass = await _db.Classes.FindAsync(new object[] { classGuid }, ct);
            }

            if (schoolClass == null)
            {
                await tx.RollbackAsync(ct);
                return ServiceResult<CreateHoldResponseDto>.Failure(
                    404, "CLASS_NOT_FOUND", "The selected class could not be found.");
            }

            var now = DateTime.UtcNow;

            // 3. Inline lazy expiry inside the transaction
            var expired = await _db.Holds
                .Where(h => h.Status == HoldStatus.Held && h.ExpiresAt <= now)
                .ToListAsync(ct);
            foreach (var eh in expired) eh.Status = HoldStatus.Expired;
            if (expired.Count > 0) await _db.SaveChangesAsync(ct);

            // 4. Global One-Application Rule across all classes & shifts
            var existingHold = await _db.Holds
                .Include(h => h.Class)
                .Where(h => h.StudentId == cleanStudentId &&
                            (h.Status == HoldStatus.Confirmed || (h.Status == HoldStatus.Held && h.ExpiresAt > now)))
                .FirstOrDefaultAsync(ct);

            if (existingHold != null)
            {
                await tx.RollbackAsync(ct);

                if (existingHold.Status == HoldStatus.Held)
                {
                    return ServiceResult<CreateHoldResponseDto>.Failure(
                        409,
                        "EXISTING_HELD_APPLICATION",
                        "You already have an ongoing application. Redirecting you to it.",
                        existingHoldId: existingHold.Id.ToString(),
                        existingClassId: existingHold.ClassId.ToString(),
                        existingClassName: existingHold.Class?.Name,
                        existingShift: existingHold.Class?.Shift,
                        existingStatus: HoldStatus.Held
                    );
                }

                return ServiceResult<CreateHoldResponseDto>.Failure(
                    409,
                    "EXISTING_CONFIRMED_ADMISSION",
                    "You already have a confirmed admission and cannot apply again.",
                    existingHoldId: existingHold.Id.ToString(),
                    existingClassId: existingHold.ClassId.ToString(),
                    existingClassName: existingHold.Class?.Name,
                    existingShift: existingHold.Class?.Shift,
                    existingStatus: HoldStatus.Confirmed
                );
            }

            // 5. Invariant check: heldSeats + confirmedSeats < totalSeats
            var heldCount = await _db.Holds.CountAsync(
                h => h.ClassId == classGuid && h.Status == HoldStatus.Held && h.ExpiresAt > now, ct);

            var confirmedCount = await _db.Holds.CountAsync(
                h => h.ClassId == classGuid && h.Status == HoldStatus.Confirmed, ct);

            if (heldCount + confirmedCount >= schoolClass.TotalSeats)
            {
                await tx.RollbackAsync(ct);
                return ServiceResult<CreateHoldResponseDto>.Failure(
                    409, "NO_SEATS_AVAILABLE", "No seats are currently available in this class.");
            }

            // 6. Create the hold
            var duration = GetHoldDurationSeconds();
            var newHold = new AdmissionHold
            {
                Id = Guid.NewGuid(),
                ClassId = classGuid,
                StudentId = cleanStudentId,
                Status = HoldStatus.Held,
                CreatedAt = now,
                ExpiresAt = now.AddSeconds(duration),
                ConfirmedAt = null,
                CancelledAt = null
            };

            _db.Holds.Add(newHold);
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            var dto = new CreateHoldResponseDto(
                newHold.Id.ToString(),
                newHold.ClassId.ToString(),
                schoolClass.Name,
                schoolClass.Shift,
                newHold.StudentId,
                newHold.Status,
                newHold.ExpiresAt,
                newHold.CreatedAt
            );

            return ServiceResult<CreateHoldResponseDto>.Success(dto, 201);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(ct);
            _logger.LogError(ex, "Unexpected error in CreateHoldAsync.");
            throw;
        }
    }

    public async Task<ServiceResult<HoldDetailsResponseDto>> GetHoldByIdAsync(string holdId, string? studentIdHeader, CancellationToken ct = default)
    {
        if (!Guid.TryParse(holdId, out var holdGuid))
        {
            return ServiceResult<HoldDetailsResponseDto>.Failure(404, "HOLD_NOT_FOUND", "The requested application was not found.");
        }

        if (!string.IsNullOrWhiteSpace(studentIdHeader) && !IsValidStudentId(studentIdHeader))
        {
            return ServiceResult<HoldDetailsResponseDto>.Failure(400, "INVALID_STUDENT_ID", "Please enter a valid 17-digit birth registration number.");
        }

        var hold = await _db.Holds
            .Include(h => h.Class)
            .FirstOrDefaultAsync(h => h.Id == holdGuid, ct);

        if (hold == null)
        {
            return ServiceResult<HoldDetailsResponseDto>.Failure(404, "HOLD_NOT_FOUND", "The requested application was not found.");
        }

        if (!string.IsNullOrWhiteSpace(studentIdHeader) && hold.StudentId != studentIdHeader.Trim())
        {
            return ServiceResult<HoldDetailsResponseDto>.Failure(403, "FORBIDDEN", "You are not authorized to view this application.");
        }

        // Lazy expiry check for this single hold
        var now = DateTime.UtcNow;
        if (hold.Status == HoldStatus.Held && hold.ExpiresAt <= now)
        {
            hold.Status = HoldStatus.Expired;
            await _db.SaveChangesAsync(ct);
        }

        var dto = new HoldDetailsResponseDto(
            hold.Id.ToString(),
            hold.ClassId.ToString(),
            hold.Class?.Name ?? "Class",
            hold.Class?.Shift ?? "Morning",
            hold.StudentId,
            hold.Status,
            hold.ExpiresAt,
            hold.CreatedAt,
            hold.ConfirmedAt,
            hold.CancelledAt
        );

        return ServiceResult<HoldDetailsResponseDto>.Success(dto);
    }

    public async Task<ServiceResult<ConfirmHoldResponseDto>> ConfirmHoldAsync(string holdId, string studentId, CancellationToken ct = default)
    {
        var cleanStudentId = (studentId ?? "").Trim();
        if (!IsValidStudentId(cleanStudentId))
        {
            return ServiceResult<ConfirmHoldResponseDto>.Failure(
                400, "INVALID_STUDENT_ID", "Please enter a valid 17-digit birth registration number.");
        }

        if (!Guid.TryParse(holdId, out var holdGuid))
        {
            return ServiceResult<ConfirmHoldResponseDto>.Failure(
                404, "HOLD_NOT_FOUND", "The requested application was not found.");
        }

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            AdmissionHold? hold = null;
            if (_db.Database.IsRelational())
            {
                hold = await _db.Holds
                    .FromSqlInterpolated($"SELECT * FROM admission_holds WHERE id = {holdGuid} FOR UPDATE")
                    .FirstOrDefaultAsync(ct);
            }
            else
            {
                hold = await _db.Holds.FindAsync(new object[] { holdGuid }, ct);
            }

            if (hold == null)
            {
                await tx.RollbackAsync(ct);
                return ServiceResult<ConfirmHoldResponseDto>.Failure(
                    404, "HOLD_NOT_FOUND", "The requested application was not found.");
            }

            if (hold.StudentId != cleanStudentId)
            {
                await tx.RollbackAsync(ct);
                return ServiceResult<ConfirmHoldResponseDto>.Failure(
                    403, "FORBIDDEN", "You are not authorized to modify this application.");
            }

            // Idempotency: If already confirmed, return success immediately
            if (hold.Status == HoldStatus.Confirmed)
            {
                await tx.CommitAsync(ct);
                return ServiceResult<ConfirmHoldResponseDto>.Success(
                    new ConfirmHoldResponseDto(hold.Id.ToString(), HoldStatus.Confirmed));
            }

            var now = DateTime.UtcNow;

            // Check if expired
            if (hold.Status == HoldStatus.Held && hold.ExpiresAt <= now)
            {
                hold.Status = HoldStatus.Expired;
                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return ServiceResult<ConfirmHoldResponseDto>.Failure(
                    409, "HOLD_EXPIRED", "Your seat hold has expired. The seat has been released.");
            }

            if (hold.Status != HoldStatus.Held)
            {
                await tx.RollbackAsync(ct);
                return ServiceResult<ConfirmHoldResponseDto>.Failure(
                    409, "INVALID_STATUS", $"Cannot confirm an application with status {hold.Status}.");
            }

            // Verify capacity before confirming
            var confirmedCount = await _db.Holds.CountAsync(
                h => h.ClassId == hold.ClassId && h.Status == HoldStatus.Confirmed, ct);
            var schoolClass = await _db.Classes.FindAsync(new object[] { hold.ClassId }, ct);

            if (schoolClass != null && confirmedCount >= schoolClass.TotalSeats)
            {
                await tx.RollbackAsync(ct);
                return ServiceResult<ConfirmHoldResponseDto>.Failure(
                    409, "NO_SEATS_AVAILABLE", "Class seats are already full.");
            }

            hold.Status = HoldStatus.Confirmed;
            hold.ConfirmedAt = now;

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            return ServiceResult<ConfirmHoldResponseDto>.Success(
                new ConfirmHoldResponseDto(hold.Id.ToString(), HoldStatus.Confirmed));
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(ct);
            _logger.LogError(ex, "Unexpected error in ConfirmHoldAsync.");
            throw;
        }
    }

    public async Task<ServiceResult<bool>> CancelHoldAsync(string holdId, string studentId, CancellationToken ct = default)
    {
        var cleanStudentId = (studentId ?? "").Trim();
        if (!IsValidStudentId(cleanStudentId))
        {
            return ServiceResult<bool>.Failure(
                400, "INVALID_STUDENT_ID", "Please enter a valid 17-digit birth registration number.");
        }

        if (!Guid.TryParse(holdId, out var holdGuid))
        {
            return ServiceResult<bool>.Failure(
                404, "HOLD_NOT_FOUND", "The requested application was not found.");
        }

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            AdmissionHold? hold = null;
            if (_db.Database.IsRelational())
            {
                hold = await _db.Holds
                    .FromSqlInterpolated($"SELECT * FROM admission_holds WHERE id = {holdGuid} FOR UPDATE")
                    .FirstOrDefaultAsync(ct);
            }
            else
            {
                hold = await _db.Holds.FindAsync(new object[] { holdGuid }, ct);
            }

            if (hold == null)
            {
                await tx.RollbackAsync(ct);
                return ServiceResult<bool>.Failure(
                    404, "HOLD_NOT_FOUND", "The requested application was not found.");
            }

            if (hold.StudentId != cleanStudentId)
            {
                await tx.RollbackAsync(ct);
                return ServiceResult<bool>.Failure(
                    403, "FORBIDDEN", "You are not authorized to cancel this application.");
            }

            var now = DateTime.UtcNow;

            // Preserve EXPIRED status if already expired
            if (hold.Status == HoldStatus.Held && hold.ExpiresAt <= now)
            {
                hold.Status = HoldStatus.Expired;
                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return ServiceResult<bool>.Failure(
                    409, "HOLD_EXPIRED", "Your seat hold has expired. The seat has been released.");
            }

            if (hold.Status == HoldStatus.Confirmed)
            {
                await tx.RollbackAsync(ct);
                return ServiceResult<bool>.Failure(
                    409, "ALREADY_CONFIRMED", "A confirmed admission cannot be cancelled.");
            }

            if (hold.Status != HoldStatus.Held)
            {
                await tx.RollbackAsync(ct);
                return ServiceResult<bool>.Failure(
                    409, "INVALID_STATUS", $"Cannot cancel an application with status {hold.Status}.");
            }

            hold.Status = HoldStatus.Cancelled;
            hold.CancelledAt = now;

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            return ServiceResult<bool>.Success(true, 204);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(ct);
            _logger.LogError(ex, "Unexpected error in CancelHoldAsync.");
            throw;
        }
    }

    public async Task<ServiceResult<List<StudentHoldItemDto>>> GetStudentHoldsAsync(string studentId, CancellationToken ct = default)
    {
        var cleanStudentId = (studentId ?? "").Trim();
        if (!IsValidStudentId(cleanStudentId))
        {
            return ServiceResult<List<StudentHoldItemDto>>.Failure(
                400, "INVALID_STUDENT_ID", "Please enter a valid 17-digit birth registration number.");
        }

        await ExpireOverdueHoldsAsync(ct);

        var holds = await _db.Holds
            .Include(h => h.Class)
            .Where(h => h.StudentId == cleanStudentId)
            .OrderByDescending(h => h.CreatedAt)
            .ToListAsync(ct);

        // Section 4.8 Rule: When a student has a CONFIRMED application, hide their previous EXPIRED applications
        var hasConfirmed = holds.Any(h => h.Status == HoldStatus.Confirmed);
        if (hasConfirmed)
        {
            holds = holds.Where(h => h.Status != HoldStatus.Expired).ToList();
        }

        var dtoList = holds.Select(h => new StudentHoldItemDto(
            h.Id.ToString(),
            h.ClassId.ToString(),
            h.Class?.Name ?? "Class",
            h.Class?.Shift ?? "Morning",
            h.StudentId,
            h.Status,
            h.ExpiresAt,
            h.CreatedAt,
            h.ConfirmedAt,
            h.CancelledAt
        )).ToList();

        return ServiceResult<List<StudentHoldItemDto>>.Success(dtoList);
    }

    public async Task<List<HoldDetailsResponseDto>> GetAdminHoldsAsync(string? statusFilter, CancellationToken ct = default)
    {
        await ExpireOverdueHoldsAsync(ct);

        var query = _db.Holds
            .Include(h => h.Class)
            .AsQueryable();

        var allHolds = await query.OrderByDescending(h => h.CreatedAt).ToListAsync(ct);

        // Section 4.8 Rule: Students with CONFIRMED applications have their previous EXPIRED applications hidden
        var confirmedStudents = new HashSet<string>(
            allHolds.Where(h => h.Status == HoldStatus.Confirmed).Select(h => h.StudentId)
        );

        var visibleHolds = allHolds
            .Where(h => !(h.Status == HoldStatus.Expired && confirmedStudents.Contains(h.StudentId)))
            .ToList();

        if (!string.IsNullOrWhiteSpace(statusFilter))
        {
            var filter = statusFilter.Trim().ToUpperInvariant();
            visibleHolds = visibleHolds.Where(h => h.Status == filter).ToList();
        }

        return visibleHolds.Select(h => new HoldDetailsResponseDto(
            h.Id.ToString(),
            h.ClassId.ToString(),
            h.Class?.Name ?? "Class",
            h.Class?.Shift ?? "Morning",
            h.StudentId,
            h.Status,
            h.ExpiresAt,
            h.CreatedAt,
            h.ConfirmedAt,
            h.CancelledAt
        )).ToList();
    }

    public async Task<AdminOverviewDto> GetAdminOverviewAsync(CancellationToken ct = default)
    {
        await ExpireOverdueHoldsAsync(ct);
        var now = DateTime.UtcNow;

        var totalClasses = await _db.Classes.CountAsync(ct);
        var totalSeats = await _db.Classes.SumAsync(c => c.TotalSeats, ct);

        var heldSeats = await _db.Holds.CountAsync(
            h => h.Status == HoldStatus.Held && h.ExpiresAt > now, ct);

        var confirmedSeats = await _db.Holds.CountAsync(
            h => h.Status == HoldStatus.Confirmed, ct);

        var availableSeats = Math.Max(0, totalSeats - heldSeats - confirmedSeats);

        var activeApplications = heldSeats;

        // Apply Section 4.8 visibility filter for count
        var allHolds = await _db.Holds.ToListAsync(ct);
        var confirmedStudents = new HashSet<string>(
            allHolds.Where(h => h.Status == HoldStatus.Confirmed).Select(h => h.StudentId)
        );

        var visibleExpired = allHolds.Count(
            h => h.Status == HoldStatus.Expired && !confirmedStudents.Contains(h.StudentId));

        var cancelled = allHolds.Count(h => h.Status == HoldStatus.Cancelled);

        return new AdminOverviewDto(
            totalClasses,
            totalSeats,
            availableSeats,
            heldSeats,
            confirmedSeats,
            activeApplications,
            visibleExpired,
            cancelled
        );
    }
}
