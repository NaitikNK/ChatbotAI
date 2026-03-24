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
    this.initAuthListener();
  }

  private initAuthListener() {
    this.auth.currentUser$.subscribe(user => {
      if (user) {
        // User logged in: load their sessions
        this.loadPreviousSessions();
      } else {
        // User logged out (null): always reset state
        // This ensures all previous user/guest data is cleared
        this.resetToInitialState();
      }
    });
  }

  private resetToInitialState() {
    const initialId = 'initial-' + Date.now();
    const initialChat: Chat = { id: initialId, title: '', messages: [] };
    this.chats.set([initialChat]);
    this.currentChatId.set(initialId);
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
    if (chat && chat.messages.length === 0 && chat.backendId) {
      this.loadHistory(chatId, chat.backendId);
    }
  }

  private loadPreviousSessions() {
    this.ai.getSessions().subscribe({
      next: (sessionIds) => {
        this.chats.update(currentChats => {
          const newChats = [...currentChats];
          sessionIds.forEach(id => {
            if (!newChats.find(c => c.backendId === id || c.id === id)) {
              newChats.push({
                id,
                title: 'Past Session',
                messages: [],
                backendId: id  // Server-assigned conversationId
              });
            }
          });
          return newChats;
        });
      }
    });
  }

  private loadHistory(chatId: string, backendId: string) {
    this.isLoading.set(true);
    this.ai.getHistory(backendId).subscribe({
      next: (history) => {
        const messages: ChatMessage[] = history
          .filter(m => m.authorType === 'user' || m.authorType === 'assistant')
          .map(m => ({
            role: m.authorType as any,
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
    const chat = this.chats().find(c => c.id === chatId);
    const userMessage: ChatMessage = { role: 'user', text: formattedMessage, createdAt: Date.now() };

    this.chats.update(chats =>
      chats.map(c =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, userMessage] }
          : c
      )
    );
    this.updateChatTitleIfNeeded(chatId);

    this.isLoading.set(true);
    // Send the backend-assigned conversationId if we have it, otherwise let the backend generate one
    const backendConversationId = chat?.backendId;
    this.ai.chat(formattedMessage, backendConversationId).subscribe({
      next: (response) => {
        const assistantMessage: ChatMessage = { role: 'assistant', text: response.answer, createdAt: Date.now() };
        this.chats.update(chats =>
          chats.map(c =>
            c.id === chatId
              ? { 
                  ...c, 
                  messages: [...c.messages, assistantMessage],
                  backendId: c.backendId || response.conversationId  // Store the backend ID on first response
                }
              : c
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
          chats.map(c =>
            c.id === chatId
              ? { ...c, messages: [...c.messages, assistantMessage] }
              : c
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
    const chat = this.chats().find(c => c.id === chatId);
    const backendId = chat?.backendId;

    // Clear messages and reset backendId so next message starts a new conversation
    this.chats.update(chats =>
      chats.map(c =>
        c.id === chatId
        ? { ...c, title: '', messages: [], draftMessage: undefined, backendId: undefined }
        : c
      )
    );
    
    // Persistent clear (use backendId for the API call)
    if (backendId) {
      this.ai.deleteHistory(backendId).subscribe({
        error: (err) => console.error('Failed to clear chat in DB', err)
      });
    }

    this.ai.getGreeting().subscribe({
      next: (greeting) => {
        this.greetingMessageText = greeting;
        this.chats.update(chats =>
          chats.map(c =>
            c.id === chatId
            ? { ...c, title: '', messages: [this.createGreetingMessage(greeting)], draftMessage: undefined }
            : c
          )
        );
        this.isLoading.set(false);
      },
      error: () => {
        const defaultText = "Hello! How can I help you today?";
        this.chats.update(chats =>
          chats.map(c =>
            c.id === chatId
            ? { ...c, title: '', messages: [this.createGreetingMessage(defaultText)], draftMessage: undefined }
            : c
          )
        );
        this.isLoading.set(false);
      }
    });
  }

  deleteChat(chatId: string) {
    const chats = this.chats();
    if (chats.length <= 1) return;
    
    const chat = chats.find(c => c.id === chatId);
    const backendId = chat?.backendId;

    // Persistent delete from DB (use backendId for the API call)
    if (backendId) {
      this.ai.deleteHistory(backendId).subscribe({
        error: (err) => console.error('Failed to delete chat in DB', err)
      });
    }

    if (chatId === this.currentChatId()) {
      const remainingChats = chats.filter(c => c.id !== chatId);
      this.currentChatId.set(remainingChats[0].id);
    }
    this.chats.set(chats.filter(c => c.id !== chatId));
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
