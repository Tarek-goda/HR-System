// features/employees/add-employee/personal-info/personal-info.ts
import { Component, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AddEmployeeState } from '../add-employee-state';

@Component({
  selector: 'app-personal-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './personal-info.html'
})
export class PersonalInfo implements OnInit {
  private fb = inject(FormBuilder);
  private state = inject(AddEmployeeState);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef); // جديد: نمسكها هنا (Injection Context مضمون)

  form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    personalEmail: ['', [Validators.required, Validators.email]],
    birthDate: ['', Validators.required],
    phone: ['', Validators.required]
  });

  ngOnInit() {
    const saved = this.state.personalInfo();
    if (saved) this.form.patchValue(saved);

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef)) // نمررها هنا صراحةً
      .subscribe(() => {
        this.state.setPersonalInfo(this.form.getRawValue());
      });
  }

  onNext() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.router.navigate(['/add-employee/JobDetails']);
  }
}