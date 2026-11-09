using System.ComponentModel.DataAnnotations;

namespace SchoolAdmission.Api.Entities;

/// <summary>
/// Represents an academic class and shift offering with a fixed seat capacity.
/// </summary>
/// <remarks>
/// Mapped to the <c>classes</c> table in PostgreSQL. Enforces uniqueness across (<see cref="Name"/>, <see cref="Shift"/>).
/// </remarks>
public class SchoolClass
{
    /// <summary>
    /// Unique identifier for the school class.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Display name of the class (e.g., "Class 6 - Morning" or "Class 1").
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Academic shift for the class ("Morning" or "Day"). Defaults to "Morning".
    /// </summary>
    [MaxLength(50)]
    public string Shift { get; set; } = "Morning";

    /// <summary>
    /// Maximum number of seats available in this class across all held and confirmed applications (1 to 120).
    /// </summary>
    [Range(1, 120)]
    public int TotalSeats { get; set; }

    /// <summary>
    /// UTC timestamp when the class was created.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation collection of all seat holds and applications associated with this class.
    /// </summary>
    public ICollection<AdmissionHold> Holds { get; set; } = new List<AdmissionHold>();
}
