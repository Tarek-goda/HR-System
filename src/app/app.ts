import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { SupabaseService } from './core/services/Supabase/supabase';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
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