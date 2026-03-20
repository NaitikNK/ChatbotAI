import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { PolicyService, Policy, DropdownOption } from '../services/policy.service';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ChatStoreService } from '../services/chat.store.service';
import { inject } from '@angular/core';
import { ToastService } from '../services/toast.service';
import { ConfirmService } from '../services/confirm.service';

@Component({
  selector: 'app-policies',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './policies.html',
  styleUrl: './policies.css'
})
export class Policies implements OnInit, OnDestroy {
  policies = signal<Policy[]>([]);
  sidebarOpen = signal(false);
  isLoading = signal(false);
  currentPage = signal(1);
  pageSize = 10;
  totalCount = signal(0);
  public readonly chatStore = inject(ChatStoreService);
  
  // Lookup maps for displaying names instead of IDs
  private policyTypeMap = new Map<string, string>();
  private policyNameMap = new Map<string, string>();

  constructor(
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly policyService: PolicyService,
    private readonly toastService: ToastService,
    private readonly confirmService: ConfirmService
  ) {}

  ngOnInit(): void {
    this.loadPolicies();
    this.loadLookupData();
  }

  /** Load policy types and all their names for display resolution */
  private loadLookupData(): void {
    this.policyService.getPolicyTypes().subscribe(types => {
      this.policyTypeMap.clear();
      types.forEach(t => this.policyTypeMap.set(t.value, t.label));
      // Load names for each type
      types.forEach(t => {
        this.policyService.getPolicyNames(t.value).subscribe(names => {
          names.forEach(n => this.policyNameMap.set(n.value, n.label));
        });
      });
    });
  }

  loadPolicies(): void {
    this.isLoading.set(true);
    this.policyService.getPolicies(this.currentPage(), this.pageSize)
      .pipe(
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          this.policies.set(response.data.items);
          this.totalCount.set(response.data.totalCount);
        },
        error: (error) => {
          console.error('Error loading policies:', error);
        }
      });
  }

  onToggleSidebar() {
    this.sidebarOpen.update(open => !open);
  }

  onViewPolicy(policy: Policy) {
    this.router.navigate(['/policies', policy.id]);
  }

  onEditPolicy(policy: Policy) {
    this.router.navigate(['/policies', policy.id, 'edit']);
  }

  async onDeletePolicy(policy: Policy) {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete Policy',
      message: `Are you sure you want to delete "${policy.firstName} ${policy.lastName}"?`,
      confirmText: 'Delete',
      type: 'danger'
    });

    if (confirmed) {
      this.isLoading.set(true);
      this.policyService.deletePolicy(policy.id)
        .pipe(
          finalize(() => this.isLoading.set(false))
        )
        .subscribe({
          next: () => {
            this.loadPolicies();
            this.showToast('Policy deleted successfully!', 'success');
          },
          error: (error) => {
            console.error('Error deleting policy:', error);
            this.showToast('Failed to delete policy. Please try again.', 'error');
          }
        });
    }
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadPolicies();
  }

  getPolicyTypeName(type: any): string {
    if (type == null) return 'N/A';
    return this.policyTypeMap.get(type.toString()) || type.toString();
  }

  getPolicyNameLabel(name: any): string {
    if (name == null) return 'N/A';
    return this.policyNameMap.get(name.toString()) || name.toString();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize);
  }

  onCreatePolicy(): void {
    this.router.navigate(['/policies', 'new']);
  }

  showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastService.show(message, type);
  }

  ngOnDestroy() {}
}
