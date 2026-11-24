import { PagedResult } from '../../shared/models/paged-result.model';

export enum EnrollmentStatus {
  Active = 0,
  Cancelled = 1,
}

export interface EnrollmentResponse {
  enrollmentId: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  courseId: number;
  courseName: string;
  enrolledAt: string;
  status: EnrollmentStatus;
}

export interface CreateEnrollmentRequest {
  courseId: number;
}

export interface EnrollmentFilter {
  search?: string;
  courseId?: number | null;
  status?: number | null;
  fromDate?: string;
  toDate?: string;
}

export type EnrollmentPagedResult = PagedResult<EnrollmentResponse>;
