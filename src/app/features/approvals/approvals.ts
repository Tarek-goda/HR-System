// features/approvals/approvals.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileService, ChangeRequest, ChangeableField, FIELD_LABELS } from '../../core/services/profile/profile';
import { DepartmentsService, Department } from '../../core/services/departments/departments';
import { ToastService } from '../../core/services/toast/toast';

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approvals.html',
})
export class Approvals implements OnInit {
  private profileService = inject(ProfileService);
  private departmentsService = inject(DepartmentsService);
  private toastService = inject(ToastService);

  requests = signal<ChangeRequest[]>([]);
  departments = signal<Department[]>([]);
  avatarPreviews = signal<Record<string, string>>({});
  isLoading = signal(true);

  async ngOnInit() {
    this.departments.set(await this.departmentsService.getAll());
    const list = await this.profileService.getPendingRequests();
    this.requests.set(list);

    // معاينة الصور المطلوبة
    const previews: Record<string, string> = {};
    for (const r of list) {
      if (r.field_name === 'avatar_url' && r.new_value) {
        const url = await this.profileService.getAvatarSignedUrl(r.new_value);
        if (url) previews[r.id] = url;
      }
    }
    this.avatarPreviews.set(previews);
    this.isLoading.set(false);
  }

  label(field: ChangeableField): string {
    return FIELD_LABELS[field];
  }

  display(field: ChangeableField, value: string | null): string {
    if (!value) return '—';
    if (field === 'department_id') {
      return this.departments().find((d) => d.id === value)?.name ?? value;
    }
    if (field === 'avatar_url') return 'صورة';
    return value;
  }

  async approve(request: ChangeRequest) {
    try {
      await this.profileService.approveRequest(request);
      this.requests.update((list) => list.filter((r) => r.id !== request.id));
      this.toastService.success('تم قبول التعديل');
    } catch (err: any) {
      this.toastService.error(err.message);
    }
  }

  async reject(requestId: string) {
    try {
      await this.profileService.rejectRequest(requestId);
      this.requests.update((list) => list.filter((r) => r.id !== requestId));
      this.toastService.success('تم رفض التعديل');
    } catch (err: any) {
      this.toastService.error(err.message);
    }
  }
}