import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PolicyService, Policy, DropdownOption } from '../services/policy.service';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ChatStoreService } from '../services/chat.store.service';

@Component({
  selector: 'app-policy-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './policy-form.html',
  styleUrl: './policy-form.css'
})
export class PolicyForm implements OnInit, OnDestroy {
  policyForm!: FormGroup;
  isEditMode = false;
  policyId: string | null = null;
  isSubmitting = signal(false);
  sidebarOpen = signal(false);
  
  policyTypes = signal<DropdownOption[]>([]);
  policyNames = signal<DropdownOption[]>([]);
  private typeChangeSub?: Subscription;

  public readonly chatStore = inject(ChatStoreService);

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly policyService: PolicyService,
    private readonly toastService: ToastService
  ) {
    this.initFormSchema();
  }

  ngOnInit(): void {
    this.policyId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.policyId;
    this.loadInitialData();
  }

  private initFormSchema(): void {
    this.policyForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      policyNumber: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email, this.endsWithCom]],
      policyType: ['', [Validators.required]],
      policyName: ['', [Validators.required]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      address: [''],
      city: [''],
      state: [''],
      postalCode: ['', [Validators.required, Validators.pattern(/^[0-9]{5,6}$/)]],
      country: [''],
      dateOfBirth: ['', [Validators.required, this.atLeastOneYearOld]]
    });

    // Handle policy type changes
    this.typeChangeSub = this.policyForm.get('policyType')?.valueChanges.subscribe(typeId => {
      if (typeId) {
        this.policyService.getPolicyNames(typeId).subscribe(names => {
          this.policyNames.set(names);
        });
      } else {
        this.policyNames.set([]);
        this.policyForm.get('policyName')?.setValue('');
      }
    });
  }

  private loadInitialData(): void {
    // 1. Load Policy Types
    this.policyService.getPolicyTypes().subscribe({
      next: (types) => {
        this.policyTypes.set(types);
        
        // 2. If editing, load the policy
        if (this.isEditMode && this.policyId) {
          this.loadPolicyData(this.policyId);
        } else {
          // fetch generated policy number
          this.policyService.generatePolicyNumber().subscribe({
            next: (num) => {
              this.policyForm.patchValue({ policyNumber: num });
            },
            error: (err) => {
              console.error("Error generating policy number", err);
              this.toastService.show("Failed to generate policy number", "error");
            }
          });
        }
      },
      error: (err) => {
        console.error('Error loading policy types:', err);
        this.toastService.show('Failed to initialize form data.', 'error');
      }
    });
  }

  private loadPolicyData(id: string): void {
    this.policyService.getPolicyById(id).subscribe({
      next: (policy) => {
        // 3. Load names for the specific type - use ID if available
        const typeSelector = policy.policyTypeId || policy.policyType;
        this.policyService.getPolicyNames(typeSelector).subscribe({
          next: (names) => {
            this.policyNames.set(names);
            
            // 4. Finally, patch the entire form
            this.patchFormValues(policy);
          },
          error: (err) => {
            console.error('Error loading policy names:', err);
            this.patchFormValues(policy); // Still patch what we have
          }
        });
      },
      error: (err) => {
        console.error('Error loading policy:', err);
        this.toastService.show('Policy not found.', 'error');
        this.onCancel();
      }
    });
  }

  private patchFormValues(policy: any): void {
    // Format date for the input
    const patchedValues: any = {
      firstName: policy.firstName,
      lastName: policy.lastName,
      policyNumber: policy.policyNumber,
      email: policy.email,
      phoneNumber: policy.phoneNumber || '',
      address: policy.address || '',
      city: policy.city || '',
      state: policy.state || '',
      postalCode: policy.postalCode || '',
      country: policy.country || '',
      policyType: (policy.policyTypeId ?? policy.policyType ?? '').toString(),
      policyName: (policy.policyNameId ?? policy.policyName ?? '').toString(),
    };

    if (policy.dateOfBirth) {
      patchedValues.dateOfBirth = new Date(policy.dateOfBirth).toISOString().split('T')[0];
    }
    
    console.log('Patching form with values:', patchedValues);
    console.log('Available Types:', this.policyTypes());
    console.log('Available Names:', this.policyNames());

    // Use a small timeout to ensure the DOM is ready to accept select values
    setTimeout(() => {
      this.policyForm.patchValue(patchedValues);
      console.log('Form patch complete. Current form value:', this.policyForm.value);
    }, 200);
  }

  onToggleSidebar() {
    this.sidebarOpen.update(open => !open);
  }

  onCloseSidebar() {
    this.sidebarOpen.set(false);
  }

  onSelectChat(chatId: string): void {
    this.chatStore.selectChat(chatId);
    this.router.navigate(['/chat']);
  }

  onNewChat(): void {
    this.chatStore.onNewChat();
    this.router.navigate(['/chat']);
  }

  onDeleteChat(chatId: string): void {
    this.chatStore.deleteChat(chatId);
  }

  onDeleteAllChats(): void {
    this.chatStore.deleteAllChats();
  }

  get firstName() { return this.policyForm?.get('firstName'); }
  get lastName() { return this.policyForm?.get('lastName'); }
  get policyNumber() { return this.policyForm?.get('policyNumber'); }
  get email() { return this.policyForm?.get('email'); }
  get policyType() { return this.policyForm?.get('policyType'); }
  get policyName() { return this.policyForm?.get('policyName'); }
  get phoneNumber() { return this.policyForm?.get('phoneNumber'); }
  get address() { return this.policyForm?.get('address'); }
  get city() { return this.policyForm?.get('city'); }
  get state() { return this.policyForm?.get('state'); }
  get postalCode() { return this.policyForm?.get('postalCode'); }
  get country() { return this.policyForm?.get('country'); }
  get dateOfBirth() { return this.policyForm?.get('dateOfBirth'); }

  onSubmit(): void {
    if (this.policyForm.invalid) {
      this.policyForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formValue = { ...this.policyForm.value };

    if (!formValue.dateOfBirth) {
        formValue.dateOfBirth = null;
    }

    const request$ = this.isEditMode && this.policyId 
      ? this.policyService.updatePolicy(this.policyId, formValue)
      : this.policyService.createPolicy(formValue);

    request$.pipe(
      finalize(() => this.isSubmitting.set(false))
    ).subscribe({
      next: () => {
        this.toastService.show(
          `Policy ${this.isEditMode ? 'updated' : 'created'} successfully!`, 
          'success'
        );
        setTimeout(() => this.onCancel(), 1000);
      },
      error: (error) => {
        console.error('Error saving policy:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to save record.';
        this.toastService.show(errorMessage, 'error');
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/policies']);
  }

  private endsWithCom(control: any) {
    const email = control.value;
    if (email && !email.toLowerCase().endsWith('.com')) {
      return { notCom: true };
    }
    return null;
  }

  private atLeastOneYearOld(control: any) {
    if (!control.value) return null;
    const dob = new Date(control.value);
    const today = new Date();
    
    if (dob > today) {
      return { futureDate: true };
    }

    const ageLimit = new Date();
    ageLimit.setFullYear(today.getFullYear() - 1);
    
    if (dob > ageLimit) {
      return { tooYoung: true };
    }
    
    return null;
  }

  ngOnDestroy() {
    this.typeChangeSub?.unsubscribe();
  }
}

