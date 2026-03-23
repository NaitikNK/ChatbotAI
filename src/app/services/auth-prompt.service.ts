import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthPromptService {
  visible = signal(false);
  returnUrl = signal('/chat');

  open(returnUrl: string = '/chat'): void {
    this.returnUrl.set(returnUrl || '/chat');
    this.visible.set(true);
  }

  close(): void {
    this.visible.set(false);
  }
}
