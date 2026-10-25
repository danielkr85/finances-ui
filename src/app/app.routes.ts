import { Routes } from '@angular/router';

export const routes: Routes = [
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
  // Legacy redirects
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
  // --- Incomes ---
  {
    path: 'incomes',
    loadComponent: () => import('./components/income-list/income-list.component').then(m => m.IncomeListComponent)
  },
  {
    path: 'incomes/new',
    loadComponent: () => import('./components/income-form/income-form.component').then(m => m.IncomeFormComponent)
  },
  {
    path: 'incomes/:id/edit',
    loadComponent: () => import('./components/income-form/income-form.component').then(m => m.IncomeFormComponent)
  },
  // --- Expenses ---
  {
    path: 'expenses',
    loadComponent: () => import('./components/expense-list/expense-list.component').then(m => m.ExpenseListComponent)
  },
  {
    path: 'expenses/new',
    loadComponent: () => import('./components/expense-form/expense-form.component').then(m => m.ExpenseFormComponent)
  },
  {
    path: 'expenses/:id/edit',
    loadComponent: () => import('./components/expense-form/expense-form.component').then(m => m.ExpenseFormComponent)
  }
];