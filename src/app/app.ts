import { Component, signal, computed } from '@angular/core';
import { ChatComponent } from './chat/chat.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { PopupComponent } from './popup/popup';
import { LoaderComponent } from './loader/loader';
import { AiService } from './services/ai.service';
import { Chat, ChatMessage } from './models/chat';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-root',
  imports: [ChatComponent, SidebarComponent, PopupComponent, LoaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  constructor(private readonly ai: AiService) {}

  protected readonly title = signal('ChatbotAI');

  chats = signal<Chat[]>([
    { id: 'initial', title: '', messages: [] }
  ]);
  currentChatId = signal('initial');
  private chatCounter = 1;
  sidebarOpen = signal(false);

  // Popup state
  showPopup = signal(false);
  popupMessage = signal('');
  private pendingDeleteAction: (() => void) | null = null;

  // Loading state
  isLoading = signal(false);

  currentChat = computed(() => {
    return this.chats().find(chat => chat.id === this.currentChatId()) || this.chats()[0];
  });

  onSelectChat(chatId: string) {
    this.currentChatId.set(chatId);
    this.closeSidebarOnMobile();
  }

  onNewChat() {
    this.isLoading.set(true);
    // Simulate processing time
    setTimeout(() => {
      const newId = Date.now().toString();

      const newChat: Chat = {
        id: newId,
        title: '',
        messages: []
      };
      this.chats.update(chats => [...chats, newChat]);
      this.currentChatId.set(newId);
      this.closeSidebarOnMobile();
      this.isLoading.set(false);
    }, 300);
  }

  onSendMessage(message: string) {
    const formattedMessage = message.trim() ? message.trim().charAt(0).toUpperCase() + message.trim().slice(1) : message;
    const chatId = this.currentChatId();
    const userMessage: ChatMessage = { role: 'user', text: formattedMessage, createdAt: Date.now() };

    this.chats.update(chats =>
      chats.map(chat =>
        chat.id === chatId
          ? { ...chat, messages: [...chat.messages, userMessage] }
          : chat
      )
    );
    this.updateChatTitleIfNeeded(chatId);

    this.isLoading.set(true);
    this.ai.chat(formattedMessage).subscribe({
      next: (answer) => {
        const assistantMessage: ChatMessage = { role: 'assistant', text: answer, createdAt: Date.now() };
        this.chats.update(chats =>
          chats.map(chat =>
            chat.id === chatId
              ? { ...chat, messages: [...chat.messages, assistantMessage] }
              : chat
          )
        );
        this.updateChatTitleIfNeeded(chatId);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('AI API error', err);

        const errorText = this.getUserFriendlyError(err);

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          text: errorText,
          createdAt: Date.now()
        };
        this.chats.update(chats =>
          chats.map(chat =>
            chat.id === chatId
              ? { ...chat, messages: [...chat.messages, assistantMessage] }
              : chat
          )
        );
        this.updateChatTitleIfNeeded(chatId);
        this.isLoading.set(false);
      }
    });
  }

  private updateChatTitleIfNeeded(chatId: string) {
    this.chats.update((chats) =>
      chats.map((chat) => {
        if (chat.id !== chatId) return chat;
        if (!this.isDefaultChatTitle(chat.title)) return chat;

        const title = this.deriveChatTitle(chat.messages);
        return title ? { ...chat, title } : chat;
      }),
    );
  }

  private isDefaultChatTitle(title: string): boolean {
    const trimmed = title.trim();
    return trimmed.length === 0 || /^Chat\s+\d+$/i.test(trimmed);
  }

  private deriveChatTitle(messages: ChatMessage[]): string | null {
    const userTexts = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.text.trim())
      .filter(Boolean);

    if (userTexts.length < 2) return null; // wait for first 2 user messages for context

    const combined = userTexts.slice(0, 3).join(' ').trim();
    const cleaned = combined.replace(/\s+/g, ' ').replace(/["'`]/g, '').trim();
    if (!cleaned) return null;

    const firstSentence = cleaned.split(/[.!?\n]/)[0].trim();
    const base = firstSentence || cleaned;

    const maxLen = 32;
    if (base.length <= maxLen) return this.toTitleCase(base);
    return this.toTitleCase(base.slice(0, maxLen - 1).trim()) + '…';
  }

  private toTitleCase(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) return trimmed;

    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  private getUserFriendlyError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return 'Oops! 🌐 I am having trouble connecting to the server right now. Please try again in a moment!';
      }

      if (err.status >= 500) {
        return 'Uh oh! 🛠️ Something went wrong on my end. Please give me a second and try again!';
      }

      return 'Hmm, something unexpected happened. 🤔 Please try again!';
    }

    return 'Hmm, something unexpected happened. 🤔 Please try again!';
  }

  onClearChat() {
    this.isLoading.set(true);
    // Simulate processing time
    setTimeout(() => {
      this.chats.update(chats =>
        chats.map(chat =>
          chat.id === this.currentChatId()
          ? { ...chat, title: '', messages: [] }
          : chat
        )
      );
      this.isLoading.set(false);
    }, 300);
  }

  onDeleteChat(chatId: string) {
    const chats = this.chats();
    if (chats.length <= 1) return; // Don't delete the last chat

    const chatToDelete = chats.find(chat => chat.id === chatId);
    if (!chatToDelete) return;
    const chatName = chatToDelete.title.trim() ? `"${chatToDelete.title}"` : 'this chat';

    // Show popup for confirmation
    this.popupMessage.set(`Are you sure you want to delete ${chatName}?`);
    this.pendingDeleteAction = () => {
      // If deleting current chat, switch to another one
      if (chatId === this.currentChatId()) {
        const remainingChats = chats.filter(chat => chat.id !== chatId);
        this.currentChatId.set(remainingChats[0].id);
      }

      this.chats.set(chats.filter(chat => chat.id !== chatId));
      this.closeSidebarOnMobile();
    };
    this.showPopup.set(true);
  }

  onDeleteAllChats() {
    const chats = this.chats();
    if (chats.length <= 1) return; // Don't delete if only one chat

    // Show popup for confirmation
    this.popupMessage.set(`Are you sure you want to delete all ${chats.length} chats? This action cannot be undone.`);
    this.pendingDeleteAction = () => {
      // Keep one empty chat
      const newChat: Chat = {
        id: Date.now().toString(),
        title: '',
        messages: []
      };

      this.chats.set([newChat]);
      this.currentChatId.set(newChat.id);
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
      this.isLoading.set(true);
      // Simulate processing time for delete operations
      setTimeout(() => {
        this.pendingDeleteAction!();
        this.pendingDeleteAction = null;
        this.isLoading.set(false);
      }, 500);
    }
  }

  onPopupCancel() {
    this.pendingDeleteAction = null;
    this.showPopup.set(false);
  }

  private closeSidebarOnMobile() {
    // Close sidebar on mobile after selecting a chat
    if (window.innerWidth <= 768) {
      this.sidebarOpen.set(false);
    }
  }
}
