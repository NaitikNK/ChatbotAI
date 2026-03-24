import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { ConfirmService } from '../services/confirm.service';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  roleName: string;
  roleId: number;
  isDefault: boolean;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly confirmService = inject(ConfirmService);
  public readonly authService = inject(AuthService);

  users = signal<User[]>([]);
  loading = signal(false);
  adminCount = computed(() => this.users().filter(user => user.roleName === 'Admin').length);

  // Modals
  activeModal = signal<'edit' | 'password' | null>(null);
  selectedUser = signal<User | null>(null);

  editForm: FormGroup;
  passwordForm: FormGroup;
  actionLoading = signal(false);

  constructor() {
    this.editForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      roleId: [1, Validators.required]
    });

    this.passwordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(4)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    if (this.authService.currentUserValue?.role !== 'Admin') {
      this.router.navigate(['/chat']);
      return;
    }
    this.loadUsers();
  }

  loadUsers() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/users`).subscribe({
      next: (res) => {
        if (res.success) {
          this.users.set(res.data);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.show(err.error?.message || 'Failed to load users', 'error');
        this.loading.set(false);
      }
    });
  }

  openEdit(user: User) {
    this.selectedUser.set(user);
    this.editForm.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId
    });
    this.activeModal.set('edit');
  }

  openPassword(user: User) {
    this.selectedUser.set(user);
    this.passwordForm.reset();
    this.activeModal.set('password');
  }

  async openDelete(user: User) {
    this.selectedUser.set(user);
    const confirmed = await this.confirmService.confirm({
      title: 'Delete user',
      message: `Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!confirmed) {
      this.selectedUser.set(null);
      return;
    }

    this.onConfirmDelete();
  }

  closeModal() {
    this.activeModal.set(null);
    this.selectedUser.set(null);
  }

  onSaveUser() {
    if (this.editForm.invalid || !this.selectedUser()) return;
    this.actionLoading.set(true);
    const id = this.selectedUser()?.id;
    this.http.put(`${environment.apiUrl}/users/${id}`, this.editForm.value).subscribe({
      next: () => {
        this.toast.show('User updated successfully', 'success');
        this.loadUsers();
        this.closeModal();
        this.actionLoading.set(false);
      },
      error: (err) => {
        this.toast.show(err.error?.message || 'Update failed', 'error');
        this.actionLoading.set(false);
      }
    });
  }

  onSavePassword() {
    if (this.passwordForm.invalid || !this.selectedUser()) return;
    this.actionLoading.set(true);
    const id = this.selectedUser()?.id;
    this.http.post(`${environment.apiUrl}/users/${id}/change-password`, { 
      newPassword: this.passwordForm.value.newPassword 
    }).subscribe({
      next: () => {
        this.toast.show('Password updated successfully', 'success');
        this.closeModal();
        this.actionLoading.set(false);
      },
      error: (err) => {
        this.toast.show(err.error?.message || 'Password update failed', 'error');
        this.actionLoading.set(false);
      }
    });
  }

  onConfirmDelete() {
    if (!this.selectedUser()) return;
    this.actionLoading.set(true);
    const id = this.selectedUser()?.id;
    this.http.delete(`${environment.apiUrl}/users/${id}`).subscribe({
      next: () => {
        this.toast.show('User deleted successfully', 'success');
        this.loadUsers();
        this.closeModal();
        this.actionLoading.set(false);
      },
      error: (err) => {
        this.toast.show(err.error?.message || 'Delete failed', 'error');
        this.actionLoading.set(false);
      }
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  onClose() {
    window.history.back();
  }
}
