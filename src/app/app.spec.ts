import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { AiService } from './services/ai.service';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { UI_TIMINGS } from './constants/ui-timings.constant';

describe('App', () => {
  let component: App;
  let aiServiceSpy: { chat: ReturnType<typeof vi.fn> };

  const mockAiResponse = 'This is a mock AI response';

  beforeEach(() => {
    const spy = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        App,
        { provide: AiService, useValue: { chat: spy } }
      ]
    });

    component = TestBed.inject(App);
    aiServiceSpy = TestBed.inject(AiService) as any;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with initial chat', () => {
    expect(component.chats().length).toBe(1);
    expect(component.chats()[0].id).toBe('initial');
  });

  it('should select chat', () => {
    const chatId = 'test-chat';
    component.onSelectChat(chatId);
    expect(component.currentChatId()).toBe(chatId);
  });

  it('should create new chat', async () => {
    const initialLength = component.chats().length;

    component.onNewChat();

    await new Promise(resolve => setTimeout(resolve, UI_TIMINGS.LOADING_DELAY + 50));

    expect(component.chats().length).toBeGreaterThan(initialLength);
  });

  it('should add user message and get AI response', async () => {
    aiServiceSpy.chat.mockReturnValue(of(mockAiResponse));
    const testMessage = 'Hello';

    component.onSendMessage(testMessage);

    await new Promise(resolve => setTimeout(resolve, 100));

    const currentChat = component.currentChat();
    expect(currentChat.messages.length).toBeGreaterThanOrEqual(1);
    expect(currentChat.messages[0].role).toBe('user');
  });

  it('should handle AI service error', async () => {
    const errorResponse = new HttpErrorResponse({
      status: 0,
      statusText: 'Network Error'
    });
    aiServiceSpy.chat.mockReturnValue(throwError(() => errorResponse));

    component.onSendMessage('Hello');

    await new Promise(resolve => setTimeout(resolve, 100));

    const currentChat = component.currentChat();
    const lastMessage = currentChat.messages[currentChat.messages.length - 1];
    expect(lastMessage.role).toBe('assistant');
    expect(lastMessage.text).toContain('🌐');
  });

  it('should clear chat', async () => {
    component.onClearChat();

    await new Promise(resolve => setTimeout(resolve, UI_TIMINGS.LOADING_DELAY + 50));

    const currentChat = component.currentChat();
    expect(currentChat.messages).toEqual([]);
    expect(currentChat.title).toBe('');
  });

  it('should derive chat title from messages', () => {
    // Need at least 2 user messages for title derivation
    const messages = [
      { role: 'user' as const, text: 'Tell me about angular', createdAt: Date.now() },
      { role: 'assistant' as const, text: 'Angular is a framework', createdAt: Date.now() },
      { role: 'user' as const, text: 'How does it work', createdAt: Date.now() }
    ];

    const title = (component as any).deriveChatTitle(messages);
    expect(title).toBeTruthy();
    expect(title?.length).toBeLessThanOrEqual(32);
  });

  it('should not update title if already set', () => {
    const hasTitle = (component as any).isDefaultChatTitle('My Custom Title');
    expect(hasTitle).toBe(false);
  });

  it('should detect default chat title', () => {
    const noTitle = (component as any).isDefaultChatTitle('');
    const chatNumber = (component as any).isDefaultChatTitle('Chat 1');
    expect(noTitle).toBe(true);
    expect(chatNumber).toBe(true);
  });

  it('should not delete last chat', () => {
    const initialLength = component.chats().length;
    const chatId = component.chats()[0].id;

    component.onDeleteChat(chatId);

    // Should show popup but not delete if only one chat
    expect(component.chats().length).toBe(initialLength);
  });

  it('should toggle sidebar', () => {
    const initialState = component.sidebarOpen();
    component.onToggleSidebar();
    expect(component.sidebarOpen()).toBe(!initialState);
  });

  it('should get user friendly error for network error', () => {
    const error = new HttpErrorResponse({ status: 0 });
    const message = (component as any).getUserFriendlyError(error);
    expect(message).toContain('🌐');
  });

  it('should get user friendly error for server error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const message = (component as any).getUserFriendlyError(error);
    expect(message).toContain('🛠️');
  });

  it('should get user friendly error for unknown error', () => {
    const message = (component as any).getUserFriendlyError({});
    expect(message).toContain('🤔');
  });
});
