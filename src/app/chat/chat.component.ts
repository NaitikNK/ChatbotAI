import { Component, input, output, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ChatMessage } from '../models/chat';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  
  messages = input<ChatMessage[]>([]);
  busy = input(false);
  newMessage = '';
  yesNoSelection: '' | 'Yes' | 'No' = '';

  sendMessage = output<string>();

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
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }

  copyMessage(text: string) {
    navigator.clipboard.writeText(text);
  }

  onEnterDown(event: Event) {
    const kbEvent = event as KeyboardEvent;
    if (!kbEvent.shiftKey) {
      kbEvent.preventDefault();
      this.onSendMessage();
    }
  }

  onSendMessage() {
    if (this.showYesNoPrompt) return;
    if (this.newMessage.trim()) {
      this.sendMessage.emit(this.newMessage.trim());
      this.newMessage = '';
    }
  }

  onSendYesNo() {
    if (this.busy() || !this.yesNoSelection) return;
    this.sendMessage.emit(this.yesNoSelection);
    this.yesNoSelection = '';
  }

  clearChat = output<void>();

  onClearChat() {
    this.clearChat.emit();
  }

  toggleSidebar = output<void>();

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  get showYesNoPrompt(): boolean {
    const messages = this.messages();
    const lastPromptIndex = this.findLastYesNoPromptIndex(messages);
    if (lastPromptIndex === -1) return false;

    return !messages.slice(lastPromptIndex + 1).some((m) => m.role === 'user');
  }

  get pendingYesNoPromptIndex(): number {
    const messages = this.messages();
    const lastPromptIndex = this.findLastYesNoPromptIndex(messages);
    if (lastPromptIndex === -1) return -1;

    const answered = messages.slice(lastPromptIndex + 1).some((m) => m.role === 'user');
    return answered ? -1 : lastPromptIndex;
  }

  private findLastYesNoPromptIndex(messages: ChatMessage[]): number {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role !== 'assistant') continue;

      const text = msg.text ?? '';
      const hasYesNo = /\byes\s*\/\s*no\b/i.test(text);
      if (!hasYesNo) continue;

      // Accept common formats like:
      // - "Question? (Yes/No)"
      // - "Do you ... Yes/No"
      // - "Yes/No"
      const looksLikeQuestion = text.includes('?') || /\(\s*yes\s*\/\s*no\s*\)/i.test(text);
      if (!looksLikeQuestion) continue;

      return i;
    }
    return -1;
  }
}
