import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { EnrollmentService } from '../../enrollment.service';
import {
  EnrollmentFilter,
  EnrollmentResponse,
  EnrollmentStatus,
} from '../../enrollment.models';
import { CourseService } from '../../../admin/courses/course.service';
import { CourseResponse } from '../../../admin/courses/course.models';

@Component({
  selector: 'app-enrollment-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './enrollment-list.html',
  styleUrl: './enrollment-list.css',
})
export class EnrollmentListComponent implements OnInit {
  readonly EnrollmentStatus = EnrollmentStatus;
  private enrollmentService = inject(EnrollmentService);
  private courseService = inject(CourseService);

  enrollments = signal<EnrollmentResponse[]>([]);
  courses = signal<CourseResponse[]>([]);

  isLoading = signal(false);
  errorMessage = signal('');

  pageNumber = signal(1);
  pageSize = signal(10);
  totalRecords = signal(0);
  totalPages = signal(0);

  // Filters
  searchTerm = signal('');
  selectedCourseId = signal<number | null>(null);
  statusFilter = signal<number | null>(null);
  fromDate = signal('');
  toDate = signal('');

  ngOnInit(): void {
    this.loadCourses();
    this.loadEnrollments();
  }

  loadCourses(): void {
    this.courseService.getCourses(1, 100).subscribe({
      next: (response) => {
        this.courses.set(response.items);
      },
      error: (error) => {
        console.error('Error loading courses for filter:', error);
      },
    });
  }

  loadEnrollments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const filters: EnrollmentFilter = {};
    if (this.searchTerm().trim()) {
      filters.search = this.searchTerm().trim();
    }
    if (this.selectedCourseId() !== null) {
      filters.courseId = this.selectedCourseId();
    }
    if (this.statusFilter() !== null) {
      filters.status = this.statusFilter();
    }
    if (this.fromDate()) {
      filters.fromDate = this.fromDate();
    }
    if (this.toDate()) {
      filters.toDate = this.toDate();
    }

    this.enrollmentService
      .getEnrollments(this.pageNumber(), this.pageSize(), filters)
      .subscribe({
        next: (response) => {
          this.enrollments.set(response.items);
          this.totalRecords.set(response.totalRecords);
          this.totalPages.set(response.totalPages);
          this.isLoading.set(false);
        },

        error: (error) => {
          console.error('Error loading enrollments:', error);
          this.errorMessage.set('Unable to load enrollments.');
          this.isLoading.set(false);
        },
      });
  }

  applyFilters(): void {
    this.pageNumber.set(1);
    this.loadEnrollments();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedCourseId.set(null);
    this.statusFilter.set(null);
    this.fromDate.set('');
    this.toDate.set('');
    this.pageNumber.set(1);
    this.loadEnrollments();
  }

  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update((page) => page + 1);
      this.loadEnrollments();
    }
  }

  previousPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update((page) => page - 1);
      this.loadEnrollments();
    }
  }
}
