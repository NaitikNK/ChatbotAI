import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './toast/toast.component';
import { ConfirmModalComponent } from './confirm-modal/confirm-modal.component';
import { AuthPromptModalComponent } from './auth-prompt-modal/auth-prompt-modal.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent, ConfirmModalComponent, AuthPromptModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
