import { Component, input, output, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewChecked, signal, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ChatMessage } from '../models/chat';
import { PolicyService, Policy, DropdownOption } from '../services/policy.service';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { MarkdownComponent } from 'ngx-markdown';
import { ToastService } from '../services/toast.service';
import { ConfirmService } from '../services/confirm.service';

// Keyword detection for showing create policy form
const CREATE_POLICY_KEYWORDS = [
  'create policy',
  'new policy',
  'buy policy',
  'register policy',
  'create record',
  'i want to create',
  'i need a policy',
  'create a policy',
  'make a policy',
  'start a policy'
];

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, DatePipe, MarkdownComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  messages = input<ChatMessage[]>([]);
  busy = input(false);
  newMessage = '';
  yesNoSelection: '' | 'Yes' | 'No' = '';

  // Inline form state
  showCreatePolicyForm = signal(false);
  policyForm!: FormGroup;
  isSubmitting = signal(false);
  editingPolicyId = signal<string | null>(null);
  
  policyTypes = signal<DropdownOption[]>([]);
  policyNames = signal<DropdownOption[]>([]);
  private typeChangeSub?: Subscription;

  sendMessage = output<string>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly policyService: PolicyService,
    private readonly toastService: ToastService,
    private readonly confirmService: ConfirmService
  ) {}

  initPolicyForm(policy?: any): void {
    // Load policy types
    this.policyService.getPolicyTypes().subscribe(types => {
      this.policyTypes.set(types);
      if (policy?.policyType) {
        this.loadPolicyNames(policy.policyType, policy.policyName);
      }
    });

    // Format dateOfBirth for the date input (YYYY-MM-DD)
    let dateOfBirthValue = '';
    if (policy?.dateOfBirth) {
      const date = new Date(policy.dateOfBirth);
      dateOfBirthValue = date.toISOString().split('T')[0];
    }

    this.policyForm = this.fb.group({
      firstName: [policy?.firstName || '', [Validators.required]],
      lastName: [policy?.lastName || '', [Validators.required]],
      policyNumber: [policy?.policyNumber || '', [Validators.required]],
      email: [policy?.email || '', [Validators.required, Validators.email]],
      policyType: [policy?.policyType || '', [Validators.required]],
      policyName: [policy?.policyName || '', [Validators.required]],
      phoneNumber: [policy?.phoneNumber || ''],
      address: [policy?.address || ''],
      city: [policy?.city || ''],
      state: [policy?.state || ''],
      postalCode: [policy?.postalCode || ''],
      country: [policy?.country || ''],
      dateOfBirth: [dateOfBirthValue, []]
    });

    // Handle policy type changes
    this.typeChangeSub?.unsubscribe();
    this.typeChangeSub = this.policyForm.get('policyType')?.valueChanges.subscribe(typeId => {
      if (typeId) {
        this.loadPolicyNames(typeId);
      } else {
        this.policyNames.set([]);
        this.policyForm.get('policyName')?.setValue('');
      }
    }) as Subscription;
  }

  private loadPolicyNames(typeId: string | number, initialName?: any) {
    this.policyService.getPolicyNames(typeId).subscribe(names => {
      this.policyNames.set(names);
      if (initialName && names.some(n => n.value === initialName.toString())) {
        this.policyForm.get('policyName')?.setValue(initialName);
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
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
    if (this.showYesNoPrompt) return;
    if (this.newMessage.trim()) {
      const message = this.newMessage.trim();
      
      // Check for create policy keywords
      if (this.shouldShowCreateForm(message)) {
        this.showCreatePolicyForm.set(true);
        this.initPolicyForm();
      }
      
      this.sendMessage.emit(message);
      this.newMessage = '';
    }
  }

  shouldShowCreateForm(message: string): boolean {
    const lowerMsg = message.toLowerCase();
    return CREATE_POLICY_KEYWORDS.some(keyword => lowerMsg.includes(keyword));
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

      const looksLikeQuestion = text.includes('?') || /\(\s*yes\s*\/\s*no\s*\)/i.test(text);
      if (!looksLikeQuestion) continue;

      return i;
    }
    return -1;
  }

  // Inline form methods
  onCloseForm(): void {
    this.showCreatePolicyForm.set(false);
    this.editingPolicyId.set(null);
  }

  onSubmitPolicy(): void {
    if (this.policyForm.invalid) {
      this.policyForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.policyForm.value;

    // Convert dateOfBirth to Date object if provided
    if (formValue.dateOfBirth) {
      formValue.dateOfBirth = new Date(formValue.dateOfBirth);
    }

    // No need to convert policyType or policyName anymore, they should match API values
    const policyId = this.editingPolicyId();
    
    if (policyId) {
      // Update existing policy
      this.policyService.updatePolicy(policyId, formValue)
        .pipe(
          finalize(() => this.isSubmitting.set(false))
        )
        .subscribe({
          next: (response) => {
            this.onFormSuccess('Policy updated successfully!');
          },
          error: (error) => {
            console.error('Error updating policy:', error);
            this.onFormError('Failed to update policy. Please try again.');
          }
        });
    } else {
      // Create new policy
      this.policyService.createPolicy(formValue)
        .pipe(
          finalize(() => this.isSubmitting.set(false))
        )
        .subscribe({
          next: (response) => {
            this.onFormSuccess('Policy created successfully!');
          },
          error: (error) => {
            console.error('Error creating policy:', error);
            this.onFormError('Failed to create policy. Please try again.');
          }
        });
    }
  }

  onFormSuccess(message: string): void {
    this.toastService.show(message, 'success');
    this.showCreatePolicyForm.set(false);
    this.editingPolicyId.set(null);
    // Emit a message to show in chat
    this.sendMessage.emit(`System: ${message}`);
  }

  onFormError(message: string): void {
    this.toastService.show(message, 'error');
  }

  onEditPolicyInChat(policyId: string): void {
    this.policyService.getPolicyById(policyId).subscribe({
      next: (policy) => {
        this.editingPolicyId.set(policyId);
        this.showCreatePolicyForm.set(true);
        this.initPolicyForm(policy);
      },
      error: (error) => {
        console.error('Error loading policy:', error);
        this.toastService.show('Failed to load policy details', 'error');
      }
    });
  }

  async onDeletePolicyInChat(policyId: string) {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete Policy',
      message: 'Are you sure you want to delete this policy?',
      confirmText: 'Delete',
      type: 'danger'
    });

    if (confirmed) {
      this.policyService.deletePolicy(policyId).subscribe({
        next: () => {
          this.toastService.show('Policy deleted successfully!', 'success');
          this.sendMessage.emit(`System: Policy deleted successfully!`);
        },
        error: (error) => {
          console.error('Error deleting policy:', error);
          this.toastService.show('Failed to delete policy. Please try again.', 'error');
        }
      });
    }
  }

  ngOnDestroy() {
    this.typeChangeSub?.unsubscribe();
  }
}
