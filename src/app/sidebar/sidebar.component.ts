import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chat } from '../models/chat';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  chats = input<Chat[]>([]);
  currentChatId = input<string>('');

  selectChat = output<string>();
  newChat = output<void>();
  deleteChat = output<string>();
  deleteAllChats = output<void>();

  onSelectChat(chatId: string) {
    this.selectChat.emit(chatId);
  }

  onNewChat() {
    this.newChat.emit();
  }

  onDeleteChat(chatId: string, event: Event) {
    event.stopPropagation(); // Prevent triggering selectChat
    this.deleteChat.emit(chatId);
  }

  onDeleteAllChats() {
    this.deleteAllChats.emit();
  }
}
