// src/app/core/services/Auth/auth.ts
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from '../Supabase/supabase';

export type UserRole = 'owner' | 'hr_manager' | 'hr_specialist' | 'employee';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: UserRole;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  currentUser$ = new BehaviorSubject<UserProfile | null>(null);

  constructor() {
    this.restoreSession();
  }

  // جديد: استرجاع الجلسة تلقائياً عند تحميل التطبيق (مثلاً بعد Refresh)
  async restoreSession(): Promise<void> {
    const { data } = await this.supabaseService.client.auth.getSession();
    if (!data.session) return;

    const { data: profile, error } = await this.supabaseService.client
      .from('profiles')
      .select('*')
      .eq('id', data.session.user.id)
      .single();

    if (error || !profile) return;

    this.currentUser$.next({
      id: profile['id'],
      email: profile['email'],
      name: profile['name'],
      avatar_url: profile['avatar_url'],
      role: profile['role'],
    });
  }

  async login(email: string, pass: string): Promise<void> {
    // 1. تسجيل الدخول عبر Supabase
    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error || !data.user) {
      throw new Error('Invalid email or password. Please try again.');
    }

    const uid = data.user.id;

    // 2. قراءة بيانات المستخدم من جدول profiles
    const { data: profile, error: profileError } = await this.supabaseService.client
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();

    if (profileError || !profile) {
      throw new Error('بيانات المستخدم غير مسجلة في profiles');
    }

    const fullProfile: UserProfile = {
      id: profile['id'],
      email: profile['email'],
      name: profile['name'],
      avatar_url: profile['avatar_url'],
      role: profile['role'],
    };

    this.currentUser$.next(fullProfile);

    // 3. التوجيه بناءً على الـ Role
    if (
      fullProfile.role === 'owner' ||
      fullProfile.role === 'hr_manager' ||
      fullProfile.role === 'hr_specialist'
    ) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/dashboard']); // مؤقتاً، لحد ما تُبنى /employee-portal فعلياً
    }
  }

  async logout() {
    await this.supabaseService.client.auth.signOut();
    this.currentUser$.next(null);
    this.router.navigate(['/login']);
  }
}
