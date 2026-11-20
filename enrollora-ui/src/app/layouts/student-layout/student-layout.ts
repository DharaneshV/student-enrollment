import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { TokenService } from '../../core/auth/token.service';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-student-layout',
  styleUrl: './student-layout.css',
  templateUrl: './student-layout.html',
})
export class StudentLayout {
  private authService = inject(AuthService);
  private tokenService = inject(TokenService);
  private router = inject(Router);

  get userName(): string {
    return this.tokenService.getName() || 'Student';
  }

  get userEmail(): string {
    return this.tokenService.getEmail() || 'Learning Portal';
  }

  get userInitial(): string {
    const name = this.userName;
    return name ? name.charAt(0).toUpperCase() : 'S';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
