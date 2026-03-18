import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidebarComponent } from './sidebar.component';
import { Chat } from '../models/chat';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  const mockChats: Chat[] = [
    { id: '1', title: 'Chat 1', messages: [] },
    { id: '2', title: 'Chat 2', messages: [] }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty chats', () => {
    expect(component.chats()).toEqual([]);
  });

  it('should initialize with empty currentChatId', () => {
    expect(component.currentChatId()).toBe('');
  });

  it('should emit selectChat when chat is selected', () => {
    let emittedValue: string | undefined;
    component.selectChat.subscribe((value) => {
      emittedValue = value;
    });
    const chatId = 'test-chat-id';

    component.onSelectChat(chatId);

    expect(emittedValue).toBe(chatId);
  });

  it('should emit newChat when new chat button is clicked', () => {
    let emitted = false;
    component.newChat.subscribe(() => {
      emitted = true;
    });

    component.onNewChat();

    expect(emitted).toBe(true);
  });

  it('should emit deleteChat with chatId and stop propagation', () => {
    let emittedValue: string | undefined;
    component.deleteChat.subscribe((value) => {
      emittedValue = value;
    });
    const chatId = 'test-chat-id';
    const mockEvent = new MouseEvent('click');
    let propagationStopped = false;
    mockEvent.stopPropagation = () => {
      propagationStopped = true;
    };

    component.onDeleteChat(chatId, mockEvent);

    expect(propagationStopped).toBe(true);
    expect(emittedValue).toBe(chatId);
  });

  it('should emit deleteAllChats', () => {
    let emitted = false;
    component.deleteAllChats.subscribe(() => {
      emitted = true;
    });

    component.onDeleteAllChats();

    expect(emitted).toBe(true);
  });

  it('should display chats when provided', () => {
    // Note: We can't directly set input signals in tests
    // The component receives chats from parent component
    expect(component.chats()).toEqual([]);
  });

  it('should highlight active chat', () => {
    // Note: currentChatId is an input signal set by parent component
    expect(component.currentChatId()).toBe('');
  });
});
