import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PagedResult } from '../../shared/models/paged-result.model';
import {
  CancellationFilter,
  CancellationResponse,
  CreateCancellationRequest,
  ReviewCancellationRequest,
} from './cancellation.models';

@Injectable({
  providedIn: 'root',
})
export class CancellationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/cancellation-requests`;

  getMyRequests(
    pageNumber = 1,
    pageSize = 10,
    filters?: CancellationFilter,
  ): Observable<PagedResult<CancellationResponse>> {
    return this.http.get<PagedResult<CancellationResponse>>(`${this.apiUrl}/my`, {
      params: this.buildParams(pageNumber, pageSize, filters),
    });
  }

  requestCancellation(
    enrollmentId: number,
    request: CreateCancellationRequest,
  ): Observable<CancellationResponse> {
    return this.http.post<CancellationResponse>(
      `${environment.apiUrl}/enrollments/${enrollmentId}/cancellation-request`,
      request,
    );
  }

  getAllRequests(
    pageNumber = 1,
    pageSize = 10,
    filters?: CancellationFilter,
  ): Observable<PagedResult<CancellationResponse>> {
    return this.http.get<PagedResult<CancellationResponse>>(this.apiUrl, {
      params: this.buildParams(pageNumber, pageSize, filters),
    });
  }

  approve(id: number, request: ReviewCancellationRequest = {}): Observable<CancellationResponse> {
    return this.http.put<CancellationResponse>(`${this.apiUrl}/${id}/approve`, request);
  }

  reject(id: number, request: ReviewCancellationRequest = {}): Observable<CancellationResponse> {
    return this.http.put<CancellationResponse>(`${this.apiUrl}/${id}/reject`, request);
  }

  private buildParams(
    pageNumber: number,
    pageSize: number,
    filters?: CancellationFilter,
  ): HttpParams {
    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    if (filters?.courseId != null) {
      params = params.set('courseId', filters.courseId);
    }
    if (filters?.status != null) {
      params = params.set('status', filters.status);
    }
    if (filters?.fromDate) {
      params = params.set('fromDate', filters.fromDate);
    }
    if (filters?.toDate) {
      params = params.set('toDate', filters.toDate);
    }

    return params;
  }
}
