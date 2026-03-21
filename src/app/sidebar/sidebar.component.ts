import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Chat } from '../models/chat';

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

  constructor(private readonly router: Router) {}

  isPoliciesPage(): boolean {
    return this.router.url.split('?')[0].split('#')[0] === '/policies';
  }

  onSelectChat(chatId: string) {
    this.selectChat.emit(chatId);
  }

  onNewChat() {
    this.newChat.emit();
  }

  onCreatePolicy() {
    this.createPolicy.emit();
  }

  onDeleteChat(chatId: string, event: Event) {
    event.stopPropagation(); // Prevent triggering selectChat
    this.deleteChat.emit(chatId);
  }

  onDeleteAllChats() {
    this.deleteAllChats.emit();
  }

  hasDraft(chat: Chat): boolean {
    return !!chat.draftMessage;
  }
}
