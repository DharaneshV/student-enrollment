import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  CancellationFilter,
  CancellationResponse,
  CancellationStatus,
} from '../../enrollments/cancellation.models';
import { CancellationService } from '../../enrollments/cancellation.service';

@Component({
  selector: 'app-cancellation-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancellation-requests.html',
  styleUrl: './cancellation-requests.css',
})
export class CancellationRequests implements OnInit {
  private readonly cancellationService = inject(CancellationService);

  // Table state
  requests = signal<CancellationResponse[]>([]);
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
  statusFilter = signal<number | null>(null);

  // Review Modal state
  selectedRequest = signal<CancellationResponse | null>(null);
  reviewAction = signal<'approve' | 'reject' | null>(null);
  adminRemarks = signal('');
  isSubmittingReview = signal(false);
  modalErrorMessage = signal('');

  // KPI Metrics
  totalCount = signal(0);
  pendingCount = signal(0);
  approvedCount = signal(0);
  rejectedCount = signal(0);

  ngOnInit(): void {
    this.loadRequests();
    this.loadMetrics();
  }

  loadRequests(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const filters: CancellationFilter = {};
    if (this.searchTerm().trim()) {
      filters.search = this.searchTerm().trim();
    }
    if (this.statusFilter() !== null) {
      filters.status = this.statusFilter();
    }

    this.cancellationService
      .getAllRequests(this.pageNumber(), this.pageSize(), filters)
      .subscribe({
        next: (response) => {
          this.requests.set(response.items);
          this.totalRecords.set(response.totalRecords);
          this.totalPages.set(response.totalPages);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.getErrorMessage(error, 'Unable to load cancellation requests.'),
          );
          this.isLoading.set(false);
        },
      });
  }

  loadMetrics(): void {
    // Query total count
    this.cancellationService.getAllRequests(1, 1).subscribe({
      next: (res) => this.totalCount.set(res.totalRecords),
    });

    // Query pending count
    this.cancellationService
      .getAllRequests(1, 1, { status: CancellationStatus.Pending })
      .subscribe({
        next: (res) => this.pendingCount.set(res.totalRecords),
      });

    // Query approved count
    this.cancellationService
      .getAllRequests(1, 1, { status: CancellationStatus.Approved })
      .subscribe({
        next: (res) => this.approvedCount.set(res.totalRecords),
      });

    // Query rejected count
    this.cancellationService
      .getAllRequests(1, 1, { status: CancellationStatus.Rejected })
      .subscribe({
        next: (res) => this.rejectedCount.set(res.totalRecords),
      });
  }

  applyFilters(): void {
    this.pageNumber.set(1);
    this.loadRequests();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set(null);
    this.pageNumber.set(1);
    this.loadRequests();
  }

  openReviewModal(
    request: CancellationResponse,
    action: 'approve' | 'reject',
  ): void {
    this.selectedRequest.set(request);
    this.reviewAction.set(action);
    this.adminRemarks.set('');
    this.modalErrorMessage.set('');
  }

  closeReviewModal(): void {
    this.selectedRequest.set(null);
    this.reviewAction.set(null);
    this.adminRemarks.set('');
    this.modalErrorMessage.set('');
    this.isSubmittingReview.set(false);
  }

  submitReview(): void {
    const request = this.selectedRequest();
    const action = this.reviewAction();
    if (!request || !action) return;

    this.isSubmittingReview.set(true);
    this.modalErrorMessage.set('');

    const remarks = this.adminRemarks().trim();
    const apiCall =
      action === 'approve'
        ? this.cancellationService.approve(request.cancellationRequestId, {
            adminRemarks: remarks || undefined,
          })
        : this.cancellationService.reject(request.cancellationRequestId, {
            adminRemarks: remarks || undefined,
          });

    apiCall.subscribe({
      next: () => {
        this.isSubmittingReview.set(false);
        const actionVerb = action === 'approve' ? 'approved' : 'rejected';
        this.successMessage.set(
          `Cancellation request for "${request.studentName}" on course "${request.courseName}" was ${actionVerb} successfully.`,
        );
        this.closeReviewModal();
        this.loadRequests();
        this.loadMetrics();
      },
      error: (error: HttpErrorResponse) => {
        this.modalErrorMessage.set(
          this.getErrorMessage(error, `Failed to ${action} request.`),
        );
        this.isSubmittingReview.set(false);
      },
    });
  }

  statusLabel(status: number): string {
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
      this.pageNumber.update((p) => p - 1);
      this.loadRequests();
    }
  }

  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update((p) => p + 1);
      this.loadRequests();
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
