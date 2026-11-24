import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

import { StudentService } from '../student.service';
import { StudentResponse, StudentFilter, UpdateStudentRequest } from '../student.models';
import { EnrollmentService } from '../../../enrollments/enrollment.service';
import { EnrollmentResponse } from '../../../enrollments/enrollment.models';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, ReactiveFormsModule],
  templateUrl: './student-list.html',
  styleUrl: './student-list.css',
})
export class StudentList implements OnInit {
  private studentService = inject(StudentService);
  private enrollmentService = inject(EnrollmentService);
  private cdr = inject(ChangeDetectorRef);

  students: StudentResponse[] = [];

  isLoading = false;
  errorMessage = '';
  actionMessage = '';
  actionError = '';

  pageNumber = 1;
  pageSize = 5;
  totalRecords = 0;
  totalPages = 0;

  selectedStudent: StudentResponse | null = null;
  studentEnrollments: EnrollmentResponse[] = [];
  isDetailsLoading = false;
  isEnrollmentsLoading = false;
  detailsError = '';

  isEditModalOpen = false;
  editingStudentId: number | null = null;
  editError = '';

  filters: StudentFilter = {
    search: '',
    status: null,
    department: '',
    minAge: null,
    maxAge: null,
    minCgpa: null,
    maxCgpa: null,
  };

  studentForm = new FormGroup({
    name: new FormControl('', Validators.required),
    email: new FormControl({ value: '', disabled: true }),
    department: new FormControl('', Validators.required),
    age: new FormControl(18, [Validators.required, Validators.min(17), Validators.max(60)]),
    cgpa: new FormControl(0, [Validators.required, Validators.min(0), Validators.max(10)]),
  });

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.studentService.getStudents(this.pageNumber, this.pageSize, this.filters).subscribe({
      next: (response) => {
        this.students = response.items;
        this.totalRecords = response.totalRecords;
        this.totalPages = response.totalPages;
        this.pageNumber = response.pageNumber;
        this.pageSize = response.pageSize;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load students:', error);
        this.errorMessage = 'Unable to load students.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  approveStudent(id: number): void {
    if (!confirm('Are you sure you want to approve this student?')) {
      return;
    }

    this.actionMessage = '';
    this.actionError = '';

    this.studentService.approveStudent(id).subscribe({
      next: (response) => {
        this.actionMessage = response.message || 'Student approved.';
        this.loadStudents();
      },
      error: (error) => {
        this.actionError = error.error?.detail || error.error?.message || 'Unable to approve student.';
        this.cdr.markForCheck();
      },
    });
  }

  rejectStudent(id: number): void {
    if (!confirm('Are you sure you want to reject this student?')) {
      return;
    }

    this.actionMessage = '';
    this.actionError = '';

    this.studentService.rejectStudent(id).subscribe({
      next: (response) => {
        this.actionMessage = response.message || 'Student rejected.';
        this.loadStudents();
      },
      error: (error) => {
        this.actionError = error.error?.detail || error.error?.message || 'Unable to reject student.';
        this.cdr.markForCheck();
      },
    });
  }

  goToPreviousPage(): void {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.loadStudents();
    }
  }

  goToNextPage(): void {
    if (this.pageNumber < this.totalPages) {
      this.pageNumber++;
      this.loadStudents();
    }
  }

  changePageSize(size: string): void {
    this.pageSize = Number(size);
    this.pageNumber = 1;
    this.loadStudents();
  }

  applyFilters(): void {
    this.pageNumber = 1;
    this.loadStudents();
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      status: null,
      department: '',
      minAge: null,
      maxAge: null,
      minCgpa: null,
      maxCgpa: null,
    };

    this.pageNumber = 1;
    this.loadStudents();
  }

  viewStudent(id: number): void {
    this.selectedStudent = null;
    this.studentEnrollments = [];
    this.isDetailsLoading = true;
    this.isEnrollmentsLoading = true;
    this.detailsError = '';

    this.studentService.getStudentById(id).subscribe({
      next: (student) => {
        this.selectedStudent = student;
        this.isDetailsLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load student details:', error);
        this.detailsError = 'Unable to load student details.';
        this.isDetailsLoading = false;
        this.cdr.markForCheck();
      },
    });

    this.enrollmentService.getEnrollmentsByStudent(id, 1, 20).subscribe({
      next: (res) => {
        this.studentEnrollments = res.items;
        this.isEnrollmentsLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load student enrollments:', error);
        this.isEnrollmentsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  editStudent(id: number): void {
    this.editingStudentId = id;
    this.editError = '';
    this.isEditModalOpen = true;

    this.studentService.getStudentById(id).subscribe({
      next: (student) => {
        this.studentForm.patchValue({
          name: student.name,
          email: student.email,
          department: student.department,
          age: student.age,
          cgpa: student.cgpa,
        });
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load student details', error);
        this.editError = 'Unable to load student details.';
        this.cdr.markForCheck();
      },
    });
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editingStudentId = null;
    this.editError = '';
    this.studentForm.reset({
      name: '',
      email: '',
      department: '',
      age: 18,
      cgpa: 0,
    });
  }

  updateStudent(): void {
    if (this.studentForm.invalid || this.editingStudentId === null) {
      this.studentForm.markAllAsTouched();
      return;
    }

    this.editError = '';
    const formValue = this.studentForm.getRawValue();

    const studentData: UpdateStudentRequest = {
      name: formValue.name!.trim(),
      department: formValue.department!.trim(),
      age: Number(formValue.age),
      cgpa: Number(formValue.cgpa),
    };

    this.studentService.updateStudent(this.editingStudentId, studentData).subscribe({
      next: () => {
        this.actionMessage = 'Student updated successfully.';
        this.actionError = '';
        this.closeEditModal();
        this.loadStudents();
      },
      error: (error) => {
        this.editError =
          error.error?.detail || error.error?.message || 'Failed to update student.';
        this.cdr.markForCheck();
      },
    });
  }

  deleteStudent(id: number): void {
    if (!confirm('Are you sure you want to delete this student?')) {
      return;
    }

    this.actionMessage = '';
    this.actionError = '';

    this.studentService.deleteStudent(id).subscribe({
      next: () => {
        this.actionMessage = 'Student deleted successfully.';
        this.loadStudents();
      },
      error: (error) => {
        this.actionError =
          error.error?.detail || error.error?.message || 'Unable to delete student.';
        this.cdr.markForCheck();
      },
    });
  }
}
