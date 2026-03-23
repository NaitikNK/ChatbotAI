import { Injectable, signal, computed, inject } from '@angular/core';
import { Chat, ChatMessage } from '../models/chat';
import { AiService } from './ai.service';
import { AuthService } from './auth.service';
import { UI_TIMINGS } from '../constants/ui-timings.constant';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ChatStoreService {
  private greetingMessageText = "Loading greeting...";
  private readonly auth = inject(AuthService);

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
    return current && current.messages.length > 1; // 1 is just the greeting
  });

  private createGreetingMessage(text: string): ChatMessage {
    return {
      role: 'assistant',
      text: text,
      createdAt: Date.now()
    };
  }

  constructor(private readonly ai: AiService) {
    this.refreshInitialGreeting();
    this.initAuthListener();
  }

  private initAuthListener() {
    this.auth.currentUser$.subscribe(user => {
      if (user) {
        // User logged in: load their sessions
        this.loadPreviousSessions();
      } else {
        // User logged out (null), and we have active sessions, reset state
        // This ensures guest data is cleared on logout
        if (this.chats().length > 1 || this.currentChat().messages.length > 1) {
          this.resetToInitialState();
        }
      }
    });
  }

  private resetToInitialState() {
    const initialId = 'initial-' + Date.now();
    const initialChat: Chat = { id: initialId, title: '', messages: [] };
    this.chats.set([initialChat]);
    this.currentChatId.set(initialId);
    this.refreshInitialGreeting();
  }

  private refreshInitialGreeting() {
    this.isLoading.set(true);
    this.ai.getGreeting().subscribe({
      next: (greeting) => {
        this.greetingMessageText = greeting;
        this.chats.update(chats => chats.map(c => {
          if (c.id === 'initial' && c.messages.length === 0) {
            return { ...c, messages: [this.createGreetingMessage(greeting)] };
          }
          return c;
        }));
        this.isLoading.set(false);
      },
      error: () => {
        this.greetingMessageText = "Hello! How can I help you today?";
        this.isLoading.set(false);
      }
    });
  }

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
    const chat = this.chats().find(c => c.id === chatId);
    if (chat && chat.messages.length === 0) {
      this.loadHistory(chatId);
    }
  }

  private loadPreviousSessions() {
    this.ai.getSessions().subscribe({
      next: (sessionIds) => {
        this.chats.update(currentChats => {
          const newChats = [...currentChats];
          sessionIds.forEach(id => {
            if (!newChats.find(c => c.id === id)) {
              newChats.push({
                id,
                title: 'Past Session',
                messages: []
              });
            }
          });
          return newChats;
        });
      }
    });
  }

  private loadHistory(chatId: string) {
    this.isLoading.set(true);
    this.ai.getHistory(chatId).subscribe({
      next: (history) => {
        const messages: ChatMessage[] = history
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => ({
            role: m.role as any,
            text: m.content,
            createdAt: new Date(m.createdAt).getTime()
          }));

        this.chats.update(chats => chats.map(c => 
          c.id === chatId 
            ? { ...c, messages, title: this.deriveChatTitle(messages) || 'Chat History' } 
            : c
        ));
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onNewChat() {
    this.isLoading.set(true);
    const newId = Date.now().toString();
    const newChat: Chat = {
      id: newId,
      title: '',
      messages: []
    };
    
    // Optimistic insert
    this.chats.update(chats => [...chats, newChat]);
    this.currentChatId.set(newId);

    this.ai.getGreeting().subscribe({
      next: (greeting) => {
        this.greetingMessageText = greeting;
        this.chats.update(chats => chats.map(c => c.id === newId ? { ...c, messages: [this.createGreetingMessage(greeting)] } : c));
        this.isLoading.set(false);
      },
      error: () => {
        const defaultText = "Hello! How can I help you today?";
        this.greetingMessageText = defaultText;
        this.chats.update(chats => chats.map(c => c.id === newId ? { ...c, messages: [this.createGreetingMessage(defaultText)] } : c));
        this.isLoading.set(false);
      }
    });
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
    const chatId = this.currentChatId();

    // Clear messages immediately while loading greeting
    this.chats.update(chats =>
      chats.map(chat =>
        chat.id === chatId
        ? { ...chat, title: '', messages: [], draftMessage: undefined }
        : chat
      )
    );
    
    // Persistent clear
    this.ai.deleteHistory(chatId).subscribe({
      error: (err) => console.error('Failed to clear chat in DB', err)
    });

    this.ai.getGreeting().subscribe({
      next: (greeting) => {
        this.greetingMessageText = greeting;
        this.chats.update(chats =>
          chats.map(chat =>
            chat.id === chatId
            ? { ...chat, title: '', messages: [this.createGreetingMessage(greeting)], draftMessage: undefined }
            : chat
          )
        );
        this.isLoading.set(false);
      },
      error: () => {
        const defaultText = "Hello! How can I help you today?";
        this.chats.update(chats =>
          chats.map(chat =>
            chat.id === chatId
            ? { ...chat, title: '', messages: [this.createGreetingMessage(defaultText)], draftMessage: undefined }
            : chat
          )
        );
        this.isLoading.set(false);
      }
    });
  }

  deleteChat(chatId: string) {
    const chats = this.chats();
    if (chats.length <= 1) return;
    
    // Persistent delete from DB
    this.ai.deleteHistory(chatId).subscribe({
      error: (err) => console.error('Failed to delete chat in DB', err)
    });

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

    // Persistent bulk delete
    this.ai.deleteAllHistory().subscribe({
      error: (err) => console.error('Failed to bulk delete chats in DB', err)
    });
    
    this.isLoading.set(true);
    this.ai.getGreeting().subscribe({
      next: (greeting) => {
        this.greetingMessageText = greeting;
        this.chats.update(chats => chats.map(c => c.id === newChat.id ? { ...c, messages: [this.createGreetingMessage(greeting)] } : c));
        this.isLoading.set(false);
      },
      error: () => {
        const defaultText = "Hello! How can I help you today?";
        this.chats.update(chats => chats.map(c => c.id === newChat.id ? { ...c, messages: [this.createGreetingMessage(defaultText)] } : c));
        this.isLoading.set(false);
      }
    });
  }
}
