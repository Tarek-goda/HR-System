import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: '',
    loadComponent: () =>
      import('./core/components/main-layout/main-layout').then((m) => m.MainLayout),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'directory',
        loadComponent: () => import('./pages/directory/directory').then((m) => m.Directory),
      },
      {
        path: 'attendance',
        loadComponent: () => import('./pages/attendance/attendance').then((m) => m.Attendance),
      },
      {
        path: 'payroll',
        loadComponent: () => import('./pages/payroll/payroll').then((m) => m.Payroll),
      },
      {
        path: 'performance',
        loadComponent: () => import('./pages/performance/performance').then((m) => m.Performance),
      },
      {
        path: 'add-employee',
        loadComponent: () =>
          import('./features/employees/add-employee/add-employee').then((m) => m.AddEmployee),
        children: [
          { path: '', redirectTo: 'PersonalInfo', pathMatch: 'full' },
          {
            path: 'PersonalInfo',
            loadComponent: () =>
              import('./features/employees/add-employee/personal-info/personal-info').then(
                (m) => m.PersonalInfo,
              ),
          },
          {
            path: 'JobDetails',
            loadComponent: () =>
              import('./features/employees/add-employee/job-details/job-details').then(
                (m) => m.JobDetails,
              ),
          },
          {
            path: 'Credentials',
            loadComponent: () =>
              import('./features/employees/add-employee/credentials/credentials').then(
                (m) => m.Credentials,
              ),
          },
        ],
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
  // app.routes.ts — جوه children بتاعت الـ Layout
  {
    path: 'profile',
    loadComponent: () => import('./features/Profile/profile').then((m) => m.Profile),
  },
  {
    path: 'profile/:id',
    loadComponent: () => import('./features/Profile/profile').then((m) => m.Profile),
  },
];
