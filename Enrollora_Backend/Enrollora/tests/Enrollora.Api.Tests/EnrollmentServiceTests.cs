using Enrollora.Api.Models;

namespace Enrollora.Api.Tests;

public sealed class EnrollmentServiceTests
{
    [Fact]
    public async Task CreateAsync_ApprovedStudentAndAvailableSeats_CreatesActiveEnrollment()
    {
        using var scope = new TestDbContextScope();
        var student = await scope.SeedStudentAsync(status: StudentStatus.Approved);
        var course = await scope.SeedCourseAsync(capacity: 5);
        var service = scope.CreateEnrollmentService();

        var result = await service.CreateAsync(student.StudentId, course.CourseId, CancellationToken.None);

        Assert.Equal(student.StudentId, result.StudentId);
        Assert.Equal(course.CourseId, result.CourseId);
        Assert.Equal(EnrollmentStatus.Active, result.Status);
    }

    [Fact]
    public async Task CreateAsync_PendingStudent_ThrowsInvalidOperationException()
    {
        using var scope = new TestDbContextScope();
        var student = await scope.SeedStudentAsync(status: StudentStatus.Pending);
        var course = await scope.SeedCourseAsync(capacity: 5);
        var service = scope.CreateEnrollmentService();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CreateAsync(student.StudentId, course.CourseId, CancellationToken.None));

        Assert.Contains("approved", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateAsync_InactiveCourse_ThrowsInvalidOperationException()
    {
        using var scope = new TestDbContextScope();
        var student = await scope.SeedStudentAsync(status: StudentStatus.Approved);
        var course = await scope.SeedCourseAsync(isActive: false);
        var service = scope.CreateEnrollmentService();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CreateAsync(student.StudentId, course.CourseId, CancellationToken.None));

        Assert.Contains("not available", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateAsync_DuplicateActiveEnrollment_ThrowsInvalidOperationException()
    {
        using var scope = new TestDbContextScope();
        var student = await scope.SeedStudentAsync(status: StudentStatus.Approved);
        var course = await scope.SeedCourseAsync(capacity: 5);
        var service = scope.CreateEnrollmentService();

        await service.CreateAsync(student.StudentId, course.CourseId, CancellationToken.None);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CreateAsync(student.StudentId, course.CourseId, CancellationToken.None));

        Assert.Contains("already", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateAsync_CourseAtFullCapacity_ThrowsInvalidOperationException()
    {
        using var scope = new TestDbContextScope();
        var student1 = await scope.SeedStudentAsync("Student 1", "s1@test.com");
        var student2 = await scope.SeedStudentAsync("Student 2", "s2@test.com");
        var course = await scope.SeedCourseAsync(capacity: 1);
        var service = scope.CreateEnrollmentService();

        await service.CreateAsync(student1.StudentId, course.CourseId, CancellationToken.None);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CreateAsync(student2.StudentId, course.CourseId, CancellationToken.None));

        Assert.Contains("capacity", ex.Message, StringComparison.OrdinalIgnoreCase);
    }
}
