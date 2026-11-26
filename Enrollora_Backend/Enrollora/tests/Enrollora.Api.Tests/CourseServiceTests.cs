using Enrollora.Api.DTOs;

namespace Enrollora.Api.Tests;

public sealed class CourseServiceTests
{
    [Fact]
    public async Task CreateAsync_ValidCourse_ReturnsCreatedCourseWithFullAvailability()
    {
        using var scope = new TestDbContextScope();
        var service = scope.CreateCourseService();

        var created = await service.CreateAsync(new SaveCourseRequest
        {
            CourseName = "Angular 22 Mastery",
            Duration = "6 Weeks",
            Fees = 12000m,
            Capacity = 30,
            IsActive = true
        }, CancellationToken.None);

        Assert.Equal("Angular 22 Mastery", created.CourseName);
        Assert.Equal(0, created.EnrolledCount);
        Assert.Equal(30, created.AvailableSeats);
        Assert.True(created.IsActive);
    }

    [Fact]
    public async Task UpdateAsync_CapacityBelowActiveEnrollments_ThrowsInvalidOperationException()
    {
        using var scope = new TestDbContextScope();
        var s1 = await scope.SeedStudentAsync("S1", "s1@test.com");
        var s2 = await scope.SeedStudentAsync("S2", "s2@test.com");
        var course = await scope.SeedCourseAsync(capacity: 5);
        var enrollmentService = scope.CreateEnrollmentService();
        var courseService = scope.CreateCourseService();

        await enrollmentService.CreateAsync(s1.StudentId, course.CourseId, CancellationToken.None);
        await enrollmentService.CreateAsync(s2.StudentId, course.CourseId, CancellationToken.None);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => courseService.UpdateAsync(course.CourseId, new SaveCourseRequest
            {
                CourseName = course.CourseName,
                Duration = course.Duration,
                Fees = course.Fees,
                Capacity = 1,
                IsActive = true
            }, CancellationToken.None));

        Assert.Contains("lower than current active enrollments", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task DeactivateAsync_ActiveCourse_MarksInactiveAndPreservesEnrollments()
    {
        using var scope = new TestDbContextScope();
        var student = await scope.SeedStudentAsync();
        var course = await scope.SeedCourseAsync(capacity: 5);
        var enrollmentService = scope.CreateEnrollmentService();
        var courseService = scope.CreateCourseService();

        await enrollmentService.CreateAsync(student.StudentId, course.CourseId, CancellationToken.None);

        await courseService.DeactivateAsync(course.CourseId, CancellationToken.None);

        var updated = await courseService.GetByIdAsync(course.CourseId, CancellationToken.None);
        Assert.False(updated.IsActive);
        Assert.Equal(1, updated.EnrolledCount);
    }

    [Fact]
    public async Task GetCoursesAsync_AvailabilityFilter_FiltersAvailableAndFullCourses()
    {
        using var scope = new TestDbContextScope();
        var student = await scope.SeedStudentAsync();
        var fullCourse = await scope.SeedCourseAsync("Full Course", capacity: 1);
        var openCourse = await scope.SeedCourseAsync("Open Course", capacity: 3);
        var enrollmentService = scope.CreateEnrollmentService();
        var courseService = scope.CreateCourseService();

        await enrollmentService.CreateAsync(student.StudentId, fullCourse.CourseId, CancellationToken.None);

        var availableResult = await courseService.GetCoursesAsync(
            new CourseQuery { Availability = "available" }, CancellationToken.None);
        Assert.Single(availableResult.Items);
        Assert.Equal(openCourse.CourseId, availableResult.Items[0].CourseId);

        var fullResult = await courseService.GetCoursesAsync(
            new CourseQuery { Availability = "full" }, CancellationToken.None);
        Assert.Single(fullResult.Items);
        Assert.Equal(fullCourse.CourseId, fullResult.Items[0].CourseId);
    }
}
