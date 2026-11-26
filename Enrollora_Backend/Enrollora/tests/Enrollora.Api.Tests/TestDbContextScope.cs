using Enrollora.Api.Data;
using Enrollora.Api.Models;
using Enrollora.Api.Repositories;
using Enrollora.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace Enrollora.Api.Tests;

public sealed class TestDbContextScope : IDisposable
{
    private readonly SqliteConnection _connection;
    public ApplicationDbContext Db { get; }

    public TestDbContextScope()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(_connection)
            .ReplaceService<IModelCustomizer, SqliteDecimalModelCustomizer>()
            .Options;

        Db = new ApplicationDbContext(options);
        Db.Database.EnsureCreated();
    }

    private sealed class SqliteDecimalModelCustomizer(ModelCustomizerDependencies dependencies)
        : ModelCustomizer(dependencies)
    {
        public override void Customize(ModelBuilder modelBuilder, DbContext context)
        {
            base.Customize(modelBuilder, context);

            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entityType.GetProperties())
                {
                    if (property.ClrType == typeof(decimal) || property.ClrType == typeof(decimal?))
                    {
                        property.SetColumnType("REAL");
                    }
                }
            }
        }
    }

    public IRepository<T> Repo<T>() where T : class => new Repository<T>(Db);

    public EnrollmentService CreateEnrollmentService() =>
        new(Db, Repo<Enrollment>(), Repo<Student>(), Repo<Course>());

    public CancellationRequestService CreateCancellationService() =>
        new(Repo<CancellationRequest>(), Repo<Enrollment>());

    public CourseService CreateCourseService() =>
        new(Repo<Course>(), Repo<Enrollment>());

    public async Task<Student> SeedStudentAsync(
        string name = "Test Student",
        string email = "student@enrollora.test",
        StudentStatus status = StudentStatus.Approved)
    {
        var student = new Student
        {
            Name = name,
            Email = email,
            PasswordHash = "hashed",
            Department = "Computer Science",
            Age = 20,
            CGPA = 8.5m,
            Status = status,
            RegisteredAt = DateTime.UtcNow
        };
        Db.Students.Add(student);
        await Db.SaveChangesAsync();
        return student;
    }

    public async Task<Course> SeedCourseAsync(
        string name = ".NET Core Web API",
        int capacity = 2,
        bool isActive = true)
    {
        var course = new Course
        {
            CourseName = name,
            Duration = "8 Weeks",
            Fees = 15000m,
            Capacity = capacity,
            IsActive = isActive
        };
        Db.Courses.Add(course);
        await Db.SaveChangesAsync();
        return course;
    }

    public void Dispose()
    {
        Db.Dispose();
        _connection.Dispose();
    }
}
