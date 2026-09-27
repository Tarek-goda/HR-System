import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase';

export interface ProfileDetails {
  id: string;
  email: string;
  full_name: string | null;
  avatar_path: string | null;
  avatar_url: string | null;
  role: string;
  job_title: string | null;
  employee_id: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private supabaseService = inject(SupabaseService);

  async getProfile(profileId: string): Promise<ProfileDetails | null> {
    const [profileResult, employeeResult] = await Promise.all([
      this.supabaseService.client
        .from('profiles')
        .select('id, email, full_name, avatar_url, role')
        .eq('id', profileId)
        .single(),
      this.supabaseService.client
        .from('employees')
        .select('id, job_title')
        .eq('profile_id', profileId)
        .maybeSingle()
    ]);

    if (profileResult.error || !profileResult.data) return null;

    const avatarPath = profileResult.data['avatar_url'];
    const avatarUrl = avatarPath ? await this.getAvatarSignedUrl(avatarPath) : null;

    return {
      id: profileResult.data['id'],
      email: profileResult.data['email'],
      full_name: profileResult.data['full_name'],
      avatar_path: avatarPath,
      avatar_url: avatarUrl,
      role: profileResult.data['role'],
      job_title: employeeResult.data?.['job_title'] ?? null,
      employee_id: employeeResult.data?.['id'] ?? null,
    };
  }

  async updateNameAndAvatar(profileId: string, fullName: string, avatarPath: string | null) {
    const { error } = await this.supabaseService.client
      .from('profiles')
      .update({ full_name: fullName, avatar_url: avatarPath })
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
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (error) throw new Error(error.message);

    return filePath;
  }

  async getAvatarSignedUrl(filePath: string): Promise<string | null> {
    const { data, error } = await this.supabaseService.client.storage
      .from('avatars')
      .createSignedUrl(filePath, 60 * 60);

    if (error || !data) return null;
    return data.signedUrl;
  }
}