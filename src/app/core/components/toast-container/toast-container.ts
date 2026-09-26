// core/components/toast-container/toast-container.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/Toast/toast';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.html'
})
export class ToastContainer {
  toastService = inject(ToastService);
}