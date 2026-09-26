import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { SupabaseService } from './core/services/Supabase/supabase';
import { ToastContainer } from './core/components/toast-container/toast-container';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  ngOnInit() {
    window.addEventListener('pageshow', async (event: PageTransitionEvent) => {
      if (event.persisted) {
        const { data } = await this.supabaseService.client.auth.getSession();
        const isOnLogin = this.router.url === '/login';

        if (data.session && isOnLogin) {
          this.router.navigate(['/dashboard']);
        } else if (!data.session && !isOnLogin) {
          this.router.navigate(['/login']);
        }
      }
    });
  }
}