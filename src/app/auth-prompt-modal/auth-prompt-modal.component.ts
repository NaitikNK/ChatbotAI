import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthPromptService } from '../services/auth-prompt.service';

@Component({
  selector: 'app-auth-prompt-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-prompt-modal.component.html',
  styleUrl: './auth-prompt-modal.component.css'
})
export class AuthPromptModalComponent {
  readonly authPrompt = inject(AuthPromptService);
  private readonly router = inject(Router);

  navigateToLogin(): void {
    const returnUrl = this.authPrompt.returnUrl();
    this.authPrompt.close();
    this.router.navigate(['/login'], { queryParams: { returnUrl } });
  }

  navigateToSignup(): void {
    const returnUrl = this.authPrompt.returnUrl();
    this.authPrompt.close();
    this.router.navigate(['/signup'], { queryParams: { returnUrl } });
  }
}
