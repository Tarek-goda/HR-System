// core/services/Toast/toast.ts
import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error';
  text: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private nextId = 0;
  messages = signal<ToastMessage[]>([]);

  success(text: string) {
    this.show('success', text);
  }

  error(text: string) {
    this.show('error', text);
  }

  private show(type: 'success' | 'error', text: string) {
    const id = this.nextId++;
    this.messages.update(list => [...list, { id, type, text }]);

    // تختفي تلقائياً بعد 4 ثواني
    setTimeout(() => this.dismiss(id), 4000);
  }

  dismiss(id: number) {
    this.messages.update(list => list.filter(m => m.id !== id));
  }
}