// features/employees/add-employee/add-employee-state.ts
import { Injectable, signal, computed, effect } from '@angular/core';

export interface PersonalInfoData {
  firstName: string;
  lastName: string;
  personalEmail: string;
  birthDate: string;
  phone: string;
}

export interface JobDetailsData {
  jobTitle: string;
  department: string;
  systemRole: string;
  hireDate: string;
  salary: number;
}

export interface CredentialsData {
  email: string;
  password: string;
}

interface DraftData {
  personalInfo: PersonalInfoData | null;
  jobDetails: JobDetailsData | null;
  credentials: CredentialsData | null;
}

const STORAGE_KEY = 'add-employee-draft';

@Injectable({
  providedIn: 'root'
})
export class AddEmployeeState {
  // نقرأ أي Draft محفوظ مرة واحدة بس، وقت إنشاء الـ Service (يعني أول ما التطبيق يفتح)
  private readonly initialDraft = this.readDraft();

  personalInfo = signal<PersonalInfoData | null>(this.initialDraft.personalInfo);
  jobDetails = signal<JobDetailsData | null>(this.initialDraft.jobDetails);
  credentials = signal<CredentialsData | null>(this.initialDraft.credentials);

  // الصورة مينفعش تتخزن كنص، فبتفضل في الذاكرة بس (بتضيع بعد Refresh، وده مقبول)
  photoFile = signal<File | null>(null);
  photoPreviewUrl = signal<string | null>(null);

  progressPercent = computed(() => {
    let completed = 0;
    if (this.personalInfo() !== null) completed++;
    if (this.jobDetails() !== null) completed++;
    if (this.credentials() !== null) completed++;
    return Math.round((completed / 3) * 100);
  });

  constructor() {
    // effect() بتتنفذ تلقائياً بس لما أي signal بتستخدمها هنا تتغير فعلياً —
    // مش بتتنفذ كل Change Detection cycle، فالأداء ممتاز ومفيش كتابة زيادة عن اللزوم
    effect(() => {
      const draft: DraftData = {
        personalInfo: this.personalInfo(),
        jobDetails: this.jobDetails(),
        credentials: this.credentials()
      };
      this.writeDraft(draft);
    });
  }

  setPersonalInfo(data: PersonalInfoData) {
    this.personalInfo.set(data);
  }

  setJobDetails(data: JobDetailsData) {
    this.jobDetails.set(data);
  }

  setCredentials(data: CredentialsData) {
    this.credentials.set(data);
  }

  setPhoto(file: File) {
    this.photoFile.set(file);
    const oldUrl = this.photoPreviewUrl();
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    this.photoPreviewUrl.set(URL.createObjectURL(file));
  }

  isReadyToSubmit(): boolean {
    return this.personalInfo() !== null && this.jobDetails() !== null;
  }

  getFullPayload() {
    const personal = this.personalInfo();
    const job = this.jobDetails();
    const creds = this.credentials();

    if (!personal || !job || !creds) {
      throw new Error('Missing required data from previous steps');
    }

    return {
      email: creds.email,
      password: creds.password,
      full_name: `${personal.firstName} ${personal.lastName}`,
      job_title: job.jobTitle,
      department_id: job.department,
      hire_date: job.hireDate,
      salary: job.salary,
      system_role: job.systemRole
    };
  }

  reset() {
    this.personalInfo.set(null);
    this.jobDetails.set(null);
    this.credentials.set(null);
    this.photoFile.set(null);
    const oldUrl = this.photoPreviewUrl();
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    this.photoPreviewUrl.set(null);
    this.clearDraft();
  }

  // ---- دوال التخزين الخاصة (Private) ----

  private readDraft(): DraftData {
    const empty: DraftData = { personalInfo: null, jobDetails: null, credentials: null };
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return empty;
      return JSON.parse(raw) as DraftData;
    } catch {
      // لو البيانات المخزنة تالفة لأي سبب، نتجاهلها بدل ما نكسر التطبيق
      return empty;
    }
  }

  private writeDraft(draft: DraftData) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // لو sessionStorage ممتلئ أو غير متاح (نادر)، نتجاهل بصمت بدل ما نعطل الفورم
    }
  }

  private clearDraft() {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}