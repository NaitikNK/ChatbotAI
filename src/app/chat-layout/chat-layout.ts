import { Component, signal, inject } from '@angular/core';
import { ChatComponent } from '../chat/chat.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { LoaderComponent } from '../loader/loader';
import { ChatStoreService } from '../services/chat.store.service';
import { ConfirmService } from '../services/confirm.service';
import { UI_TIMINGS } from '../constants/ui-timings.constant';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [ChatComponent, SidebarComponent, LoaderComponent],
  templateUrl: './chat-layout.html',
  styleUrl: './chat-layout.css'
})
export class ChatLayout {
  public readonly chatStore = inject(ChatStoreService);
  private readonly confirmService = inject(ConfirmService);
  
  protected readonly title = signal('ChatbotAI');
  sidebarOpen = signal(false);

  onSelectChat(chatId: string) {
    this.chatStore.selectChat(chatId);
    this.closeSidebarOnMobile();
  }

  onNewChat() {
    this.chatStore.onNewChat();
    this.closeSidebarOnMobile();
  }

  onSendMessage(message: string) {
    this.chatStore.onSendMessage(message);
  }

  onClearChat() {
    this.chatStore.onClearChat();
  }

  async onDeleteChat(chatId: string) {
    const chats = this.chatStore.chats();

    const chatToDelete = chats.find(chat => chat.id === chatId);
    if (!chatToDelete) return;
    const chatName = chatToDelete.title.trim() ? `"${chatToDelete.title}"` : 'this chat';

    const confirmed = await this.confirmService.confirm({
      title: 'Clear Conversation',
      message: `Are you sure you want to clear ${chatName}? This action cannot be undone.`,
      confirmText: 'Clear',
      type: 'danger'
    });

    if (confirmed) {
      this.chatStore.isLoading.set(true);
      setTimeout(() => {
        if (chats.length <= 1) {
          this.chatStore.onClearChat();
        } else {
          this.chatStore.deleteChat(chatId);
        }
        this.closeSidebarOnMobile();
        this.chatStore.isLoading.set(false);
      }, UI_TIMINGS.DELETE_DELAY);
    }
  }

  async onDeleteAllChats() {
    const chats = this.chatStore.chats();
    if (chats.length <= 1) return;

    const confirmed = await this.confirmService.confirm({
      title: 'Clear All Conversations',
      message: `Are you sure you want to clear all ${chats.length} chats? This action cannot be undone.`,
      confirmText: 'Clear All',
      type: 'danger'
    });

    if (confirmed) {
      this.chatStore.isLoading.set(true);
      setTimeout(() => {
        this.chatStore.deleteAllChats();
        this.closeSidebarOnMobile();
        this.chatStore.isLoading.set(false);
      }, UI_TIMINGS.DELETE_DELAY);
    }
  }

  onToggleSidebar() {
    this.sidebarOpen.update(open => !open);
  }

  private closeSidebarOnMobile() {
    if (window.innerWidth <= 768) {
      this.sidebarOpen.set(false);
    }
  }
}
