import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatComponent } from './chat.component';
import { ChatMessage } from '../models/chat';

describe('ChatComponent', () => {
  let component: ChatComponent;
  let fixture: ComponentFixture<ChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty messages', () => {
    expect(component.messages()).toEqual([]);
  });

  it('should initialize with busy as false', () => {
    expect(component.busy()).toBe(false);
  });

  it('should update newMessage on input change', () => {
    const testInput = 'hello world';
    component.onInputChange(testInput);
    // The component capitalizes the first letter after whitespace
    expect(component.newMessage).toBe('Hello world');
  });

  it('should capitalize first letter on input change', () => {
    component.onInputChange('  hello');
    expect(component.newMessage).toBe('  Hello');
  });

  it('should emit sendMessage on Enter without Shift', () => {
    const mockEvent = new KeyboardEvent('keydown', { shiftKey: false });
    let emittedValue: string | undefined;
    component.sendMessage.subscribe((value) => {
      emittedValue = value;
    });
    component.newMessage = 'Test message';

    // Call preventDefault manually since we're testing the event handling
    const preventDefaultSpy = vi.spyOn(mockEvent, 'preventDefault');
    component.onEnterDown(mockEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(emittedValue).toBe('Test message');
  });

  it('should not emit sendMessage on Enter with Shift', () => {
    const mockEvent = new KeyboardEvent('keydown', { shiftKey: true });
    let emitted = false;
    component.sendMessage.subscribe(() => {
      emitted = true;
    });
    component.newMessage = 'Test message';

    component.onEnterDown(mockEvent);

    expect(mockEvent.defaultPrevented).toBe(false);
    expect(emitted).toBe(false);
  });

  it('should emit sendMessage on button click', () => {
    let emittedValue: string | undefined;
    component.sendMessage.subscribe((value) => {
      emittedValue = value;
    });
    component.newMessage = 'Test message';

    component.onSendMessage();

    expect(emittedValue).toBe('Test message');
    expect(component.newMessage).toBe('');
  });

  it('should not send empty message', () => {
    let emitted = false;
    component.sendMessage.subscribe(() => {
      emitted = true;
    });
    component.newMessage = '';

    component.onSendMessage();

    expect(emitted).toBe(false);
  });

  it('should emit clearChat', () => {
    let emitted = false;
    component.clearChat.subscribe(() => {
      emitted = true;
    });

    component.onClearChat();

    expect(emitted).toBe(true);
  });

  it('should emit toggleSidebar', () => {
    let emitted = false;
    component.toggleSidebar.subscribe(() => {
      emitted = true;
    });

    component.onToggleSidebar();

    expect(emitted).toBe(true);
  });

  it('should copy message to clipboard', async () => {
    const testText = 'Test message';
    // Mock the clipboard API
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true
    });

    component.copyMessage(testText);

    expect(mockWriteText).toHaveBeenCalledWith(testText);
    
    // Restore original clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true
    });
  });
});
