// core/components/breadcrumb/breadcrumb.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterLink, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';

interface Crumb {
  label: string;
  url: string;
}

const LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  directory: 'Directory',
  attendance: 'Attendance',
  payroll: 'Payroll',
  performance: 'Performance',
  settings: 'Settings',
  'add-employee': 'Add New Employee',
  PersonalInfo: 'Personal Info',
  JobDetails: 'Job Details',
  Credentials: 'Credentials'
};

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './breadcrumb.html',
})
export class Breadcrumb {
  private router = inject(Router);
  crumbs = signal<Crumb[]>([]);

  constructor() {
    this.buildCrumbs(this.router.url);
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e) => {
      this.buildCrumbs((e as NavigationEnd).urlAfterRedirects);
    });
  }

  private buildCrumbs(url: string) {
    const segments = url.split('/').filter(Boolean);
    let path = '';
    const result: Crumb[] = [];

    for (const segment of segments) {
      path += `/${segment}`;
      result.push({
        label: LABELS[segment] ?? segment,
        url: path
      });
    }
    this.crumbs.set(result);
  }
}