import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrls: ['../login/login.component.css']
})
export class SignupComponent {
  signupForm: FormGroup;
  error: string = '';
  success: string = '';
  loading = false;
  public returnUrl = '/chat';
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly toast: ToastService
  ) {
    this.signupForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });

    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/chat';
  }

  onSubmit() {
    if (this.signupForm.invalid) return;

    this.loading = true;
    this.error = '';
    this.success = '';

    const { confirmPassword, ...signupPayload } = this.signupForm.getRawValue();

    this.authService.signup(signupPayload)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res) => {
          const msg = res.message || 'Signup successful. You can now login.';
          this.success = msg;
          this.toast.show(msg, 'success');
          setTimeout(() => {
            this.router.navigate(['/login'], {
              queryParams: { returnUrl: this.returnUrl }
            });
          }, 2000);
        },
        error: err => {
          const msg = err.error?.message || (typeof err.error === 'string' ? err.error : 'Signup failed.');
          this.error = msg;
          this.toast.show(msg, 'error');
        }
      });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    return password === confirmPassword ? null : { passwordMismatch: true };
  }
}
