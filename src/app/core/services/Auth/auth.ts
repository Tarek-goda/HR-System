// core/services/auth/auth.ts
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from '../supabase/supabase';
import { ProfileService } from '../profile/profile';

export type UserRole = 'owner' | 'hr_manager' | 'hr_specialist' | 'employee';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string; // دلوقتي هيبقى رابط جاهز مش مسار
  role: UserRole;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabaseService = inject(SupabaseService);
  private profileService = inject(ProfileService);
  private router = inject(Router);

  currentUser$ = new BehaviorSubject<UserProfile | null>(null);

  constructor() {
    this.restoreSession();
  }

  private async buildUserProfile(profile: any): Promise<UserProfile> {
    const avatarPath = profile['avatar_url'];
    const avatarUrl = avatarPath
      ? await this.profileService.getAvatarSignedUrl(avatarPath)
      : undefined;

    return {
      id: profile['id'],
      email: profile['email'],
      name: profile['full_name'],
      avatar_url: avatarUrl ?? undefined,
      role: profile['role']
    };
  }

  async restoreSession(): Promise<void> {
    const { data } = await this.supabaseService.client.auth.getSession();
    if (!data.session) return;

    const { data: profile, error } = await this.supabaseService.client
      .from('profiles')
      .select('*')
      .eq('id', data.session.user.id)
      .single();

    if (error || !profile) return;

    this.currentUser$.next(await this.buildUserProfile(profile));
  }

  async login(email: string, pass: string): Promise<void> {
    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
      email,
      password: pass
    });

    if (error || !data.user) {
      throw new Error('Invalid email or password. Please try again.');
    }

    const { data: profile, error: profileError } = await this.supabaseService.client
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('بيانات المستخدم غير مسجلة في profiles');
    }

    const fullProfile = await this.buildUserProfile(profile);
    this.currentUser$.next(fullProfile);
    this.router.navigate(['/dashboard']);
  }

  async logout() {
    await this.supabaseService.client.auth.signOut();
    this.currentUser$.next(null);
    this.router.navigate(['/login']);
  }

  // جديد: نادِها بعد أي حفظ ناجح في صفحة الـ Profile، عشان الـ Header يتحدّث فوراً
  async refreshCurrentUser() {
    await this.restoreSession();
  }
}