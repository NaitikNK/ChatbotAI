import { Component, input, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Chat } from '../models/chat';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  chats = input<Chat[]>([]);
  currentChatId = input<string>('');
  showGoToChat = input<boolean>(false);
  showCreatePolicy = input<boolean>(false);
  canNewChat = input<boolean>(true);

  selectChat = output<string>();
  newChat = output<void>();
  createPolicy = output<void>();
  deleteChat = output<string>();
  deleteAllChats = output<void>();
  closeSidebar = output<void>();

  public readonly authService = inject(AuthService);
  profileMenuOpen = signal(false);

  constructor(private readonly router: Router) {}

  onLogout() {
    this.profileMenuOpen.set(false);
    this.authService.logout();
  }

  onSelectChat(chatId: string) {
    this.profileMenuOpen.set(false);
    this.selectChat.emit(chatId);
  }

  onNewChat() {
    this.profileMenuOpen.set(false);
    this.newChat.emit();
  }

  onCreatePolicy() {
    this.profileMenuOpen.set(false);
    this.createPolicy.emit();
  }

  onDeleteChat(chatId: string, event: Event) {
    event.stopPropagation();
    this.deleteChat.emit(chatId);
  }

  onDeleteAllChats() {
    this.profileMenuOpen.set(false);
    this.deleteAllChats.emit();
  }

  onCloseSidebar(): void {
    this.profileMenuOpen.set(false);
    this.closeSidebar.emit();
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen.update(open => !open);
  }

  closeProfileMenu(): void {
    this.profileMenuOpen.set(false);
  }

  goToLogin(): void {
    this.profileMenuOpen.set(false);
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  goToSignup(): void {
    this.profileMenuOpen.set(false);
    this.router.navigate(['/signup'], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  isPoliciesPage(): boolean {
    return this.router.url.split('?')[0].split('#')[0] === '/policies';
  }

  hasDraft(chat: Chat): boolean {
    return !!chat.draftMessage;
  }

  profileName(): string {
    const user = this.authService.currentUserValue;
    if (user) {
      return `${user.firstName} ${user.lastName}`.trim();
    }

    return this.authService.isGuest() ? 'Guest User' : 'Visitor';
  }

  profileEmail(): string {
    const user = this.authService.currentUserValue;
    if (user?.email) {
      return user.email;
    }

    return this.authService.isGuest() ? 'Guest session active' : 'Sign in to unlock policy access';
  }

  profileRole(): string {
    const user = this.authService.currentUserValue;
    if (user?.role) {
      return user.role;
    }

    return this.authService.isGuest() ? 'Guest' : 'Not signed in';
  }

  profileInitials(): string {
    const user = this.authService.currentUserValue;
    if (user) {
      return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';
    }

    return this.authService.isGuest() ? 'GU' : 'VI';
  }
}
