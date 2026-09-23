// features/employees/add-employee/job-details/job-details.ts
import { Component, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AddEmployeeState } from '../add-employee-state';
import { DepartmentsService, Department } from '../../../../core/services/Departments/departments';

@Component({
  selector: 'app-job-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './job-details.html',
})
export class JobDetails implements OnInit {
  private fb = inject(FormBuilder);
  private state = inject(AddEmployeeState);
  private router = inject(Router);
  private departmentsService = inject(DepartmentsService);
  private destroyRef = inject(DestroyRef); // جديد

  departments: Department[] = [];
  isLoadingDepartments = true;

  form = this.fb.nonNullable.group({
    jobTitle: ['', Validators.required],
    department: ['', Validators.required],
    systemRole: ['employee', Validators.required],
    hireDate: ['', Validators.required],
    salary: [0, [Validators.required, Validators.min(0)]],
  });

  async ngOnInit() {
    this.departments = await this.departmentsService.getAll();
    this.isLoadingDepartments = false;

    await Promise.resolve();

    const saved = this.state.jobDetails();
    if (saved) {
      this.form.patchValue(saved);
    }

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef)) // نمررها هنا صراحةً بدل الاعتماد التلقائي
      .subscribe(() => {
        this.state.setJobDetails(this.form.getRawValue());
      });
  }

  onBack() {
    this.router.navigate(['/add-employee/PersonalInfo']);
  }

  onNext() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.router.navigate(['/add-employee/Credentials']);
  }
}