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
  
  // Form state
  showCreateForm = signal(false);
  policyForm!: FormGroup;
  isSubmitting = signal(false);

  policyTypes = signal<DropdownOption[]>([]);
  policyNames = signal<DropdownOption[]>([]);
  private typeChangeSub?: Subscription;

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
          // Show error message to user (you can add a toast/notification here)
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
    console.log('Delete policy:', policy);
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
            // Reload policies after deletion
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

  // Form methods
  onCreatePolicy(): void {
    this.showCreateForm.set(true);
    this.initForm();
  }

  onCloseForm(): void {
    this.showCreateForm.set(false);
  }

  initForm(): void {
    // Load policy types
    this.policyService.getPolicyTypes().subscribe(types => {
      this.policyTypes.set(types);
    });

    this.policyForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      policyNumber: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      policyType: ['', [Validators.required]],
      policyName: ['', [Validators.required]],
      phoneNumber: [''],
      address: [''],
      city: [''],
      state: [''],
      postalCode: [''],
      country: [''],
      dateOfBirth: ['']
    });

    // Handle policy type changes
    this.typeChangeSub?.unsubscribe();
    this.typeChangeSub = this.policyForm.get('policyType')?.valueChanges.subscribe(typeId => {
      if (typeId) {
        this.policyService.getPolicyNames(typeId).subscribe(names => {
          this.policyNames.set(names);
        });
      } else {
        this.policyNames.set([]);
        this.policyForm.get('policyName')?.setValue('');
      }
    }) as Subscription;
  }

  onSubmitPolicy(): void {
    if (this.policyForm.invalid) {
      this.policyForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.policyForm.value;

    // No need for conversion, values should match API
    const policyId = ''; // Not used here

    this.policyService.createPolicy(formValue)
      .pipe(
        finalize(() => this.isSubmitting.set(false))
      )
      .subscribe({
        next: () => {
          this.showToast('Policy created successfully!', 'success');
          this.showCreateForm.set(false);
          this.loadPolicies();
        },
        error: (error) => {
          console.error('Error creating policy:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to create policy. Please try again.';
          this.showToast(errorMessage, 'error');
        }
      });
  }

  showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastService.show(message, type);
  }
  ngOnDestroy() {
    this.typeChangeSub?.unsubscribe();
  }
}
