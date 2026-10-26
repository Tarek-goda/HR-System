import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  ProfileService,
  ProfileDetails,
  ChangeableField,
} from '../../core/services/profile/profile';
import { DepartmentsService, Department } from '../../core/services/departments/departments';
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

  // صلاحيات محسوبة
  canEditPersonalInfo = signal(false); // اسم + صورة
  canEditSensitiveFields = signal(false); // job_title/department/salary/hire_date
  sensitiveFieldsNeedApproval = signal(false); // true لو HR Manager (محتاج موافقة)
  canEditEmailDirectly = signal(false); // Owner بس
  canRequestEmailChange = signal(false); // HR Manager (عبر طلب)
  isSelf = signal(false);

  // aliases kept for the existing template API
  canEditNameAndAvatar = computed(() => this.canEditPersonalInfo());
  canEditJobTitle = computed(() => this.canEditSensitiveFields());
  hasPendingRequest = computed(() => this.hasPendingFields().has('job_title'));
  isHrManagerEditingOther = computed(() => this.sensitiveFieldsNeedApproval() && !this.isSelf());

  form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    phone: [''],
    birthDate: [''],
    personalEmail: [''],
    jobTitle: [''],
    departmentId: [''],
    salary: [0],
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
      salary: data.salary ?? 0,
      hireDate: data.hire_date ?? '',
      email: data.email,
    });

    this.computePermissions(data);

    if (this.sensitiveFieldsNeedApproval() || this.canRequestEmailChange()) {
      const pending = await this.profileService.getPendingRequests();
      const fields = new Set<ChangeableField>(
        pending.filter((r) => r.target_profile_id === data.id).map((r) => r.field_name),
      );
      this.hasPendingFields.set(fields);
    }
  }

  private computePermissions(target: ProfileDetails) {
    const me = this.authService.currentUser$.value;
    if (!me) return;

    const self = me.id === target.id;
    this.isSelf.set(self);

    const isOwner = me.role === 'owner';
    // HR Manager ممنوع يعدّل نفسه أو الـ Owner خالص
    const isHrManagerOnOther =
      me.role === 'hr_manager' &&
      !self &&
      (target.role === 'hr_specialist' || target.role === 'employee');

    // الاسم والصورة
    this.canEditPersonalInfo.set(
      isOwner ||
        isHrManagerOnOther ||
        (self && (me.role === 'employee' || me.role === 'hr_specialist')),
    );

    // الحقول الحساسة (job_title, department, salary, hire_date)
    this.canEditSensitiveFields.set(isOwner || isHrManagerOnOther);
    this.sensitiveFieldsNeedApproval.set(isHrManagerOnOther); // HR Manager محتاج موافقة، Owner لأ

    // الإيميل
    this.canEditEmailDirectly.set(isOwner);
    this.canRequestEmailChange.set(isHrManagerOnOther);
  }

  // ---- الصورة ----
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

  openEditModal() {
    this.removePhotoFlag = false;
    this.selectedFile = null;
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

  async onSave() {
    const target = this.profile();
    if (!target) return;

    this.isSaving.set(true);

    try {
      if (this.canEditPersonalInfo()) {
        let avatarPath = target.avatar_path;
        if (this.removePhotoFlag) avatarPath = null;
        else if (this.selectedFile)
          avatarPath = await this.profileService.uploadAvatar(target.id, this.selectedFile);

        await this.profileService.updateNameAndAvatar(
          target.id,
          this.form.value.fullName!,
          avatarPath,
        );

        // جديد: حفظ phone, DOB, personal email (محتاج employee_id)
        const employeeId =
          target.employee_id ?? (await this.profileService.ensureEmployeeRecord(target.id));
        await this.profileService.updatePersonalDetails(
          employeeId,
          this.form.value.phone!,
          this.form.value.birthDate!,
          this.form.value.personalEmail!,
        );
      }

      if (this.canEditSensitiveFields()) {
        // جديد: لو مفيش صف employees، أنشئه الأول
        const employeeId =
          target.employee_id ?? (await this.profileService.ensureEmployeeRecord(target.id));

        await this.handleFieldChange(
          employeeId,
          'job_title',
          this.form.value.jobTitle!,
          target.job_title,
          target,
        );
        await this.handleFieldChange(
          employeeId,
          'department_id',
          this.form.value.departmentId!,
          target.department_id,
          target,
        );
        await this.handleFieldChange(
          employeeId,
          'salary',
          String(this.form.value.salary),
          target.salary != null ? String(target.salary) : null,
          target,
        );
        await this.handleFieldChange(
          employeeId,
          'hire_date',
          this.form.value.hireDate!,
          target.hire_date,
          target,
        );
      }

      const newEmail = this.form.value.email!;
      if (newEmail !== target.email) {
        if (this.canEditEmailDirectly()) {
          await this.profileService.changeEmailDirectly(target.id, newEmail);
        } else if (this.canRequestEmailChange()) {
          await this.profileService.requestFieldChange(
            target.employee_id,
            target.id,
            'email',
            target.email,
            newEmail,
          );
          this.toastService.success('تم إرسال طلب تعديل الإيميل، بانتظار موافقة الأونر');
        }
      }

      this.toastService.success('تم حفظ التعديلات بنجاح');
      await this.authService.refreshCurrentUser();
      await this.loadProfile(target.id);
      this.showEditModal.set(false);
    } catch (err: any) {
      this.toastService.error(err.message ?? 'حدث خطأ أثناء الحفظ');
    } finally {
      this.isSaving.set(false);
    }
  }

  // تحديث التوقيع: employeeId بقت باراميتر بدل الاعتماد على target.employee_id
  private async handleFieldChange(
    employeeId: string,
    field: ChangeableField,
    newValue: string,
    oldValue: string | null,
    target: ProfileDetails,
  ) {
    if (newValue === (oldValue ?? '')) return;

    if (!this.sensitiveFieldsNeedApproval()) {
      await this.profileService.updateSensitiveFieldDirectly(
        employeeId,
        target.id,
        field,
        newValue,
      );
    } else {
      await this.profileService.requestFieldChange(
        employeeId,
        target.id,
        field,
        oldValue,
        newValue,
      );
    }
  }
}
