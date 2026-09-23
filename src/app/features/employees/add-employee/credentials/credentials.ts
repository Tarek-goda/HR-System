// features/employees/add-employee/credentials/credentials.ts
import { Component, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SupabaseService } from '../../../../core/services/Supabase/supabase';
import { AddEmployeeState } from '../add-employee-state';

// ⬇️ الدالة لازم تكون هنا، فوق الـ @Component وبرّه الـ class تماماً
function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-credentials',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './credentials.html',
})
export class Credentials implements OnInit {
  private fb = inject(FormBuilder);
  private supabaseService = inject(SupabaseService);
  private state = inject(AddEmployeeState);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  isSubmitting = false;
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatchValidator });

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onBack() {
    this.router.navigate(['/add-employee/JobDetails']);
  }

  ngOnInit() {
    const saved = this.state.credentials();
    if (saved) {
      this.form.patchValue({ email: saved.email, password: saved.password });
    }

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const { email, password } = this.form.getRawValue();
        this.state.setCredentials({ email, password });
      });
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.state.isReadyToSubmit()) {
      this.errorMessage = 'من فضلك أكمل الخطوات السابقة أولاً';
      return;
    }

    const { email, password, confirmPassword } = this.form.getRawValue();
    if (password !== confirmPassword) {
      this.errorMessage = 'كلمة المرور غير متطابقة';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const payload = this.state.getFullPayload();
      const { data: sessionData } = await this.supabaseService.client.auth.getSession();

      const response = await fetch(`${this.supabaseService.url}/functions/v1/create-employee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        this.errorMessage = result.error ?? 'حدث خطأ أثناء إنشاء الحساب';
        return;
      }

      const photo = this.state.photoFile();
      if (photo && result.user_id) {
        await this.uploadEmployeePhoto(result.user_id, photo);
      }

      this.state.reset();
      this.router.navigate(['/directory']);
    } catch (err) {
      this.errorMessage = 'حدث خطأ غير متوقع، حاول مرة أخرى';
    } finally {
      this.isSubmitting = false;
    }
  }

  private async uploadEmployeePhoto(userId: string, file: File): Promise<void> {
    const filePath = `${userId}/avatar.${file.name.split('.').pop()}`;
    const { error } = await this.supabaseService.client.storage
      .from('employee-documents')
      .upload(filePath, file, { upsert: true });

    if (error) {
      console.warn('فشل رفع الصورة:', error.message);
    }
  }
}