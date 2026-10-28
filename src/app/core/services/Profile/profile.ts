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
  personal_email: string | null;
  phone: string | null;
  birth_date: string | null;
  salary: number | null;
  hire_date: string | null;
  employee_id: string | null;
}

export type ChangeableField =
  | 'full_name'
  | 'avatar_url'
  | 'phone'
  | 'birth_date'
  | 'personal_email'
  | 'job_title'
  | 'department_id'
  | 'salary'
  | 'hire_date'
  | 'email';

export const FIELD_LABELS: Record<ChangeableField, string> = {
  full_name: 'الاسم',
  avatar_url: 'الصورة الشخصية',
  phone: 'رقم الهاتف',
  birth_date: 'تاريخ الميلاد',
  personal_email: 'البريد الشخصي',
  job_title: 'المسمى الوظيفي',
  department_id: 'القسم',
  salary: 'الراتب الشهري',
  hire_date: 'تاريخ التعيين',
  email: 'البريد الإلكتروني (الدخول)',
};

// الحقول اللي مكانها جدول profiles، والباقي في employees
const PROFILE_TABLE_FIELDS: ChangeableField[] = ['full_name', 'avatar_url', 'department_id'];

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

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private supabaseService = inject(SupabaseService);
  private authService = inject(AuthService);

  // ================== القراءة ==================

  async getProfile(profileId: string): Promise<ProfileDetails | null> {
    const [profileResult, employeeResult] = await Promise.all([
      this.supabaseService.client
        .from('profiles')
        .select('id, email, full_name, avatar_url, role, department_id')
        .eq('id', profileId)
        .single(),
      this.supabaseService.client
        .from('employees')
        .select('id, job_title, salary, hire_date, personal_email, phone, birth_date')
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

  // ينشئ صف employees لو مش موجود (مطلوب لحساب Owner اللي اتعمل يدوي)
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

  // ================== الصور ==================

  // forApproval = true: مسار مؤقت، عشان الصورة الحالية ما تتغيرش قبل موافقة الأونر
  async uploadAvatar(profileId: string, file: File, forApproval = false): Promise<string> {
    const ext = file.name.split('.').pop() || 'png';
    const filePath = forApproval
      ? `${profileId}/pending-${Date.now()}.${ext}`
      : `${profileId}/avatar.${ext}`;

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

  // ================== التعديل المباشر (Owner / الشخص على نفسه) ==================

  async applyFieldDirectly(profileId: string, field: ChangeableField, value: string) {
    if (field === 'email') {
      throw new Error('الإيميل بيتغير عبر changeEmailDirectly');
    }

    // القيمة الفاضية تتحول لـ null، والراتب لرقم
    const finalValue: string | number | null =
      value === '' ? null : field === 'salary' ? Number(value) : value;

    if (PROFILE_TABLE_FIELDS.includes(field)) {
      const { error } = await this.supabaseService.client
        .from('profiles')
        .update({ [field]: finalValue })
        .eq('id', profileId);
      if (error) throw new Error(error.message);
      return;
    }

    const employeeId = await this.ensureEmployeeRecord(profileId);
    const { error } = await this.supabaseService.client
      .from('employees')
      .update({ [field]: finalValue })
      .eq('id', employeeId);
    if (error) throw new Error(error.message);
  }

  // ================== طلبات الموافقة ==================

  // HR Manager: إنشاء طلب بدل التعديل المباشر
  async requestFieldChange(
    targetProfileId: string,
    field: ChangeableField,
    oldValue: string | null,
    newValue: string,
  ) {
    const me = this.authService.currentUser$.value;
    if (!me) throw new Error('غير مسجل دخول');

    const { error } = await this.supabaseService.client.from('profile_change_requests').insert({
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

    // الإيميل: الـ Edge Function بتحدّث auth + profiles + حالة الطلب بنفسها
    if (request.field_name === 'email') {
      const { data: sessionData } = await this.supabaseService.client.auth.getSession();
      const response = await fetch(`${this.supabaseService.url}/functions/v1/update-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({
          targetProfileId: request.target_profile_id,
          newEmail: request.new_value,
          requestId: request.id,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'فشل تحديث الإيميل');
      return;
    }

    // باقي الحقول: Owner بيطبّقها مباشرة
    await this.applyFieldDirectly(request.target_profile_id, request.field_name, request.new_value);

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

  // ================== الإيميل والباسورد ==================

  // Owner فقط: تغيير إيميل أي حد مباشرة عبر Edge Function
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

  // أي مستخدم يغيّر باسورده هو بس
  async changeOwnPassword(newPassword: string) {
    const { error } = await this.supabaseService.client.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  }
}