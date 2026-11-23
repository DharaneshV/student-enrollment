import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { CourseService } from '../course.service';
import { CourseFilter, CourseResponse, SaveCourseRequest } from '../course.models';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './course-list.html',
  styleUrl: './course-list.css',
})
export class CourseListComponent implements OnInit {
  private courseService = inject(CourseService);

  // Course list state
  courses = signal<CourseResponse[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // Pagination
  pageNumber = signal(1);
  pageSize = signal(10);
  totalRecords = signal(0);
  totalPages = signal(0);

  // Filters
  searchTerm = signal('');
  activeFilter = signal<boolean | null>(null);
  availabilityFilter = signal<string>('');

  // Modal state
  isModalOpen = signal(false);
  isEditMode = signal(false);
  editingCourseId = signal<number | null>(null);
  editingEnrolledCount = signal(0);
  isSaving = signal(false);
  modalErrorMessage = signal('');

  // Course Form
  courseForm = new FormGroup({
    courseName: new FormControl('', [Validators.required, Validators.maxLength(150)]),
    duration: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    fees: new FormControl<number>(0, [Validators.required, Validators.min(0)]),
    capacity: new FormControl<number>(20, [Validators.required, Validators.min(1)]),
    isActive: new FormControl<boolean>(true),
  });

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const filters: CourseFilter = {};
    if (this.searchTerm().trim()) {
      filters.search = this.searchTerm().trim();
    }
    if (this.activeFilter() !== null) {
      filters.isActive = this.activeFilter();
    }
    if (this.availabilityFilter()) {
      filters.availability = this.availabilityFilter();
    }

    this.courseService.getCourses(this.pageNumber(), this.pageSize(), filters).subscribe({
      next: (response) => {
        this.courses.set(response.items);
        this.totalRecords.set(response.totalRecords);
        this.totalPages.set(response.totalPages);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading courses:', error);
        this.errorMessage.set(this.getErrorMessage(error, 'Unable to load courses.'));
        this.isLoading.set(false);
      },
    });
  }

  applyFilters(): void {
    this.pageNumber.set(1);
    this.loadCourses();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.activeFilter.set(null);
    this.availabilityFilter.set('');
    this.pageNumber.set(1);
    this.loadCourses();
  }

  openCreateModal(): void {
    this.isEditMode.set(false);
    this.editingCourseId.set(null);
    this.editingEnrolledCount.set(0);
    this.modalErrorMessage.set('');
    this.courseForm.reset({
      courseName: '',
      duration: '',
      fees: 0,
      capacity: 20,
      isActive: true,
    });
    this.isModalOpen.set(true);
  }

  openEditModal(course: CourseResponse): void {
    this.isEditMode.set(true);
    this.editingCourseId.set(course.courseId);
    this.editingEnrolledCount.set(course.enrolledCount);
    this.modalErrorMessage.set('');
    this.courseForm.patchValue({
      courseName: course.courseName,
      duration: course.duration,
      fees: course.fees,
      capacity: course.capacity,
      isActive: course.isActive,
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingCourseId.set(null);
    this.isSaving.set(false);
    this.modalErrorMessage.set('');
  }

  saveCourse(): void {
    if (this.courseForm.invalid || this.isSaving()) {
      this.courseForm.markAllAsTouched();
      return;
    }

    const formVal = this.courseForm.getRawValue();
    const capacityVal = Number(formVal.capacity);

    // Validate that capacity is not reduced below existing enrollments when editing
    if (this.isEditMode() && capacityVal < this.editingEnrolledCount()) {
      this.modalErrorMessage.set(
        `Capacity cannot be set below currently active enrollments (${this.editingEnrolledCount()}).`,
      );
      return;
    }

    this.isSaving.set(true);
    this.modalErrorMessage.set('');

    const courseData: SaveCourseRequest = {
      courseName: formVal.courseName?.trim() ?? '',
      duration: formVal.duration?.trim() ?? '',
      fees: Number(formVal.fees),
      capacity: capacityVal,
      isActive: Boolean(formVal.isActive),
    };

    const request$ = this.isEditMode()
      ? this.courseService.updateCourse(this.editingCourseId()!, courseData)
      : this.courseService.createCourse(courseData);

    request$.subscribe({
      next: (course) => {
        this.isSaving.set(false);
        this.closeModal();
        const action = this.isEditMode() ? 'updated' : 'created';
        this.successMessage.set(`Course "${course.courseName}" was ${action} successfully.`);
        this.loadCourses();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Failed to save course:', error);
        this.modalErrorMessage.set(
          this.getErrorMessage(error, 'An error occurred while saving the course.'),
        );
        this.isSaving.set(false);
      },
    });
  }

  deactivateCourse(course: CourseResponse): void {
    if (
      !confirm(
        `Are you sure you want to deactivate "${course.courseName}"?\nHistorical student enrollment records will be preserved, but new enrollments will be disabled.`,
      )
    ) {
      return;
    }

    this.courseService.deactivateCourse(course.courseId).subscribe({
      next: (res) => {
        this.successMessage.set(res?.message || `Course "${course.courseName}" was deactivated.`);
        this.loadCourses();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Failed to deactivate course:', error);
        this.errorMessage.set(this.getErrorMessage(error, 'Failed to deactivate course.'));
      },
    });
  }

  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update((page) => page + 1);
      this.loadCourses();
    }
  }

  previousPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update((page) => page - 1);
      this.loadCourses();
    }
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const body = error.error;
    if (typeof body === 'string' && body.trim()) return body;
    if (body?.detail) return body.detail;
    if (body?.message) return body.message;
    if (body?.title) return body.title;
    return fallback;
  }
}
