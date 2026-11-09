using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Entities;

namespace SchoolAdmission.Api.Data;

public class AdmissionDbContext : DbContext
{
    public AdmissionDbContext(DbContextOptions<AdmissionDbContext> options)
        : base(options)
    {
    }

    public DbSet<SchoolClass> Classes => Set<SchoolClass>();
    public DbSet<AdmissionHold> Holds => Set<AdmissionHold>();

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

            // Case-insensitive uniqueness for class name + shift
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

            // Fast lookup for class holds
            b.HasIndex(h => new { h.ClassId, h.Status });

            // Fast lookup for student history
            b.HasIndex(h => h.StudentId);

            // Fast lookup for background expiration worker
            b.HasIndex(h => new { h.Status, h.ExpiresAt });

            // CRITICAL: Partial unique index enforcing at most one HELD or CONFIRMED hold per student across the school
            b.HasIndex(h => h.StudentId)
             .IsUnique()
             .HasDatabaseName("ix_admission_holds_student_active")
             .HasFilter("status IN ('HELD', 'CONFIRMED')");
        });
    }
}
