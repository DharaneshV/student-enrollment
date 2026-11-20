import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EnrollmentResponse } from '../../enrollment.models';
import { EnrollmentService } from '../../enrollment.service';
import {
  CancellationResponse,
  CancellationStatus,
} from '../../cancellation.models';
import { CancellationService } from '../../cancellation.service';

@Component({
  selector: 'app-my-enrollments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './my-enrollments.css',
  templateUrl: './my-enrollments.html',
})
export class MyEnrollments implements OnInit {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly cancellationService = inject(CancellationService);

  activeTab = signal<'enrollments' | 'cancellations'>('enrollments');

  // Enrollments signals
  enrollments = signal<EnrollmentResponse[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  pageNumber = signal(1);
  pageSize = signal(10);
  totalRecords = signal(0);
  totalPages = signal(0);

  // Cancellation requests signals
  cancellations = signal<CancellationResponse[]>([]);
  isCancelLoading = signal(false);
  cancelError = signal('');
  cancelPageNumber = signal(1);
  cancelPageSize = signal(10);
  cancelTotalRecords = signal(0);
  cancelTotalPages = signal(0);

  // Modal state
  selectedEnrollment = signal<EnrollmentResponse | null>(null);
  cancellationReason = signal('');
  isSubmittingCancel = signal(false);
  modalErrorMessage = signal('');
  successAlertMessage = signal('');

  ngOnInit(): void {
    this.loadEnrollments();
  }

  setTab(tab: 'enrollments' | 'cancellations'): void {
    this.activeTab.set(tab);
    if (tab === 'enrollments' && this.enrollments().length === 0) {
      this.loadEnrollments();
    } else if (tab === 'cancellations') {
      this.loadCancellations();
    }
  }

  loadEnrollments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.enrollmentService
      .getMyEnrollments(this.pageNumber(), this.pageSize())
      .subscribe({
        next: (response) => {
          this.enrollments.set(response.items);
          this.totalRecords.set(response.totalRecords);
          this.totalPages.set(response.totalPages);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.getErrorMessage(error, 'Unable to load your enrollments.'));
          this.isLoading.set(false);
        },
      });
  }

  loadCancellations(): void {
    this.isCancelLoading.set(true);
    this.cancelError.set('');

    this.cancellationService
      .getMyRequests(this.cancelPageNumber(), this.cancelPageSize())
      .subscribe({
        next: (response) => {
          this.cancellations.set(response.items);
          this.cancelTotalRecords.set(response.totalRecords);
          this.cancelTotalPages.set(response.totalPages);
          this.isCancelLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.cancelError.set(
            this.getErrorMessage(error, 'Unable to load cancellation requests.'),
          );
          this.isCancelLoading.set(false);
        },
      });
  }

  openCancelModal(enrollment: EnrollmentResponse): void {
    this.selectedEnrollment.set(enrollment);
    this.cancellationReason.set('');
    this.modalErrorMessage.set('');
  }

  closeCancelModal(): void {
    this.selectedEnrollment.set(null);
    this.cancellationReason.set('');
    this.modalErrorMessage.set('');
    this.isSubmittingCancel.set(false);
  }

  submitCancellation(): void {
    const enrollment = this.selectedEnrollment();
    const reason = this.cancellationReason().trim();

    if (!enrollment) return;

    if (!reason) {
      this.modalErrorMessage.set('Please provide a reason for cancellation.');
      return;
    }

    this.isSubmittingCancel.set(true);
    this.modalErrorMessage.set('');

    this.cancellationService
      .requestCancellation(enrollment.enrollmentId, { reason })
      .subscribe({
        next: () => {
          this.isSubmittingCancel.set(false);
          this.closeCancelModal();
          this.successAlertMessage.set(
            `Cancellation request for "${enrollment.courseName}" submitted successfully. It is now awaiting administrator review.`,
          );
          this.loadEnrollments();
          if (this.activeTab() === 'cancellations') {
            this.loadCancellations();
          }
        },
        error: (error: HttpErrorResponse) => {
          this.modalErrorMessage.set(
            this.getErrorMessage(error, 'Failed to submit cancellation request.'),
          );
          this.isSubmittingCancel.set(false);
        },
      });
  }

  statusLabel(status: number): string {
    return status === 1 ? 'Active' : 'Cancelled';
  }

  cancellationStatusLabel(status: number): string {
    switch (status) {
      case CancellationStatus.Approved:
        return 'Approved';
      case CancellationStatus.Rejected:
        return 'Rejected';
      default:
        return 'Pending';
    }
  }

  previousPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update((page) => page - 1);
      this.loadEnrollments();
    }
  }

  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update((page) => page + 1);
      this.loadEnrollments();
    }
  }

  previousCancelPage(): void {
    if (this.cancelPageNumber() > 1) {
      this.cancelPageNumber.update((page) => page - 1);
      this.loadCancellations();
    }
  }

  nextCancelPage(): void {
    if (this.cancelPageNumber() < this.cancelTotalPages()) {
      this.cancelPageNumber.update((page) => page + 1);
      this.loadCancellations();
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
