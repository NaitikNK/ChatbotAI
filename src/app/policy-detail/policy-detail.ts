import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { PolicyService, Policy, DropdownOption } from '../services/policy.service';
import { finalize } from 'rxjs/operators';
import { ChatStoreService } from '../services/chat.store.service';
import { inject } from '@angular/core';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-policy-detail',
  imports: [CommonModule, DatePipe, SidebarComponent],
  templateUrl: './policy-detail.html',
  styleUrl: './policy-detail.css'
})
export class PolicyDetail implements OnInit {
  policy = signal<Policy | null>(null);
  sidebarOpen = signal(false);
  isLoading = signal(false);
  public readonly chatStore = inject(ChatStoreService);

  // Lookup maps for displaying names instead of IDs
  private policyTypeMap = new Map<string, string>();
  private policyNameMap = new Map<string, string>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly policyService: PolicyService,
    private readonly toastService: ToastService
  ) {}

  ngOnInit(): void {
    const policyId = this.route.snapshot.paramMap.get('id');
    if (policyId) {
      this.loadPolicy(policyId);
      this.loadLookupData();
    } else {
      this.router.navigate(['/policies']);
    }
  }

  /** Load policy types and all their names for display resolution */
  private loadLookupData(): void {
    this.policyService.getPolicyTypes().subscribe(types => {
      this.policyTypeMap.clear();
      types.forEach(t => this.policyTypeMap.set(t.value, t.label));
      types.forEach(t => {
        this.policyService.getPolicyNames(t.value).subscribe(names => {
          names.forEach(n => this.policyNameMap.set(n.value, n.label));
        });
      });
    });
  }

  loadPolicy(policyId: string): void {
    this.isLoading.set(true);
    this.policyService.getPolicyById(policyId)
      .pipe(
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (policy) => {
          this.policy.set(policy);
        },
        error: (error) => {
          console.error('Error loading policy:', error);
          this.toastService.show('Failed to load policy details.', 'error');
          this.policy.set(null);
        }
      });
  }

  onToggleSidebar() {
    this.sidebarOpen.update(open => !open);
  }

  onSelectChat(chatId: string) {
    this.chatStore.selectChat(chatId);
  }

  onNewChat() {
    this.chatStore.onNewChat();
  }

  onDeleteChat(chatId: string) {
    this.chatStore.deleteChat(chatId);
  }

  onDeleteAllChats() {
    this.chatStore.deleteAllChats();
  }

  getPolicyTypeName(type: any): string {
    if (type == null) return 'Unknown';
    return this.policyTypeMap.get(type.toString()) || type.toString();
  }

  getPolicyNameLabel(name: any): string {
    if (name == null) return 'N/A';
    return this.policyNameMap.get(name.toString()) || name.toString();
  }

  goBack(): void {
    this.router.navigate(['/policies']);
  }
}
