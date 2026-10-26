// features/approvals/approvals.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileService, JobTitleRequest } from '../../core/services/profile/profile';
import { ToastService } from '../../core/services/toast/toast';

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approvals.html'
})
export class Approvals implements OnInit {
  private profileService = inject(ProfileService);
  private toastService = inject(ToastService);

  requests = signal<JobTitleRequest[]>([]);
  isLoading = signal(true);

  async ngOnInit() {
    this.requests.set(await this.profileService.getPendingRequests());
    this.isLoading.set(false);
  }

  async approve(request: JobTitleRequest) {
    try {
      await this.profileService.approveRequest(request);
      this.requests.update(list => list.filter(r => r.id !== request.id));
      this.toastService.success('تم قبول التعديل');
    } catch (err: any) {
      this.toastService.error(err.message);
    }
  }

  async reject(requestId: string) {
    try {
      await this.profileService.rejectRequest(requestId);
      this.requests.update(list => list.filter(r => r.id !== requestId));
      this.toastService.success('تم رفض التعديل');
    } catch (err: any) {
      this.toastService.error(err.message);
    }
  }
}