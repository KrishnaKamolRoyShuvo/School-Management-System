namespace SchoolAdmission.Api.Entities;

/// <summary>
/// Defines canonical lifecycle states for an <see cref="AdmissionHold"/> record.
/// </summary>
/// <remarks>
/// Valid state transitions:
/// <list type="bullet">
/// <item><description><see cref="Held"/> -> <see cref="Confirmed"/> (when student confirms prior to expiration)</description></item>
/// <item><description><see cref="Held"/> -> <see cref="Expired"/> (when <c>ExpiresAt &lt;= UtcNow</c> elapses without confirmation)</description></item>
/// <item><description><see cref="Held"/> -> <see cref="Cancelled"/> (when student explicitly cancels an active hold)</description></item>
/// </list>
/// Terminal states (<see cref="Confirmed"/>, <see cref="Expired"/>, <see cref="Cancelled"/>) cannot transition further.
/// </remarks>
public static class HoldStatus
{
    /// <summary>
    /// Seat is temporarily reserved for a student while awaiting confirmation.
    /// </summary>
    public const string Held = "HELD";

    /// <summary>
    /// Seat admission has been permanently confirmed by the student.
    /// </summary>
    public const string Confirmed = "CONFIRMED";

    /// <summary>
    /// Hold window elapsed before confirmation; the seat has been released back to the pool.
    /// </summary>
    public const string Expired = "EXPIRED";

    /// <summary>
    /// Hold was explicitly cancelled by the student prior to expiration; the seat has been released.
    /// </summary>
    public const string Cancelled = "CANCELLED";

    /// <summary>
    /// All valid status values supported by the system.
    /// </summary>
    public static readonly string[] All = { Held, Confirmed, Expired, Cancelled };

    /// <summary>
    /// Checks whether a candidate string matches one of the canonical <see cref="HoldStatus"/> constants.
    /// </summary>
    /// <param name="status">The status string to validate (case-insensitive).</param>
    /// <returns><c>true</c> if valid; otherwise <c>false</c>.</returns>
    public static bool IsValid(string? status) =>
        status != null && All.Contains(status.ToUpperInvariant());
}
