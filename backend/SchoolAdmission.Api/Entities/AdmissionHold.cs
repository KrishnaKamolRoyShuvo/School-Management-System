using System.ComponentModel.DataAnnotations;

namespace SchoolAdmission.Api.Entities;

/// <summary>
/// Represents a student's seat reservation (hold) or confirmed admission application for a specific <see cref="SchoolClass"/>.
/// </summary>
/// <remarks>
/// Mapped to the <c>admission_holds</c> table in PostgreSQL.
/// Enforces the Global One-Application Rule via a partial unique index on <see cref="StudentId"/>
/// where <c>status IN ('HELD', 'CONFIRMED')</c>.
/// </remarks>
public class AdmissionHold
{
    /// <summary>
    /// Unique identifier for the admission hold/application.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Foreign key referencing the target <see cref="SchoolClass"/>.
    /// </summary>
    public Guid ClassId { get; set; }

    /// <summary>
    /// Navigation reference to the associated <see cref="SchoolClass"/>.
    /// </summary>
    public SchoolClass? Class { get; set; }

    /// <summary>
    /// The student's 17-digit Birth Certificate Number (BCN) used as the unique applicant identifier.
    /// </summary>
    [Required]
    [RegularExpression(@"^\d{17}$", ErrorMessage = "Student ID must be exactly 17 digits.")]
    [MaxLength(17)]
    public string StudentId { get; set; } = string.Empty;

    /// <summary>
    /// Current lifecycle status of the hold (<see cref="HoldStatus.Held"/>, <see cref="HoldStatus.Confirmed"/>,
    /// <see cref="HoldStatus.Expired"/>, or <see cref="HoldStatus.Cancelled"/>).
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = HoldStatus.Held;

    /// <summary>
    /// UTC timestamp when the hold was initially created.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// UTC timestamp when the temporary hold expires if not confirmed.
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// UTC timestamp when the student confirmed the admission, or <c>null</c> if not confirmed.
    /// </summary>
    public DateTime? ConfirmedAt { get; set; }

    /// <summary>
    /// UTC timestamp when the student cancelled the hold, or <c>null</c> if not cancelled.
    /// </summary>
    public DateTime? CancelledAt { get; set; }

    /// <summary>
    /// Evaluates whether the hold is currently active and occupying a seat at the specified UTC time.
    /// </summary>
    /// <param name="nowUtc">The current UTC timestamp to compare against <see cref="ExpiresAt"/>.</param>
    /// <returns><c>true</c> if <see cref="Status"/> is <see cref="HoldStatus.Held"/> and <see cref="ExpiresAt"/> is in the future.</returns>
    public bool IsActive(DateTime nowUtc) =>
        Status == HoldStatus.Held && ExpiresAt > nowUtc;
}
