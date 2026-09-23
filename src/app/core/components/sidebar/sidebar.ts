import { Component , inject  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule , RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/Auth/auth';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  private authService = inject(AuthService);

  async onLogout() {
    await this.authService.logout();
  }
}
