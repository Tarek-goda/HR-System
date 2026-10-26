import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase';
import { AuthService } from '../auth/auth';

export interface ProfileDetails {
  id: string;
  email: string;
  full_name: string | null;
  avatar_path: string | null;
  avatar_url: string | null;
  role: string;
  department_id: string | null;
  job_title: string | null;
  personal_email: string | null; // جديد
  phone: string | null; // جديد
  birth_date: string | null; // جديد
  salary: number | null;
  hire_date: string | null;
  employee_id: string | null;
}

export type ChangeableField =
  | 'job_title'
  | 'department_id'
  | 'salary'
  | 'hire_date'
  | 'email'
  | 'personal_email'
  | 'phone'
  | 'birth_date';

export interface ChangeRequest {
  id: string;
  employee_id: string | null;
  target_profile_id: string;
  target_name: string | null;
  requested_by: string;
  field_name: ChangeableField;
  old_value: string | null;
  new_value: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export type JobTitleRequest = ChangeRequest;

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private supabaseService = inject(SupabaseService);
  private authService = inject(AuthService);

  async getProfile(profileId: string): Promise<ProfileDetails | null> {
    const [profileResult, employeeResult] = await Promise.all([
      this.supabaseService.client
        .from('profiles')
        .select('id, email, full_name, avatar_url, role, department_id')
        .eq('id', profileId)
        .single(),
      this.supabaseService.client
        .from('employees')
        .select('id, job_title, salary, hire_date, personal_email, phone, birth_date') // أضيف هنا
        .eq('profile_id', profileId)
        .maybeSingle(),
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
      department_id: profileResult.data['department_id'],
      job_title: employeeResult.data?.['job_title'] ?? null,
      personal_email: employeeResult.data?.['personal_email'] ?? null,
      phone: employeeResult.data?.['phone'] ?? null,
      birth_date: employeeResult.data?.['birth_date'] ?? null,
      salary: employeeResult.data?.['salary'] ?? null,
      hire_date: employeeResult.data?.['hire_date'] ?? null,
      employee_id: employeeResult.data?.['id'] ?? null,
    };
  }

  // جديد: تحديث الحقول الشخصية (phone, DOB, personal_email) — بتتطبق فوراً زي الاسم/الصورة
  async updatePersonalDetails(
    employeeId: string,
    phone: string,
    birthDate: string,
    personalEmail: string,
  ) {
    const { error } = await this.supabaseService.client
      .from('employees')
      .update({ phone, birth_date: birthDate, personal_email: personalEmail })
      .eq('id', employeeId);

    if (error) throw new Error(error.message);
  }

  // جديد: ينشئ صف employees لو مش موجود (مطلوب لحساب Owner اللي اتعمل يدوي)
  async ensureEmployeeRecord(profileId: string): Promise<string> {
    const { data: existing } = await this.supabaseService.client
      .from('employees')
      .select('id')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (existing) return existing['id'];

    const { data: inserted, error } = await this.supabaseService.client
      .from('employees')
      .insert({ profile_id: profileId })
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    return inserted['id'];
  }

  // ---- الاسم والصورة: بتتطبق فوراً دايماً ----
  async updateNameAndAvatar(profileId: string, fullName: string, avatarPath: string | null) {
    const { error } = await this.supabaseService.client
      .from('profiles')
      .update({ full_name: fullName, avatar_url: avatarPath })
      .eq('id', profileId);
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

  async updateSensitiveFieldDirectly(
    employeeId: string,
    profileId: string,
    field: ChangeableField,
    value: string,
  ) {
    if (field === 'department_id') {
      const { error } = await this.supabaseService.client
        .from('profiles')
        .update({ department_id: value })
        .eq('id', profileId);
      if (error) throw new Error(error.message);
      return;
    }

    const column =
      field === 'job_title' ? 'job_title' : field === 'salary' ? 'salary' : 'hire_date';

    const { error } = await this.supabaseService.client
      .from('employees')
      .update({ [column]: value })
      .eq('id', employeeId);

    if (error) throw new Error(error.message);
  }

  async requestFieldChange(
    employeeId: string | null,
    targetProfileId: string,
    field: ChangeableField,
    oldValue: string | null,
    newValue: string,
  ) {
    const me = this.authService.currentUser$.value;
    if (!me) throw new Error('غير مسجل دخول');

    const { error } = await this.supabaseService.client.from('profile_change_requests').insert({
      employee_id: employeeId,
      target_profile_id: targetProfileId,
      requested_by: me.id,
      field_name: field,
      old_value: oldValue,
      new_value: newValue,
    });

    if (error) throw new Error(error.message);
  }

  async getPendingRequests(): Promise<ChangeRequest[]> {
    const { data, error } = await this.supabaseService.client
      .from('profile_change_requests')
      .select(
        'id, employee_id, target_profile_id, requested_by, field_name, old_value, new_value, status, created_at, profiles!profile_change_requests_target_profile_id_fkey(full_name)',
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((r: any) => ({
      id: r.id,
      employee_id: r.employee_id,
      target_profile_id: r.target_profile_id,
      target_name: r.profiles?.full_name ?? null,
      requested_by: r.requested_by,
      field_name: r.field_name,
      old_value: r.old_value,
      new_value: r.new_value,
      status: r.status,
      created_at: r.created_at,
    }));
  }

  async approveRequest(request: ChangeRequest) {
    const me = this.authService.currentUser$.value;
    if (!me) throw new Error('غير مسجل دخول');

    if (request.field_name === 'email') {
      // ... زي ما هو
      return;
    }

    // عدّلنا هنا: بنبعت target_profile_id كمان
    if (request.employee_id || request.field_name === 'department_id') {
      await this.updateSensitiveFieldDirectly(
        request.employee_id ?? '',
        request.target_profile_id,
        request.field_name,
        request.new_value,
      );
    }

    const { error } = await this.supabaseService.client
      .from('profile_change_requests')
      .update({ status: 'approved', reviewed_by: me.id, reviewed_at: new Date().toISOString() })
      .eq('id', request.id);

    if (error) throw new Error(error.message);
  }

  async rejectRequest(requestId: string) {
    const me = this.authService.currentUser$.value;
    if (!me) throw new Error('غير مسجل دخول');

    const { error } = await this.supabaseService.client
      .from('profile_change_requests')
      .update({ status: 'rejected', reviewed_by: me.id, reviewed_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) throw new Error(error.message);
  }

  // ---- الإيميل: Owner بس، فوري لغيره عبر Edge Function ----
  async changeEmailDirectly(targetProfileId: string, newEmail: string) {
    const { data: sessionData } = await this.supabaseService.client.auth.getSession();
    const response = await fetch(`${this.supabaseService.url}/functions/v1/update-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session?.access_token}`,
      },
      body: JSON.stringify({ targetProfileId, newEmail }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'فشل تحديث الإيميل');
  }

  // ---- الباسورد: أي حد بيغيّر باسورده هو بس، مباشرة من غير Edge Function ----
  async changeOwnPassword(newPassword: string) {
    const { error } = await this.supabaseService.client.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  }
}
