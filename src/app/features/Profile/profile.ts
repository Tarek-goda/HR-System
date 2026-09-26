// features/ProfileComponent/profile.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProfileService, ProfileDetails } from '../../core/services/Profile/profile';
import { AuthService } from '../../core/services/Auth/auth';
import { ToastService } from '../../core/services/Toast/toast';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html'
})
export class Profile implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  profile = signal<ProfileDetails | null>(null);
  isLoading = signal(true);
  isSaving = signal(false);
  avatarPreview = signal<string | null>(null);
  selectedFile: File | null = null;

  // صلاحيات محسوبة على مستوى الواجهة (التحقق الحقيقي دايماً في RLS/Trigger)
  canEditNameAndAvatar = signal(false);
  canEditJobTitle = signal(false);

  form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    jobTitle: ['']
  });

  async ngOnInit() {
    const targetId = this.route.snapshot.paramMap.get('id')
      ?? this.authService.currentUser$.value?.id;

    if (!targetId) return;

    const data = await this.profileService.getProfile(targetId);
    this.profile.set(data);
    this.isLoading.set(false);

    if (!data) return;

    this.form.patchValue({
      fullName: data.full_name ?? '',
      jobTitle: data.job_title ?? ''
    });

    this.computePermissions(data);
  }

  private computePermissions(target: ProfileDetails) {
    const me = this.authService.currentUser$.value;
    if (!me) return;

    const isSelf = me.id === target.id;
    const isOwner = me.role === 'owner';
    const isHrManagerEditingOther =
      me.role === 'hr_manager' &&
      !isSelf &&
      (target.role === 'hr_specialist' || target.role === 'employee');

    // الاسم والصورة: الأونر أو نفسك (لو employee/hr_specialist)
    this.canEditNameAndAvatar.set(
      isOwner || isHrManagerEditingOther || (isSelf && (me.role === 'employee' || me.role === 'hr_specialist'))
    );

    // الـ Job Title: الأونر أو HR Manager بيعدّل في غيره
    this.canEditJobTitle.set(isOwner || isHrManagerEditingOther);
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.selectedFile = file;
    this.avatarPreview.set(URL.createObjectURL(file));
  }

  async onSave() {
    const target = this.profile();
    if (!target) return;

    this.isSaving.set(true);

    try {
      let avatarUrl = target.avatar_url;

      if (this.selectedFile && this.canEditNameAndAvatar()) {
        avatarUrl = await this.profileService.uploadAvatar(target.id, this.selectedFile);
      }

      if (this.canEditNameAndAvatar()) {
        await this.profileService.updateNameAndAvatar(
          target.id,
          this.form.value.fullName!,
          avatarUrl
        );
      }

      if (this.canEditJobTitle() && target.employee_id) {
        await this.profileService.updateJobTitle(target.employee_id, this.form.value.jobTitle!);
      }

      this.toastService.success('تم حفظ التعديلات بنجاح');
    } catch (err: any) {
      this.toastService.error(err.message ?? 'حدث خطأ أثناء الحفظ');
    } finally {
      this.isSaving.set(false);
    }
  }
}