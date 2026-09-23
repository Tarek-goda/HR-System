// core/components/add-employee-button/add-employee-button.ts
import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/Auth/auth';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-add-employee-button',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterLink],
  template: `
    @if (canAdd$ | async) {
      <a routerLink="/add-employee"
         class="px-4 py-2 bg-[#0052cc] text-white font-mono text-xs font-bold rounded-xl shadow-md flex items-center gap-2">
        <span>+</span> Add New Employee
      </a>
    }
  `
})
export class AddEmployeeButton {
  private authService = inject(AuthService);

  canAdd$ = this.authService.currentUser$.pipe(
    map(user => user?.role === 'owner' || user?.role === 'hr_manager')
  );
}