import { Component, input, output, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewChecked, signal, OnDestroy, effect, OnInit, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ChatMessage } from '../models/chat';
import { MarkdownComponent } from 'ngx-markdown';
import { ToastService } from '../services/toast.service';
import { ConfirmService } from '../services/confirm.service';
import { ChatStoreService } from '../services/chat.store.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, DatePipe, MarkdownComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  messages = input<ChatMessage[]>([]);
  busy = input(false);
  newMessage = '';
  showPlusTooltip = signal(false);

  sendMessage = output<string>();

  ngOnInit() {
  }

  constructor(
    private readonly toastService: ToastService,
    private readonly confirmService: ConfirmService,
    private readonly chatStore: ChatStoreService
  ) {
    // Draft loading effect
    effect(() => {
      const id = this.chatStore.currentChatId();
      if (id) {
        const draft = untracked(() => this.chatStore.currentChat().draftMessage) || '';
        this.newMessage = draft;
      }
    }, { allowSignalWrites: true });
  }

  onInputChange(value: string) {
    if (value && value.includes(' ')) {
      const match = value.match(/^(\s*)([a-z])/);
      if (match) {
        const leadingWhitespace = match[1];
        const letter = match[2];
        const rest = value.substring(leadingWhitespace.length + 1);
        value = leadingWhitespace + letter.toUpperCase() + rest;
      }
    }
    this.newMessage = value;
    this.chatStore.setDraft(this.chatStore.currentChatId(), this.newMessage);
  }

  autoGrow(event: Event) {
    const textArea = event.target as HTMLTextAreaElement;
    textArea.style.height = 'auto';
    textArea.style.height = textArea.scrollHeight + 'px';
  }

  ngAfterViewChecked() {
    // Reversing requested: chats top to bottom, no auto-scroll to bottom
    // this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }

  copyMessage(text: string) {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error('Failed to copy message:', err);
    });
  }

  onEnterDown(event: Event) {
    const kbEvent = event as KeyboardEvent;
    if (!kbEvent.shiftKey) {
      kbEvent.preventDefault();
      this.onSendMessage();
    }
  }

  onSendMessage() {
    if (this.newMessage.trim()) {
      const message = this.newMessage.trim();
      
      this.sendMessage.emit(message);
      this.newMessage = '';
      this.chatStore.setDraft(this.chatStore.currentChatId(), '');
      
      // Reset height of text area automatically
      setTimeout(() => {
        const textareas = document.querySelectorAll('.auto-expand');
        textareas.forEach(t => (t as HTMLTextAreaElement).style.height = 'auto');
      }, 0);
    }
  }


  onPlusClick() {
    this.showPlusTooltip.set(true);
    setTimeout(() => this.showPlusTooltip.set(false), 1000);
  }

  clearChat = output<void>();
  toggleSidebar = output<void>();

  async onClearChat() {
    const confirmed = await this.confirmService.confirm({
      title: 'Clear Conversation',
      message: 'Are you sure you want to clear this conversation? This action cannot be undone.',
      confirmText: 'Clear',
      type: 'danger'
    });

    if (confirmed) {
      this.clearChat.emit();
    }
  }

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  ngOnDestroy() {}
}
