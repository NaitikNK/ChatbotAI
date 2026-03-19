import { Component, signal, inject } from '@angular/core';
import { ChatComponent } from '../chat/chat.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { PopupComponent } from '../popup/popup';
import { LoaderComponent } from '../loader/loader';
import { ChatStoreService } from '../services/chat.store.service';
import { UI_TIMINGS } from '../constants/ui-timings.constant';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [ChatComponent, SidebarComponent, PopupComponent, LoaderComponent],
  templateUrl: './chat-layout.html',
  styleUrl: './chat-layout.css'
})
export class ChatLayout {
  public readonly chatStore = inject(ChatStoreService);
  
  protected readonly title = signal('ChatbotAI');
  sidebarOpen = signal(false);

  // Popup state
  showPopup = signal(false);
  popupMessage = signal('');
  private pendingDeleteAction: (() => void) | null = null;

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

  onDeleteChat(chatId: string) {
    const chats = this.chatStore.chats();
    if (chats.length <= 1) return;

    const chatToDelete = chats.find(chat => chat.id === chatId);
    if (!chatToDelete) return;
    const chatName = chatToDelete.title.trim() ? `"${chatToDelete.title}"` : 'this chat';

    this.popupMessage.set(`Are you sure you want to delete ${chatName}?`);
    this.pendingDeleteAction = () => {
      this.chatStore.deleteChat(chatId);
      this.closeSidebarOnMobile();
    };
    this.showPopup.set(true);
  }

  onDeleteAllChats() {
    const chats = this.chatStore.chats();
    if (chats.length <= 1) return;

    this.popupMessage.set(`Are you sure you want to delete all ${chats.length} chats? This action cannot be undone.`);
    this.pendingDeleteAction = () => {
      this.chatStore.deleteAllChats();
      this.closeSidebarOnMobile();
    };
    this.showPopup.set(true);
  }

  onToggleSidebar() {
    this.sidebarOpen.update(open => !open);
  }

  onPopupConfirm() {
    this.showPopup.set(false);
    if (this.pendingDeleteAction) {
      this.chatStore.isLoading.set(true);
      setTimeout(() => {
        this.pendingDeleteAction!();
        this.pendingDeleteAction = null;
        this.chatStore.isLoading.set(false);
      }, UI_TIMINGS.DELETE_DELAY);
    }
  }

  onPopupCancel() {
    this.pendingDeleteAction = null;
    this.showPopup.set(false);
  }

  private closeSidebarOnMobile() {
    if (window.innerWidth <= 768) {
      this.sidebarOpen.set(false);
    }
  }
}
