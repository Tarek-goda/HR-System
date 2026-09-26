// src/app/features/auth/login/login.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/Auth/auth';
import { ToastService } from '../../../core/services/Toast/toast';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);

  isLoading = false;
  errorMessage = '';
  showPassword = false;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const { email, password } = this.loginForm.getRawValue();

      try {
        await this.authService.login(email, password);
        this.toastService.success('تم تسجيل الدخول بنجاح'); // جديد
      } catch (error: any) {
        const message = error.message ?? 'Invalid email or password. Please try again.';
        this.errorMessage = message;
        this.toastService.error(message); // جديد
      } finally {
        this.isLoading = false;
      }
    }
  }
}
