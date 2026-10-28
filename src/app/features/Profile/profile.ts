import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  ProfileService,
  ProfileDetails,
  ChangeableField,
  FIELD_LABELS,
} from '../../core/services/profile/profile';
import { DepartmentsService, Department } from '../../core/services/departments/departments';
import { AuthService } from '../../core/services/auth/auth';
import { ToastService } from '../../core/services/toast/toast';
import { AvatarCropper } from '../../core/components/avatar-cropper/avatar-cropper';

interface FieldChange {
  field: ChangeableField;
  oldValue: string | null;
  newValue: string;
}

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
  private departmentsService = inject(DepartmentsService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  profile = signal<ProfileDetails | null>(null);
  departments = signal<Department[]>([]);
  isLoading = signal(true);
  isSaving = signal(false);
  hasPendingFields = signal<Set<ChangeableField>>(new Set());

  showEditModal = signal(false);
  showPasswordModal = signal(false);
  showCropper = signal(false);
  fileToCrop: File | null = null;
  avatarPreview = signal<string | null>(null);
  imageLoadFailed = signal(false);
  selectedFile: File | null = null;
  removePhotoFlag = false;

  canEditPersonalInfo = signal(false); // الاسم + الصورة
  canEditContactDetails = signal(false); // الهاتف + الميلاد + الإيميل الشخصي
  canEditSensitiveFields = signal(false); // المسمى + القسم + الراتب + التعيين
  canEditEmailDirectly = signal(false); // Owner
  canRequestEmailChange = signal(false); // HR Manager على غيره
  changesNeedApproval = signal(false); // HR Manager على غيره: كل الحقول بموافقة
  isSelf = signal(false);

  form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    phone: [''],
    birthDate: [''],
    personalEmail: [''],
    jobTitle: [''],
    departmentId: [''],
    salary: [''],
    hireDate: [''],
    email: [''],
  });

  passwordForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });
  passwordError = '';

  async ngOnInit() {
    this.departments.set(await this.departmentsService.getAll());

    const targetId =
      this.route.snapshot.paramMap.get('id') ?? this.authService.currentUser$.value?.id;
    if (!targetId) return;

    await this.loadProfile(targetId);
  }

  departmentName(id: string | null): string {
    return this.departments().find((d) => d.id === id)?.name ?? '—';
  }

  private async loadProfile(targetId: string) {
    const data = await this.profileService.getProfile(targetId);
    this.profile.set(data);
    this.isLoading.set(false);
    if (!data) return;

    this.form.patchValue({
      fullName: data.full_name ?? '',
      phone: data.phone ?? '',
      birthDate: data.birth_date ?? '',
      personalEmail: data.personal_email ?? '',
      jobTitle: data.job_title ?? '',
      departmentId: data.department_id ?? '',
      salary: data.salary != null ? String(data.salary) : '',
      hireDate: data.hire_date ?? '',
      email: data.email,
    });

    this.computePermissions(data);

    if (this.changesNeedApproval()) {
      const pending = await this.profileService.getPendingRequests();
      this.hasPendingFields.set(
        new Set<ChangeableField>(
          pending.filter((r) => r.target_profile_id === data.id).map((r) => r.field_name),
        ),
      );
    } else {
      this.hasPendingFields.set(new Set());
    }
  }

  private computePermissions(target: ProfileDetails) {
    const me = this.authService.currentUser$.value;
    if (!me) return;

    const self = me.id === target.id;
    this.isSelf.set(self);

    const isOwner = me.role === 'owner';
    const selfEdit =
      self && (me.role === 'employee' || me.role === 'hr_specialist' || me.role === 'hr_manager');
    const hrManagerOnOther =
      me.role === 'hr_manager' &&
      !self &&
      (target.role === 'hr_specialist' || target.role === 'employee');

    this.canEditPersonalInfo.set(isOwner || selfEdit || hrManagerOnOther);
    this.canEditContactDetails.set(isOwner || hrManagerOnOther);
    this.canEditSensitiveFields.set(isOwner || hrManagerOnOther);
    this.canEditEmailDirectly.set(isOwner);
    this.canRequestEmailChange.set(hrManagerOnOther);
    this.changesNeedApproval.set(hrManagerOnOther);
  }

  // ---- الصورة ----
  onImageError() {
    this.imageLoadFailed.set(true);
  }

  onPhotoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.fileToCrop = file;
    this.showCropper.set(true);
  }

  onCropSaved(croppedFile: File) {
    this.selectedFile = croppedFile;
    this.removePhotoFlag = false;
    this.avatarPreview.set(URL.createObjectURL(croppedFile));
    this.imageLoadFailed.set(false);
    this.showCropper.set(false);
  }

  onCropCancelled() {
    this.showCropper.set(false);
    this.fileToCrop = null;
  }

  onRemovePhoto() {
    this.removePhotoFlag = true;
    this.selectedFile = null;
    this.avatarPreview.set(null);
  }

  // ---- المودالات ----
  openEditModal() {
    this.removePhotoFlag = false;
    this.selectedFile = null;
    this.avatarPreview.set(null);
    this.showEditModal.set(true);
  }
  closeEditModal() {
    this.showEditModal.set(false);
  }

  openPasswordModal() {
    this.passwordForm.reset();
    this.passwordError = '';
    this.showPasswordModal.set(true);
  }
  closePasswordModal() {
    this.showPasswordModal.set(false);
  }

  async onChangePassword() {
    if (this.passwordForm.invalid) return;
    const { newPassword, confirmPassword } = this.passwordForm.getRawValue();

    if (newPassword !== confirmPassword) {
      this.passwordError = 'كلمة المرور غير متطابقة';
      return;
    }

    try {
      await this.profileService.changeOwnPassword(newPassword);
      this.toastService.success('تم تغيير كلمة المرور بنجاح');
      this.showPasswordModal.set(false);
    } catch (err: any) {
      this.passwordError = err.message ?? 'حدث خطأ';
    }
  }

  // ---- الحفظ ----
  // لو فيه طلب معلّق لنفس الحقل، ما نبعتش طلب تاني
  private isPendingBlocked(field: ChangeableField): boolean {
    return this.changesNeedApproval() && this.hasPendingFields().has(field);
  }

  async onSave() {
    const target = this.profile();
    if (!target) return;

    this.isSaving.set(true);
    let applied = 0;
    let sent = 0;
    const skipped: string[] = [];

    try {
      const f = this.form.getRawValue();
      const changes: FieldChange[] = [];

      if (this.canEditPersonalInfo()) {
        changes.push({ field: 'full_name', oldValue: target.full_name, newValue: f.fullName.trim() });

        if (this.removePhotoFlag && target.avatar_path) {
          changes.push({ field: 'avatar_url', oldValue: target.avatar_path, newValue: '' });
        } else if (this.selectedFile && !this.isPendingBlocked('avatar_url')) {
          const path = await this.profileService.uploadAvatar(
            target.id,
            this.selectedFile,
            this.changesNeedApproval(),
          );
          changes.push({ field: 'avatar_url', oldValue: target.avatar_path, newValue: path });
        } else if (this.selectedFile) {
          skipped.push(FIELD_LABELS['avatar_url']);
        }
      }

      if (this.canEditContactDetails()) {
        changes.push(
          { field: 'phone', oldValue: target.phone, newValue: f.phone },
          { field: 'birth_date', oldValue: target.birth_date, newValue: f.birthDate },
          { field: 'personal_email', oldValue: target.personal_email, newValue: f.personalEmail },
        );
      }

      if (this.canEditSensitiveFields()) {
        changes.push(
          { field: 'job_title', oldValue: target.job_title, newValue: f.jobTitle },
          { field: 'department_id', oldValue: target.department_id, newValue: f.departmentId },
          {
            field: 'salary',
            oldValue: target.salary != null ? String(target.salary) : null,
            newValue: String(f.salary ?? ''),
          },
          { field: 'hire_date', oldValue: target.hire_date, newValue: f.hireDate },
        );
      }

      if ((this.canEditEmailDirectly() || this.canRequestEmailChange()) && f.email) {
        changes.push({ field: 'email', oldValue: target.email, newValue: f.email.trim() });
      }

      for (const c of changes) {
        if ((c.oldValue ?? '') === c.newValue) continue;

        if (c.field === 'email' && this.canEditEmailDirectly()) {
          await this.profileService.changeEmailDirectly(target.id, c.newValue);
          applied++;
        } else if (this.changesNeedApproval()) {
          if (this.isPendingBlocked(c.field)) {
            skipped.push(FIELD_LABELS[c.field]);
            continue;
          }
          await this.profileService.requestFieldChange(target.id, c.field, c.oldValue, c.newValue);
          sent++;
        } else {
          await this.profileService.applyFieldDirectly(target.id, c.field, c.newValue);
          applied++;
        }
      }

      if (applied === 0 && sent === 0 && skipped.length === 0) {
        this.toastService.success('لا توجد تغييرات للحفظ');
      }
      if (applied > 0) this.toastService.success('تم حفظ التعديلات بنجاح');
      if (sent > 0) this.toastService.success(`تم إرسال ${sent} طلب تعديل، بانتظار موافقة الأونر`);
      if (skipped.length > 0) {
        this.toastService.error(`فيه طلب معلّق بالفعل لـ: ${skipped.join('، ')}`);
      }

      await this.authService.refreshCurrentUser();
      await this.loadProfile(target.id);
      this.showEditModal.set(false);
    } catch (err: any) {
      this.toastService.error(err.message ?? 'حدث خطأ أثناء الحفظ');
    } finally {
      this.isSaving.set(false);
    }
  }
}