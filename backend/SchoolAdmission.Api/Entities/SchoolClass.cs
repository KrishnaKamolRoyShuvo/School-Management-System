using System.ComponentModel.DataAnnotations;

namespace SchoolAdmission.Api.Entities;

public class SchoolClass
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Shift { get; set; } = "Morning";

    [Range(1, 120)]
    public int TotalSeats { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<AdmissionHold> Holds { get; set; } = new List<AdmissionHold>();
}
