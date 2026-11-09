using System.ComponentModel.DataAnnotations;

namespace SchoolAdmission.Api.Entities;

public class AdmissionHold
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ClassId { get; set; }
    public SchoolClass? Class { get; set; }

    [Required]
    [RegularExpression(@"^\d{17}$", ErrorMessage = "Student ID must be exactly 17 digits.")]
    [MaxLength(17)]
    public string StudentId { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = HoldStatus.Held;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? CancelledAt { get; set; }

    public bool IsActive(DateTime nowUtc) =>
        Status == HoldStatus.Held && ExpiresAt > nowUtc;
}
