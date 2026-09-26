// core/services/ProfileService/profile.ts
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../Supabase/supabase';

export interface ProfileDetails {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  job_title: string | null;
  employee_id: string | null; // id الصف في جدول employees، محتاجه وقت التحديث
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private supabaseService = inject(SupabaseService);

  async getProfile(profileId: string): Promise<ProfileDetails | null> {
    const { data: profile, error: profileError } = await this.supabaseService.client
      .from('profiles')
      .select('id, email, full_name, avatar_url, role')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) return null;

    const { data: employee } = await this.supabaseService.client
      .from('employees')
      .select('id, job_title')
      .eq('profile_id', profileId)
      .maybeSingle();

    return {
      id: profile['id'],
      email: profile['email'],
      full_name: profile['full_name'],
      avatar_url: profile['avatar_url'],
      role: profile['role'],
      job_title: employee?.['job_title'] ?? null,
      employee_id: employee?.['id'] ?? null
    };
  }

  async updateNameAndAvatar(profileId: string, fullName: string, avatarUrl: string | null) {
    const { error } = await this.supabaseService.client
      .from('profiles')
      .update({ full_name: fullName, avatar_url: avatarUrl })
      .eq('id', profileId);

    if (error) throw new Error(error.message);
  }

  async updateJobTitle(employeeId: string, jobTitle: string) {
    const { error } = await this.supabaseService.client
      .from('employees')
      .update({ job_title: jobTitle })
      .eq('id', employeeId);

    if (error) throw new Error(error.message);
  }

  async uploadAvatar(profileId: string, file: File): Promise<string> {
    const filePath = `${profileId}/avatar.${file.name.split('.').pop()}`;

    const { error } = await this.supabaseService.client.storage
      .from('employee-documents')
      .upload(filePath, file, { upsert: true });

    if (error) throw new Error(error.message);

    const { data } = this.supabaseService.client.storage
      .from('employee-documents')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
}