// core/guards/owner-guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth';

export const ownerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser$.value;
  if (user?.role === 'owner') return true;

  router.navigate(['/dashboard']);
  return false;
};