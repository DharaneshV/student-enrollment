import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { StudentResponse, UpdateStudentRequest } from '../../admin/students/student.models';
import { StudentService } from '../../admin/students/student.service';
import { TokenService } from '../../../core/auth/token.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private readonly studentService = inject(StudentService);
  private readonly tokenService = inject(TokenService);

  student = signal<StudentResponse | null>(null);
  isLoading = signal(true);
  isSaving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  profileForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(120)]),
    department: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    age: new FormControl<number>(18, [
      Validators.required,
      Validators.min(17),
      Validators.max(60),
    ]),
    cgpa: new FormControl<number>(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(10),
    ]),
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.studentService.getMe().subscribe({
      next: (student) => {
        this.student.set(student);
        this.profileForm.patchValue({
          name: student.name,
          department: student.department,
          age: student.age,
          cgpa: student.cgpa,
        });
        if (student.name) {
          this.tokenService.setName(student.name);
        }
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Unable to load profile.'));
        this.isLoading.set(false);
      },
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.isSaving()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const formValue = this.profileForm.getRawValue();
    const updateRequest: UpdateStudentRequest = {
      name: formValue.name ?? '',
      email: this.student()?.email ?? '',
      department: formValue.department ?? '',
      age: Number(formValue.age),
      cgpa: Number(formValue.cgpa),
    };

    this.studentService.updateMe(updateRequest).subscribe({
      next: (updated) => {
        this.student.set(updated);
        this.tokenService.setName(updated.name);
        this.successMessage.set('Profile updated successfully!');
        this.isSaving.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Failed to update profile.'));
        this.isSaving.set(false);
      },
    });
  }

  statusLabel(status: number): string {
    switch (status) {
      case 1:
        return 'Approved';
      case 2:
        return 'Rejected';
      default:
        return 'Pending';
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
