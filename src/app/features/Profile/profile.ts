import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProfileService, ProfileDetails } from '../../core/services/profile/profile';
import { AuthService } from '../../core/services/auth/auth';
import { ToastService } from '../../core/services/toast/toast';
import { AvatarCropper } from '../../core/components/avatar-cropper/avatar-cropper';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AvatarCropper],
  templateUrl: './profile.html',
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
  imageLoadFailed = signal(false);
  selectedFile: File | null = null;

  showCropper = signal(false);
  fileToCrop: File | null = null;

  canEditNameAndAvatar = signal(false);
  canEditJobTitle = signal(false);

  form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    jobTitle: [''],
  });

  async ngOnInit() {
    const targetId =
      this.route.snapshot.paramMap.get('id') ?? this.authService.currentUser$.value?.id;

    if (!targetId) return;

    const data = await this.profileService.getProfile(targetId);
    this.profile.set(data);
    this.isLoading.set(false);

    if (!data) return;

    this.form.patchValue({
      fullName: data.full_name ?? '',
      jobTitle: data.job_title ?? '',
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

    this.canEditNameAndAvatar.set(
      isOwner ||
        isHrManagerEditingOther ||
        (isSelf && (me.role === 'employee' || me.role === 'hr_specialist')),
    );

    this.canEditJobTitle.set(isOwner || isHrManagerEditingOther);
  }

  onImageError() {
    this.imageLoadFailed.set(true);
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.fileToCrop = file;
    this.showCropper.set(true);
  }

  onCropSaved(croppedFile: File) {
    this.selectedFile = croppedFile;
    this.avatarPreview.set(URL.createObjectURL(croppedFile));
    this.imageLoadFailed.set(false);
    this.showCropper.set(false);
  }

  onCropCancelled() {
    this.showCropper.set(false);
    this.fileToCrop = null;
  }

  async onSave() {
    const target = this.profile();
    if (!target) return;

    this.isSaving.set(true);

    try {
      let avatarPath = target.avatar_path;

      if (this.selectedFile && this.canEditNameAndAvatar()) {
        avatarPath = await this.profileService.uploadAvatar(target.id, this.selectedFile);
      }

      if (this.canEditNameAndAvatar()) {
        await this.profileService.updateNameAndAvatar(
          target.id,
          this.form.value.fullName!,
          avatarPath,
        );
      }

      if (this.canEditJobTitle() && target.employee_id) {
        await this.profileService.updateJobTitle(target.employee_id, this.form.value.jobTitle!);
      }

      this.toastService.success('تم حفظ التعديلات بنجاح');

      // جديد: حدّث بيانات المستخدم الحالي في الـ Header فوراً بعد الحفظ
      await this.authService.refreshCurrentUser();
    } catch (err: any) {
      this.toastService.error(err.message ?? 'حدث خطأ أثناء الحفظ');
    } finally {
      this.isSaving.set(false);
    }
  }
}
