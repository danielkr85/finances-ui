import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guards';

/** Everything behind sign-in. */
const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    pathMatch: 'full'
  },
  // --- Accounts ---
  {
    path: 'accounts',
    loadComponent: () => import('./components/account-list/account-list.component').then(m => m.AccountListComponent)
  },
  {
    path: 'accounts/new',
    loadComponent: () => import('./components/account-form/account-form.component').then(m => m.AccountFormComponent)
  },
  {
    path: 'accounts/:id/edit',
    loadComponent: () => import('./components/account-form/account-form.component').then(m => m.AccountFormComponent)
  },
  // Legacy account redirects
  {
    path: 'balances',
    redirectTo: 'accounts',
    pathMatch: 'full'
  },
  {
    path: 'balances/new',
    redirectTo: 'accounts/new',
    pathMatch: 'full'
  },
  // --- Recurring Rules ---
  {
    path: 'recurring-rules',
    loadComponent: () => import('./components/recurring-rule-list/recurring-rule-list.component').then(m => m.RecurringRuleListComponent)
  },
  {
    path: 'recurring-rules/new',
    loadComponent: () => import('./components/recurring-rule-form/recurring-rule-form.component').then(m => m.RecurringRuleFormComponent)
  },
  {
    path: 'recurring-rules/:id/edit',
    loadComponent: () => import('./components/recurring-rule-form/recurring-rule-form.component').then(m => m.RecurringRuleFormComponent)
  },
  // --- Financial Events ---
  {
    path: 'financial-events',
    loadComponent: () => import('./components/financial-event-list/financial-event-list.component').then(m => m.FinancialEventListComponent)
  },
  // Legacy income/expense redirects
  {
    path: 'incomes',
    redirectTo: 'recurring-rules',
    pathMatch: 'full'
  },
  {
    path: 'incomes/new',
    redirectTo: 'recurring-rules/new',
    pathMatch: 'full'
  },
  {
    path: 'incomes/:id/edit',
    redirectTo: 'recurring-rules',
    pathMatch: 'full'
  },
  {
    path: 'expenses',
    redirectTo: 'recurring-rules',
    pathMatch: 'full'
  },
  {
    path: 'expenses/new',
    redirectTo: 'recurring-rules/new',
    pathMatch: 'full'
  },
  {
    path: 'expenses/:id/edit',
    redirectTo: 'recurring-rules',
    pathMatch: 'full'
  }
];

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivateChild: [authGuard],
    children: appRoutes
  },
  { path: '**', redirectTo: '' }
];
