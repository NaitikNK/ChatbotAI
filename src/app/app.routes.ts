import { Routes } from '@angular/router';
import { ChatLayout } from './chat-layout/chat-layout';
import { Policies } from './policies/policies';
import { PolicyDetail } from './policy-detail/policy-detail';
import { PolicyForm } from './policy-form/policy-form';

export const routes: Routes = [
  { path: '', redirectTo: 'chat', pathMatch: 'full' },
  { path: 'chat', component: ChatLayout },
  { path: 'policies', component: Policies },
  { path: 'policies/new', component: PolicyForm },
  { path: 'policies/:id', component: PolicyDetail },
  { path: 'policies/:id/edit', component: PolicyForm }
];
