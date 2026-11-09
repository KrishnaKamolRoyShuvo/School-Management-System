using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Entities;

namespace SchoolAdmission.Api.Data;

/// <summary>
/// Entity Framework Core database context for the School Admission System.
/// Configures PostgreSQL table mappings, foreign keys, performance indexes, and concurrency constraints.
/// </summary>
public class AdmissionDbContext : DbContext
{
    /// <summary>
    /// Initializes a new instance of <see cref="AdmissionDbContext"/>.
    /// </summary>
    /// <param name="options">The options to be used by this <see cref="DbContext"/>.</param>
    public AdmissionDbContext(DbContextOptions<AdmissionDbContext> options)
        : base(options)
    {
    }

    /// <summary>
    /// Database set representing all academic classes (<c>classes</c> table).
    /// </summary>
    public DbSet<SchoolClass> Classes => Set<SchoolClass>();

    /// <summary>
    /// Database set representing all student seat holds and applications (<c>admission_holds</c> table).
    /// </summary>
    public DbSet<AdmissionHold> Holds => Set<AdmissionHold>();

    /// <summary>
    /// Configures table names, column mappings, composite indexes, and the partial unique index
    /// enforcing the Global One-Application Rule.
    /// </summary>
    /// <param name="modelBuilder">The builder being used to construct the model for this context.</param>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<SchoolClass>(b =>
        {
            b.ToTable("classes");
            b.HasKey(c => c.Id);
            b.Property(c => c.Id).HasColumnName("id");
            b.Property(c => c.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            b.Property(c => c.Shift).HasColumnName("shift").HasMaxLength(50).IsRequired().HasDefaultValue("Morning");
            b.Property(c => c.TotalSeats).HasColumnName("total_seats").IsRequired();
            b.Property(c => c.CreatedAt).HasColumnName("created_at").IsRequired();

            // Uniqueness constraint for class name + shift
            b.HasIndex(c => new { c.Name, c.Shift })
             .IsUnique();
        });

        modelBuilder.Entity<AdmissionHold>(b =>
        {
            b.ToTable("admission_holds");
            b.HasKey(h => h.Id);
            b.Property(h => h.Id).HasColumnName("id");
            b.Property(h => h.ClassId).HasColumnName("class_id").IsRequired();
            b.Property(h => h.StudentId).HasColumnName("student_id").HasMaxLength(17).IsRequired();
            b.Property(h => h.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
            b.Property(h => h.CreatedAt).HasColumnName("created_at").IsRequired();
            b.Property(h => h.ExpiresAt).HasColumnName("expires_at").IsRequired();
            b.Property(h => h.ConfirmedAt).HasColumnName("confirmed_at");
            b.Property(h => h.CancelledAt).HasColumnName("cancelled_at");

            b.HasOne(h => h.Class)
             .WithMany(c => c.Holds)
             .HasForeignKey(h => h.ClassId)
             .OnDelete(DeleteBehavior.Restrict);

            // Fast lookup for class seat counting queries
            b.HasIndex(h => new { h.ClassId, h.Status });

            // Fast lookup for student application history
            b.HasIndex(h => h.StudentId);

            // Fast lookup for background expiration worker scanning overdue HELD records
            b.HasIndex(h => new { h.Status, h.ExpiresAt });

            // CRITICAL INVARIANT: Partial unique index enforcing at most one HELD or CONFIRMED hold per student across the entire school
            b.HasIndex(h => h.StudentId)
             .IsUnique()
             .HasDatabaseName("ix_admission_holds_student_active")
             .HasFilter("status IN ('HELD', 'CONFIRMED')");
        });
    }
}
