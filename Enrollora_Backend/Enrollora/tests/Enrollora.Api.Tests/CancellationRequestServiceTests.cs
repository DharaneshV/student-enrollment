using Enrollora.Api.DTOs;
using Enrollora.Api.Models;

namespace Enrollora.Api.Tests;

public sealed class CancellationRequestServiceTests
{
    [Fact]
    public async Task CreateAsync_ActiveEnrollment_CreatesPendingRequest()
    {
        using var scope = new TestDbContextScope();
        var student = await scope.SeedStudentAsync();
        var course = await scope.SeedCourseAsync(capacity: 2);
        var enrollmentService = scope.CreateEnrollmentService();
        var cancellationService = scope.CreateCancellationService();

        var enrollment = await enrollmentService.CreateAsync(student.StudentId, course.CourseId, CancellationToken.None);

        var result = await cancellationService.CreateAsync(
            student.StudentId,
            enrollment.EnrollmentId,
            new CreateCancellationRequest { Reason = "Schedule conflict" },
            CancellationToken.None);

        Assert.Equal(CancellationStatus.Pending, result.Status);
        Assert.Equal("Schedule conflict", result.Reason);
    }

    [Fact]
    public async Task CreateAsync_DuplicatePendingRequest_ThrowsInvalidOperationException()
    {
        using var scope = new TestDbContextScope();
        var student = await scope.SeedStudentAsync();
        var course = await scope.SeedCourseAsync(capacity: 2);
        var enrollmentService = scope.CreateEnrollmentService();
        var cancellationService = scope.CreateCancellationService();

        var enrollment = await enrollmentService.CreateAsync(student.StudentId, course.CourseId, CancellationToken.None);
        await cancellationService.CreateAsync(
            student.StudentId,
            enrollment.EnrollmentId,
            new CreateCancellationRequest { Reason = "First request" },
            CancellationToken.None);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => cancellationService.CreateAsync(
                student.StudentId,
                enrollment.EnrollmentId,
                new CreateCancellationRequest { Reason = "Second request" },
                CancellationToken.None));
    }

    [Fact]
    public async Task ReviewAsync_Approve_CancelsEnrollmentAndFreesSeat()
    {
        using var scope = new TestDbContextScope();
        var student1 = await scope.SeedStudentAsync("Student 1", "s1@test.com");
        var student2 = await scope.SeedStudentAsync("Student 2", "s2@test.com");
        var course = await scope.SeedCourseAsync(capacity: 1);
        var enrollmentService = scope.CreateEnrollmentService();
        var cancellationService = scope.CreateCancellationService();

        var enrollment1 = await enrollmentService.CreateAsync(student1.StudentId, course.CourseId, CancellationToken.None);
        var req = await cancellationService.CreateAsync(
            student1.StudentId,
            enrollment1.EnrollmentId,
            new CreateCancellationRequest { Reason = "Dropping course" },
            CancellationToken.None);

        var reviewed = await cancellationService.ReviewAsync(
            req.CancellationRequestId,
            approve: true,
            new ReviewCancellationRequest { AdminRemarks = "Approved" },
            CancellationToken.None);

        Assert.Equal(CancellationStatus.Approved, reviewed.Status);
        Assert.Equal("Approved", reviewed.AdminRemarks);

        // Seat is now free, so student2 can enroll
        var enrollment2 = await enrollmentService.CreateAsync(student2.StudentId, course.CourseId, CancellationToken.None);
        Assert.Equal(EnrollmentStatus.Active, enrollment2.Status);
    }

    [Fact]
    public async Task ReviewAsync_Reject_KeepsEnrollmentActiveAndRecordsRemarks()
    {
        using var scope = new TestDbContextScope();
        var student1 = await scope.SeedStudentAsync("Student 1", "s1@test.com");
        var student2 = await scope.SeedStudentAsync("Student 2", "s2@test.com");
        var course = await scope.SeedCourseAsync(capacity: 1);
        var enrollmentService = scope.CreateEnrollmentService();
        var cancellationService = scope.CreateCancellationService();

        var enrollment1 = await enrollmentService.CreateAsync(student1.StudentId, course.CourseId, CancellationToken.None);
        var req = await cancellationService.CreateAsync(
            student1.StudentId,
            enrollment1.EnrollmentId,
            new CreateCancellationRequest { Reason = "Dropping course" },
            CancellationToken.None);

        var reviewed = await cancellationService.ReviewAsync(
            req.CancellationRequestId,
            approve: false,
            new ReviewCancellationRequest { AdminRemarks = "Past deadline" },
            CancellationToken.None);

        Assert.Equal(CancellationStatus.Rejected, reviewed.Status);
        Assert.Equal("Past deadline", reviewed.AdminRemarks);

        // Seat remains occupied, so student2 cannot enroll
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => enrollmentService.CreateAsync(student2.StudentId, course.CourseId, CancellationToken.None));
    }
}
