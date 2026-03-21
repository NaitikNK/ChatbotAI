import { Injectable, signal, computed } from '@angular/core';
import { Chat, ChatMessage } from '../models/chat';
import { AiService } from './ai.service';
import { UI_TIMINGS } from '../constants/ui-timings.constant';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ChatStoreService {
  chats = signal<Chat[]>([
    { id: 'initial', title: '', messages: [] }
  ]);
  currentChatId = signal('initial');
  isLoading = signal(false);

  currentChat = computed(() => {
    return this.chats().find(chat => chat.id === this.currentChatId()) || this.chats()[0];
  });

  canCreateNewChat = computed(() => {
    const current = this.currentChat();
    return current && current.messages.length > 0;
  });

  constructor(private readonly ai: AiService) {}

  setDraft(chatId: string, draft: string) {
    this.chats.update(chats =>
      chats.map(chat =>
        chat.id === chatId
          ? { ...chat, draftMessage: draft }
          : chat
      )
    );
  }

  selectChat(chatId: string) {
    this.currentChatId.set(chatId);
  }

  onNewChat() {
    this.isLoading.set(true);
    setTimeout(() => {
      const newId = Date.now().toString();
      const newChat: Chat = {
        id: newId,
        title: '',
        messages: []
      };
      this.chats.update(chats => [...chats, newChat]);
      this.currentChatId.set(newId);
      this.isLoading.set(false);
    }, UI_TIMINGS.LOADING_DELAY);
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
        
        const userMsgs = chat.messages.filter(m => m.role === 'user');
        if (!this.isDefaultChatTitle(chat.title) && userMsgs.length > 2) return chat;

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

    if (userTexts.length === 0) return null;

    const combined = userTexts.slice(0, 2).join(' ').trim();
    const cleaned = combined.replace(/\s+/g, ' ').replace(/["'`]/g, '').trim();
    if (!cleaned) return null;

    const maxLen = 40;
    if (cleaned.length <= maxLen) return this.toTitleCase(cleaned);
    return this.toTitleCase(cleaned.slice(0, maxLen - 1).trim()) + '…';
  }

  private toTitleCase(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) return trimmed;
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  private getUserFriendlyError(err: unknown): string {
    if (err instanceof Error && err.message) {
      return err.message;
    }
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return 'Oops! 🌐 I am having trouble connecting to the server right now. Please try again in a moment!';
      }
      if (err.status >= 500) {
        return 'Uh oh! 🛠️ Something went wrong on my end. Please give me a second and try again!';
      }
      if (err.error && typeof err.error === 'object' && err.error.error) {
        return err.error.error;
      }
    }
    return 'Hmm, something unexpected happened. 🤔 Please try again!';
  }

  onClearChat() {
    this.isLoading.set(true);
    setTimeout(() => {
      this.chats.update(chats =>
        chats.map(chat =>
          chat.id === this.currentChatId()
          ? { ...chat, title: '', messages: [], draftMessage: undefined }
          : chat
        )
      );
      this.isLoading.set(false);
    }, UI_TIMINGS.LOADING_DELAY);
  }

  deleteChat(chatId: string) {
    const chats = this.chats();
    if (chats.length <= 1) return;
    if (chatId === this.currentChatId()) {
      const remainingChats = chats.filter(chat => chat.id !== chatId);
      this.currentChatId.set(remainingChats[0].id);
    }
    this.chats.set(chats.filter(chat => chat.id !== chatId));
  }

  deleteAllChats() {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: '',
      messages: [],
      draftMessage: undefined
    };
    this.chats.set([newChat]);
    this.currentChatId.set(newChat.id);
  }
}
