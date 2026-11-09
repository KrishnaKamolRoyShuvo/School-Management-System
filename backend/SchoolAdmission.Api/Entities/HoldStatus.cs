namespace SchoolAdmission.Api.Entities;

public static class HoldStatus
{
    public const string Held = "HELD";
    public const string Confirmed = "CONFIRMED";
    public const string Expired = "EXPIRED";
    public const string Cancelled = "CANCELLED";

    public static readonly string[] All = { Held, Confirmed, Expired, Cancelled };

    public static bool IsValid(string? status) =>
        status != null && All.Contains(status.ToUpperInvariant());
}
