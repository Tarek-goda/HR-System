// src/app/core/guards/guest.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/Supabase/supabase';
import { map } from 'rxjs/operators';
import { from } from 'rxjs';

export const guestGuard: CanActivateFn = () => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  return from(supabaseService.client.auth.getSession()).pipe(
    map(({ data }) => {
      if (data.session) {
        router.navigate(['/dashboard']);
        return false;
      }
      return true;
    })
  );
};