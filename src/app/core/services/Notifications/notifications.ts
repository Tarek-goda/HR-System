// core/services/Notifications/notifications.ts
import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../Supabase/supabase';
import { AuthService } from '../Auth/auth';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private supabaseService = inject(SupabaseService);
  private authService = inject(AuthService);

  notifications = signal<AppNotification[]>([]);
  unreadCount = signal(0);

  async loadNotifications() {
    const userId = this.authService.currentUser$.value?.id;
    if (!userId) return;

    const { data, error } = await this.supabaseService.client
      .from('notifications')
      .select('id, title, message, is_read, created_at')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('فشل جلب الإشعارات:', error.message);
      return;
    }

    this.notifications.set(data as AppNotification[]);
    this.unreadCount.set(data.filter(n => !n.is_read).length);
  }

  async markAsRead(id: string) {
    await this.supabaseService.client
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    this.notifications.update(list =>
      list.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    this.unreadCount.update(count => Math.max(0, count - 1));
  }
}