// core/components/header/header.ts
import { Component, inject, signal, OnInit, ElementRef, HostListener } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../../services/Auth/auth';
import { NotificationsService } from '../../services/Notifications/notifications';
import { SupabaseService } from '../../services/Supabase/supabase';

export interface EmployeeSearchResult {
  profile_id: string;
  full_name: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterLink],
  templateUrl: './header.html'
})
export class Header implements OnInit {
  authService = inject(AuthService);
  notificationsService = inject(NotificationsService);
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  showNotifications = signal(false);
  searchQuery = signal('');
  searchResults = signal<EmployeeSearchResult[]>([]);
  showSearchResults = signal(false);

  // جديد: البحث يظهر بس لـ Owner / HR Manager / HR Specialist
  canSearch$ = this.authService.currentUser$.pipe(
    map(user =>
      user?.role === 'owner' ||
      user?.role === 'hr_manager' ||
      user?.role === 'hr_specialist'
    )
  );

  ngOnInit() {
    this.notificationsService.loadNotifications();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const clickedInsideHeader = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInsideHeader) {
      this.showNotifications.set(false);
      this.showSearchResults.set(false);
    }
  }

  toggleNotifications(event: Event) {
    event.stopPropagation();
    this.showNotifications.update(v => !v);
  }

  onNotificationClick(id: string) {
    this.notificationsService.markAsRead(id);
  }

  async onSearchInput(query: string) {
    this.searchQuery.set(query);

    if (query.trim().length < 2) {
      this.searchResults.set([]);
      this.showSearchResults.set(false);
      return;
    }

    const { data, error } = await this.supabaseService.client
      .from('profiles')
      .select('id, full_name')
      .ilike('full_name', `%${query}%`)
      .limit(5);

    if (error || !data) {
      this.searchResults.set([]);
      return;
    }

    this.searchResults.set(
      data.map(p => ({ profile_id: p['id'], full_name: p['full_name'] }))
    );
    this.showSearchResults.set(true);
  }

  goToProfile(profileId: string) {
    this.showSearchResults.set(false);
    this.searchQuery.set('');
    this.router.navigate(['/profile', profileId]);
  }
}