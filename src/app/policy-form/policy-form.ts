import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PolicyService, Policy, DropdownOption } from '../services/policy.service';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-policy-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './policy-form.html',
  styleUrl: './policy-form.css'
})
export class PolicyForm implements OnInit, OnDestroy {
  policyForm!: FormGroup;
  isEditMode = false;
  policyId: string | null = null;
  isSubmitting = signal(false);
  
  policyTypes = signal<DropdownOption[]>([]);
  policyNames = signal<DropdownOption[]>([]);
  private typeChangeSub?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly policyService: PolicyService,
    private readonly toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.policyId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.policyId;
    this.initForm();
    
    if (this.isEditMode && this.policyId) {
      this.loadPolicy(this.policyId);
    }
  }

  initForm(policy?: any): void {
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
        this.policyForm.get('policyName')?.setValue(initialName.toString());
      }
    });
  }

  loadPolicy(policyId: string): void {
    this.policyService.getPolicyById(policyId).subscribe({
      next: (policy) => {
        this.patchForm(policy);
      },
      error: (error) => {
        console.error('Error loading policy:', error);
        this.showToast('Failed to load policy details', 'error');
        this.router.navigate(['/policies']);
      }
    });
  }

  patchForm(policy: any): void {
    this.initForm(policy);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }
  showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastService.show(message, type);
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
    const formValue = this.policyForm.value;

    if (this.isEditMode && this.policyId) {
      this.policyService.updatePolicy(this.policyId, formValue)
        .pipe(
          finalize(() => this.isSubmitting.set(false))
        )
        .subscribe({
          next: () => {
            this.onSuccess('Policy updated successfully!');
          },
          error: (error) => {
            console.error('Error updating policy:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update policy. Please try again.';
            this.onError(errorMessage);
          }
        });
    } else {
      this.policyService.createPolicy(formValue)
        .pipe(
          finalize(() => this.isSubmitting.set(false))
        )
        .subscribe({
          next: () => {
            this.onSuccess('Policy created successfully!');
          },
          error: (error) => {
            console.error('Error creating policy:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create policy. Please try again.';
            this.onError(errorMessage);
          }
        });
    }
  }

  onSuccess(message: string): void {
    this.showToast(message, 'success');
    setTimeout(() => {
      this.router.navigate(['/policies']);
    }, 1000);
  }

  onError(message: string): void {
    this.showToast(message, 'error');
    this.isSubmitting.set(false);
  }

  onCancel(): void {
    this.router.navigate(['/policies']);
  }

  ngOnDestroy() {
    this.typeChangeSub?.unsubscribe();
  }
}
