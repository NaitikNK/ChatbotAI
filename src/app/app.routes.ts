import { Routes } from '@angular/router';
import { ChatLayout } from './chat-layout/chat-layout';
import { Policies } from './policies/policies';
import { PolicyDetail } from './policy-detail/policy-detail';
import { PolicyForm } from './policy-form/policy-form';

import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { ProfileComponent } from './profile/profile.component';
import { AuthGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: 'chat', component: ChatLayout },
  { path: 'users', loadComponent: () => import('./users/users.component').then(m => m.UsersComponent), canActivate: [AuthGuard] },
  { path: 'policies', component: Policies, canActivate: [AuthGuard] },
  { path: 'policies/new', component: PolicyForm, canActivate: [AuthGuard] },
  { path: 'policies/:id', component: PolicyDetail, canActivate: [AuthGuard] },
  { path: 'policies/:id/edit', component: PolicyForm, canActivate: [AuthGuard] },
  { path: '**', redirectTo: 'login' }
];
