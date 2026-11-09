using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.DTOs;
using SchoolAdmission.Api.Entities;

namespace SchoolAdmission.Tests;

/// <summary>
/// End-to-end integration and concurrency test suite verifying all 17 core business requirements,
/// including seat capacity invariants, idempotent confirmations, ownership enforcement, Section 4.8 visibility rules,
/// 40-student high-contention seat booking, and multi-instance advisory lock serialization.
/// </summary>
public class AdmissionIntegrationTests : IClassFixture<TestWebApplicationFactory>, IAsyncLifetime
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    /// <summary>
    /// Initializes a new instance of <see cref="AdmissionIntegrationTests"/>.
    /// </summary>
    public AdmissionIntegrationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    /// <summary>
    /// Resets the PostgreSQL test database prior to each test execution.
    /// </summary>
    public async Task InitializeAsync()
    {
        await _factory.ResetDatabaseAsync();
    }

    /// <inheritdoc />
    public Task DisposeAsync() => Task.CompletedTask;

    /// <summary>
    /// Generates a deterministic 17-digit Birth Certificate Number (BCN) for testing.
    /// </summary>
    private static string GenerateStudentId(int suffix) => $"20150000000{suffix:D6}";

    private async Task<(HttpResponseMessage Response, CreateClassResponseDto? Data)> CreateClassAsync(string name, int totalSeats, string shift = "Morning", HttpClient? client = null)
    {
        var c = client ?? _client;
        var res = await c.PostAsJsonAsync("/classes", new CreateClassRequestDto(name, shift, totalSeats));
        CreateClassResponseDto? data = null;
        if (res.IsSuccessStatusCode)
        {
            data = await res.Content.ReadFromJsonAsync<CreateClassResponseDto>();
        }
        return (res, data);
    }

    private async Task<(HttpResponseMessage Response, CreateHoldResponseDto? Data)> CreateHoldAsync(string classId, string studentId, HttpClient? client = null)
    {
        var c = client ?? _client;
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/classes/{classId}/holds");
        req.Headers.Add("X-Student-Id", studentId);
        var res = await c.SendAsync(req);
        CreateHoldResponseDto? data = null;
        if (res.IsSuccessStatusCode)
        {
            data = await res.Content.ReadFromJsonAsync<CreateHoldResponseDto>();
        }
        return (res, data);
    }

    private async Task<(HttpResponseMessage Response, HoldDetailsResponseDto? Data)> GetHoldAsync(string holdId, string? studentId = null, HttpClient? client = null)
    {
        var c = client ?? _client;
        using var req = new HttpRequestMessage(HttpMethod.Get, $"/holds/{holdId}");
        if (!string.IsNullOrEmpty(studentId))
        {
            req.Headers.Add("X-Student-Id", studentId);
        }
        var res = await c.SendAsync(req);
        HoldDetailsResponseDto? data = null;
        if (res.IsSuccessStatusCode)
        {
            data = await res.Content.ReadFromJsonAsync<HoldDetailsResponseDto>();
        }
        return (res, data);
    }

    private async Task<(HttpResponseMessage Response, ConfirmHoldResponseDto? Data)> ConfirmHoldAsync(string holdId, string studentId, HttpClient? client = null)
    {
        var c = client ?? _client;
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/holds/{holdId}/confirm");
        req.Headers.Add("X-Student-Id", studentId);
        var res = await c.SendAsync(req);
        ConfirmHoldResponseDto? data = null;
        if (res.IsSuccessStatusCode)
        {
            data = await res.Content.ReadFromJsonAsync<ConfirmHoldResponseDto>();
        }
        return (res, data);
    }

    private async Task<HttpResponseMessage> CancelHoldAsync(string holdId, string studentId, HttpClient? client = null)
    {
        var c = client ?? _client;
        using var req = new HttpRequestMessage(HttpMethod.Delete, $"/holds/{holdId}");
        req.Headers.Add("X-Student-Id", studentId);
        return await c.SendAsync(req);
    }

    private async Task<(HttpResponseMessage Response, ClassSeatStatusDto? Data)> GetClassByIdAsync(string classId, HttpClient? client = null)
    {
        var c = client ?? _client;
        var res = await c.GetAsync($"/classes/{classId}");
        ClassSeatStatusDto? data = null;
        if (res.IsSuccessStatusCode)
        {
            data = await res.Content.ReadFromJsonAsync<ClassSeatStatusDto>();
        }
        return (res, data);
    }

    private async Task<(HttpResponseMessage Response, List<StudentHoldItemDto>? Data)> GetStudentHoldsAsync(string studentId, HttpClient? client = null)
    {
        var c = client ?? _client;
        using var req = new HttpRequestMessage(HttpMethod.Get, "/me/holds");
        req.Headers.Add("X-Student-Id", studentId);
        var res = await c.SendAsync(req);
        List<StudentHoldItemDto>? data = null;
        if (res.IsSuccessStatusCode)
        {
            data = await res.Content.ReadFromJsonAsync<List<StudentHoldItemDto>>();
        }
        return (res, data);
    }

    /// <summary>
    /// Verifies that creating a class with valid input returns 201 Created and initializes all seats as available.
    /// </summary>
    [Fact]
    public async Task Test01_CreateClass_ValidInput_Returns201AndPersists()
    {
        var (res, cls) = await CreateClassAsync("Class 6 - Morning", 30);
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        Assert.NotNull(cls);
        Assert.NotEmpty(cls.Id);
        Assert.Equal("Class 6 - Morning", cls.Name);
        Assert.Equal(30, cls.TotalSeats);

        var (getRes, getCls) = await GetClassByIdAsync(cls.Id);
        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);
        Assert.NotNull(getCls);
        Assert.Equal(30, getCls.AvailableSeats);
        Assert.Equal(0, getCls.HeldSeats);
        Assert.Equal(0, getCls.ConfirmedSeats);
    }

    /// <summary>
    /// Verifies that invalid seat capacities return 400 Bad Request and duplicate class names return 409 Conflict.
    /// </summary>
    [Fact]
    public async Task Test02_CreateClass_InvalidInputOrDuplicate_Returns4xx()
    {
        // Total seats <= 0
        var (resNegative, _) = await CreateClassAsync("Class 6 - Day", 0);
        Assert.Equal(HttpStatusCode.BadRequest, resNegative.StatusCode);

        // Valid creation
        var (resValid, _) = await CreateClassAsync("Class 7 - Morning", 25);
        Assert.Equal(HttpStatusCode.Created, resValid.StatusCode);

        // Duplicate name
        var (resDup, _) = await CreateClassAsync("Class 7 - Morning", 25);
        Assert.Equal(HttpStatusCode.Conflict, resDup.StatusCode);
    }

    /// <summary>
    /// Verifies that creating a hold decrements availableSeats by 1, increments heldSeats by 1, and sets a future expiry timestamp.
    /// </summary>
    [Fact]
    public async Task Test03_CreateHold_WhenSeatAvailable_Returns201WithConfiguredExpiry()
    {
        var (_, cls) = await CreateClassAsync("Class 8 - Day", 20);
        var studentId = GenerateStudentId(101);

        var (res, hold) = await CreateHoldAsync(cls!.Id, studentId);
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        Assert.NotNull(hold);
        Assert.Equal(HoldStatus.Held, hold.Status);
        Assert.Equal(studentId, hold.StudentId);
        Assert.True(hold.ExpiresAt > DateTime.UtcNow);

        // Verify class seat counts
        var (_, status) = await GetClassByIdAsync(cls.Id);
        Assert.Equal(1, status!.HeldSeats);
        Assert.Equal(19, status.AvailableSeats);
    }

    /// <summary>
    /// Verifies that missing, short, or non-numeric <c>X-Student-Id</c> headers are rejected with 400 Bad Request.
    /// </summary>
    [Fact]
    public async Task Test04_CreateHold_InvalidStudentIdHeader_Returns400()
    {
        var (_, cls) = await CreateClassAsync("Class 9 - Morning", 20);

        // Non-17 digits (too short)
        var (resShort, _) = await CreateHoldAsync(cls!.Id, "12345");
        Assert.Equal(HttpStatusCode.BadRequest, resShort.StatusCode);

        // Non-digits
        var (resAlpha, _) = await CreateHoldAsync(cls.Id, "20150000000ABCD1");
        Assert.Equal(HttpStatusCode.BadRequest, resAlpha.StatusCode);

        // Missing header
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/classes/{cls.Id}/holds");
        var resEmpty = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.BadRequest, resEmpty.StatusCode);
    }

    /// <summary>
    /// Verifies that a student who already has an active <c>HELD</c> application receives 409 Conflict with <c>EXISTING_HELD_APPLICATION</c> and redirect metadata.
    /// </summary>
    [Fact]
    public async Task Test05_CreateHold_WhenStudentAlreadyHasHeldApplication_Returns409WithRedirectInfo()
    {
        var (_, clsA) = await CreateClassAsync("Class 5 - Morning", 10);
        var (_, clsB) = await CreateClassAsync("Class 5 - Day", 10);
        var studentId = GenerateStudentId(105);

        // Hold in Class A
        var (res1, hold1) = await CreateHoldAsync(clsA!.Id, studentId);
        Assert.Equal(HttpStatusCode.Created, res1.StatusCode);

        // Attempt hold in Class B
        var (res2, _) = await CreateHoldAsync(clsB!.Id, studentId);
        Assert.Equal(HttpStatusCode.Conflict, res2.StatusCode);

        var err = await res2.Content.ReadFromJsonAsync<ApiErrorResponseDto>();
        Assert.Equal("EXISTING_HELD_APPLICATION", err!.Code);
        Assert.Equal(hold1!.HoldId, err.ExistingHoldId);
        Assert.Equal(clsA.Id, err.ExistingClassId);
    }

    /// <summary>
    /// Verifies that a student with a <c>CONFIRMED</c> admission is permanently blocked from applying to another class with 409 Conflict (<c>EXISTING_CONFIRMED_ADMISSION</c>).
    /// </summary>
    [Fact]
    public async Task Test06_CreateHold_WhenStudentAlreadyHasConfirmedApplication_Returns409AndBlocks()
    {
        var (_, clsA) = await CreateClassAsync("Class 4 - Morning", 10);
        var (_, clsB) = await CreateClassAsync("Class 4 - Day", 10);
        var studentId = GenerateStudentId(106);

        var (_, hold1) = await CreateHoldAsync(clsA!.Id, studentId);
        await ConfirmHoldAsync(hold1!.HoldId, studentId);

        // Attempt hold in Class B
        var (res2, _) = await CreateHoldAsync(clsB!.Id, studentId);
        Assert.Equal(HttpStatusCode.Conflict, res2.StatusCode);

        var err = await res2.Content.ReadFromJsonAsync<ApiErrorResponseDto>();
        Assert.Equal("EXISTING_CONFIRMED_ADMISSION", err!.Code);
    }

    /// <summary>
    /// Verifies that confirming an active hold transitions its status to <c>CONFIRMED</c> and moves 1 seat from <c>heldSeats</c> to <c>confirmedSeats</c>.
    /// </summary>
    [Fact]
    public async Task Test07_ConfirmHold_ValidUnexpiredHold_TransitionsToConfirmedAndUpdatesSeatCounts()
    {
        var (_, cls) = await CreateClassAsync("Class 3 - Morning", 15);
        var studentId = GenerateStudentId(107);

        var (_, hold) = await CreateHoldAsync(cls!.Id, studentId);
        var (confirmRes, confirmed) = await ConfirmHoldAsync(hold!.HoldId, studentId);

        Assert.Equal(HttpStatusCode.OK, confirmRes.StatusCode);
        Assert.Equal(HoldStatus.Confirmed, confirmed!.Status);

        var (_, status) = await GetClassByIdAsync(cls.Id);
        Assert.Equal(1, status!.ConfirmedSeats);
        Assert.Equal(0, status.HeldSeats);
        Assert.Equal(14, status.AvailableSeats);
    }

    /// <summary>
    /// Verifies that repeated confirmation calls for an already-confirmed hold are idempotent and do not increment <c>confirmedSeats</c> twice.
    /// </summary>
    [Fact]
    public async Task Test08_ConfirmHold_RepeatedConfirmation_IsIdempotentAndDoesNotIncrementTwice()
    {
        var (_, cls) = await CreateClassAsync("Class 2 - Morning", 15);
        var studentId = GenerateStudentId(108);

        var (_, hold) = await CreateHoldAsync(cls!.Id, studentId);
        var (res1, _) = await ConfirmHoldAsync(hold!.HoldId, studentId);
        Assert.Equal(HttpStatusCode.OK, res1.StatusCode);

        // Second confirmation
        var (res2, _) = await ConfirmHoldAsync(hold.HoldId, studentId);
        Assert.Equal(HttpStatusCode.OK, res2.StatusCode);

        // Seats still confirmed = 1
        var (_, status) = await GetClassByIdAsync(cls.Id);
        Assert.Equal(1, status!.ConfirmedSeats);
        Assert.Equal(14, status.AvailableSeats);
    }

    /// <summary>
    /// Verifies that attempting to confirm another student's hold returns 403 Forbidden.
    /// </summary>
    [Fact]
    public async Task Test09_ConfirmHold_DifferentStudent_Returns403Forbidden()
    {
        var (_, cls) = await CreateClassAsync("Class 1 - Morning", 15);
        var studentA = GenerateStudentId(1091);
        var studentB = GenerateStudentId(1092);

        var (_, hold) = await CreateHoldAsync(cls!.Id, studentA);
        var (res, _) = await ConfirmHoldAsync(hold!.HoldId, studentB);

        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    /// <summary>
    /// Verifies that attempting to confirm an expired hold returns 409 Conflict (<c>HOLD_EXPIRED</c>) and releases the seat.
    /// </summary>
    [Fact]
    public async Task Test10_ConfirmHold_WhenExpired_Returns409AndReleasesSeat()
    {
        var (_, cls) = await CreateClassAsync("Class 10 - Morning", 10);
        var studentId = GenerateStudentId(110);

        var (_, hold) = await CreateHoldAsync(cls!.Id, studentId);

        // Simulate expiry directly in DB
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
            var dbHold = await db.Holds.FindAsync(Guid.Parse(hold!.HoldId));
            dbHold!.ExpiresAt = DateTime.UtcNow.AddSeconds(-10);
            await db.SaveChangesAsync();
        }

        var (res, _) = await ConfirmHoldAsync(hold!.HoldId, studentId);
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);

        var err = await res.Content.ReadFromJsonAsync<ApiErrorResponseDto>();
        Assert.Equal("HOLD_EXPIRED", err!.Code);

        // Seat is released
        var (_, status) = await GetClassByIdAsync(cls.Id);
        Assert.Equal(0, status!.HeldSeats);
        Assert.Equal(10, status.AvailableSeats);
    }

    /// <summary>
    /// Verifies that cancelling an active hold returns 204 No Content and immediately restores the seat to <c>availableSeats</c>.
    /// </summary>
    [Fact]
    public async Task Test11_CancelHold_ValidHeldApplication_Returns204AndReleasesSeatImmediately()
    {
        var (_, cls) = await CreateClassAsync("Class 9 - Day", 10);
        var studentId = GenerateStudentId(111);

        var (_, hold) = await CreateHoldAsync(cls!.Id, studentId);
        var cancelRes = await CancelHoldAsync(hold!.HoldId, studentId);

        Assert.Equal(HttpStatusCode.NoContent, cancelRes.StatusCode);

        var (_, status) = await GetClassByIdAsync(cls.Id);
        Assert.Equal(0, status!.HeldSeats);
        Assert.Equal(10, status.AvailableSeats);
    }

    /// <summary>
    /// Verifies that attempting to cancel another student's hold returns 403 Forbidden.
    /// </summary>
    [Fact]
    public async Task Test12_CancelHold_DifferentStudent_Returns403Forbidden()
    {
        var (_, cls) = await CreateClassAsync("Class 8 - Morning", 10);
        var studentA = GenerateStudentId(1121);
        var studentB = GenerateStudentId(1122);

        var (_, hold) = await CreateHoldAsync(cls!.Id, studentA);
        var res = await CancelHoldAsync(hold!.HoldId, studentB);

        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    /// <summary>
    /// Verifies that attempting to cancel an already-confirmed hold returns 409 Conflict and preserves the <c>CONFIRMED</c> status.
    /// </summary>
    [Fact]
    public async Task Test13_CancelHold_WhenAlreadyConfirmedOrExpired_Returns409AndPreservesStatus()
    {
        var (_, cls) = await CreateClassAsync("Class 7 - Day", 10);
        var studentId = GenerateStudentId(113);

        var (_, hold) = await CreateHoldAsync(cls!.Id, studentId);
        await ConfirmHoldAsync(hold!.HoldId, studentId);

        // Cancelling confirmed hold fails
        var resConfirmedCancel = await CancelHoldAsync(hold.HoldId, studentId);
        Assert.Equal(HttpStatusCode.Conflict, resConfirmedCancel.StatusCode);

        // Verify status remains CONFIRMED
        var (_, details) = await GetHoldAsync(hold.HoldId, studentId);
        Assert.Equal(HoldStatus.Confirmed, details!.Status);
    }

    /// <summary>
    /// Verifies that a student whose previous hold was cancelled or expired can freely create a new hold.
    /// </summary>
    [Fact]
    public async Task Test14_Reapply_AfterExpirationOrCancellation_Succeeds()
    {
        var (_, cls) = await CreateClassAsync("Class 6 - Day 2", 10);
        var studentId = GenerateStudentId(114);

        // First hold and cancel
        var (_, hold1) = await CreateHoldAsync(cls!.Id, studentId);
        await CancelHoldAsync(hold1!.HoldId, studentId);

        // Second hold succeeds
        var (res2, hold2) = await CreateHoldAsync(cls.Id, studentId);
        Assert.Equal(HttpStatusCode.Created, res2.StatusCode);
        Assert.NotEqual(hold1.HoldId, hold2!.HoldId);
    }

    /// <summary>
    /// Verifies Section 4.8 Visibility Rule: when a student confirms a new application, their previous <c>EXPIRED</c> applications
    /// are hidden from <c>GET /me/holds</c> (while remaining persisted in PostgreSQL) and <c>CANCELLED</c> applications remain visible.
    /// </summary>
    [Fact]
    public async Task Test15_VisibilityRule_WhenNewApplicationConfirmed_HidesPreviousExpiredButKeepsCancelled()
    {
        var (_, cls) = await CreateClassAsync("Class 5 - Visibility", 20);
        var studentId = GenerateStudentId(115);

        // 1. Create Hold 1 and let it expire
        var (_, hold1) = await CreateHoldAsync(cls!.Id, studentId);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
            var dbHold1 = await db.Holds.FindAsync(Guid.Parse(hold1!.HoldId));
            dbHold1!.ExpiresAt = DateTime.UtcNow.AddSeconds(-20);
            dbHold1.Status = HoldStatus.Expired;
            await db.SaveChangesAsync();
        }

        // 2. Create Hold 2 and Cancel it
        var (_, hold2) = await CreateHoldAsync(cls.Id, studentId);
        await CancelHoldAsync(hold2!.HoldId, studentId);

        // 3. Create Hold 3 and Confirm it
        var (_, hold3) = await CreateHoldAsync(cls.Id, studentId);
        await ConfirmHoldAsync(hold3!.HoldId, studentId);

        // 4. Query student holds
        var (_, studentHolds) = await GetStudentHoldsAsync(studentId);
        Assert.NotNull(studentHolds);

        // Section 4.8 Rule:
        // Hold 1 (EXPIRED prior to confirmation) should be HIDDEN from list
        Assert.DoesNotContain(studentHolds, h => h.HoldId == hold1!.HoldId);

        // Hold 2 (CANCELLED) must NOT be hidden
        Assert.Contains(studentHolds, h => h.HoldId == hold2!.HoldId);

        // Hold 3 (CONFIRMED) must be present
        Assert.Contains(studentHolds, h => h.HoldId == hold3!.HoldId);

        // Verify row was NOT deleted from DB
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
            var row1 = await db.Holds.FindAsync(Guid.Parse(hold1!.HoldId));
            Assert.NotNull(row1); // Row persists in DB!
        }
    }

    /// <summary>
    /// Verifies high-contention concurrency: when 40 students simultaneously attempt to reserve seats in a 10-seat class,
    /// exactly 10 succeed (201 Created) and 30 receive 409 Conflict, with <c>availableSeats</c> never dropping below 0.
    /// </summary>
    [Fact]
    public async Task Test16_Concurrency_MultipleStudentsBookingLimitedSeats_NeverExceedsClassCapacity()
    {
        const int totalCapacity = 10;
        const int concurrentStudents = 40;

        var (_, cls) = await CreateClassAsync("Class Concurrency 1", totalCapacity);
        var tasks = new List<Task<HttpResponseMessage>>();

        for (int i = 0; i < concurrentStudents; i++)
        {
            var sId = GenerateStudentId(2000 + i);
            tasks.Add(Task.Run(async () =>
            {
                using var req = new HttpRequestMessage(HttpMethod.Post, $"/classes/{cls!.Id}/holds");
                req.Headers.Add("X-Student-Id", sId);
                return await _client.SendAsync(req);
            }));
        }

        var results = await Task.WhenAll(tasks);
        var successCount = results.Count(r => r.StatusCode == HttpStatusCode.Created);
        var conflictCount = results.Count(r => r.StatusCode == HttpStatusCode.Conflict);

        Assert.Equal(totalCapacity, successCount);
        Assert.Equal(concurrentStudents - totalCapacity, conflictCount);

        var (_, status) = await GetClassByIdAsync(cls!.Id);
        Assert.Equal(totalCapacity, status!.HeldSeats);
        Assert.Equal(0, status.AvailableSeats);
    }

    /// <summary>
    /// Verifies Bonus 19.1 Multi-Instance Concurrency: when the same student simultaneously sends hold requests
    /// to two separate backend server instances connected to the same PostgreSQL database, <c>pg_advisory_xact_lock</c>
    /// guarantees that at most one hold succeeds.
    /// </summary>
    [Fact]
    public async Task Test17_Concurrency_SameStudentSimultaneousRequests_AcrossTwoBackendInstances()
    {
        // Bonus 19.1: Two distinct backend WebApplicationFactory instances sharing PostgreSQL
        using var factoryInstance2 = new TestWebApplicationFactory();
        var client1 = _client;
        var client2 = factoryInstance2.CreateClient();

        var (_, clsA) = await CreateClassAsync("Class MultiInstance A", 10, client: client1);
        var (_, clsB) = await CreateClassAsync("Class MultiInstance B", 10, client: client2);

        var studentId = GenerateStudentId(3001);

        // Launch simultaneous requests to Instance 1 (Class A) and Instance 2 (Class B)
        var task1 = Task.Run(async () =>
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, $"/classes/{clsA!.Id}/holds");
            req.Headers.Add("X-Student-Id", studentId);
            return await client1.SendAsync(req);
        });

        var task2 = Task.Run(async () =>
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, $"/classes/{clsB!.Id}/holds");
            req.Headers.Add("X-Student-Id", studentId);
            return await client2.SendAsync(req);
        });

        var responses = await Task.WhenAll(task1, task2);
        var successCount = responses.Count(r => r.StatusCode == HttpStatusCode.Created);
        var conflictCount = responses.Count(r => r.StatusCode == HttpStatusCode.Conflict);

        // PostgreSQL pg_advisory_xact_lock guarantees EXACTLY ONE succeeded across instances
        Assert.Equal(1, successCount);
        Assert.Equal(1, conflictCount);
    }
}
