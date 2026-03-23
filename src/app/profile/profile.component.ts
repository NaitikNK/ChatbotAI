import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  loading = false;
  passwordLoading = false;
  isEditing = signal(false);
  
  private readonly fb = inject(FormBuilder);
  public readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  isEditable = computed(() => {
    const user = this.authService.currentUserValue;
    return user?.role !== 'Admin';
  });

  constructor() {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: [{ value: '', disabled: true }]
    });

    this.passwordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(4)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    // Start disabled
    this.profileForm.disable();
  }

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (user) {
      this.profileForm.patchValue({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      });
    }
  }

  onClose() {
    this.router.navigate(['/chat']);
  }

  toggleEdit() {
    if (this.isEditing()) {
      // Cancel
      this.isEditing.set(false);
      this.profileForm.disable();
      // Revert to original data
      if (this.authService.currentUserValue) {
        this.profileForm.patchValue(this.authService.currentUserValue);
      }
    } else {
      // Start editing
      this.isEditing.set(true);
      this.profileForm.get('firstName')?.enable();
      this.profileForm.get('lastName')?.enable();
    }
  }

  onSaveProfile() {
    if (this.profileForm.invalid || this.loading) return;

    this.loading = true;
    const updateDto = {
      firstName: this.profileForm.get('firstName')?.value,
      lastName: this.profileForm.get('lastName')?.value
    };

    this.authService.updateProfile(updateDto).subscribe({
      next: () => {
        this.loading = false;
        this.isEditing.set(false);
        this.profileForm.disable();
        this.toast.show('Profile updated successfully!', 'success');
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(err.error?.message || 'Failed to update profile.', 'error');
      }
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  async onChangePassword() {
    if (this.passwordForm.invalid) return;

    const user = this.authService.currentUserValue;
    if (!user?.id) return;

    this.passwordLoading = true;
    const url = `${environment.apiUrl}/users/${user.id}/change-password`;
    
    this.http.post(url, { newPassword: this.passwordForm.value.newPassword }).subscribe({
      next: () => {
        this.passwordLoading = false;
        this.toast.show('Password updated successfully!', 'success');
        this.passwordForm.reset();
      },
      error: (err) => {
        this.passwordLoading = false;
        this.toast.show(err.error?.message || 'Failed to update password.', 'error');
      }
    });
  }

  get initials(): string {
    const user = this.authService.currentUserValue;
    if (!user) return 'U';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  }
}
