// core/services/Departments/departments.ts
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../Supabase/supabase';

export interface Department {
  id: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class DepartmentsService {
  private supabaseService = inject(SupabaseService);
  private cache: Department[] | null = null;

  async getAll(): Promise<Department[]> {
    if (this.cache) {
      return this.cache; // مرة تانية → رجّع من الذاكرة فوراً، من غير طلب جديد
    }

    const { data, error } = await this.supabaseService.client
      .from('departments')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('فشل جلب الأقسام:', error.message);
      return [];
    }

    this.cache = data as Department[];
    return this.cache;
  }
}