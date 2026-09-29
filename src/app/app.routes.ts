import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    pathMatch: 'full'
  },
  // --- Balances ---
  {
    path: 'balances', // You can keep this if you still want a dedicated page, or remove it
    loadComponent: () => import('./components/balance-list/balance-list.component').then(m => m.BalanceListComponent)
  },
  {
    path: 'balances/new',
    loadComponent: () => import('./components/balance-form/balance-form.component').then(m => m.BalanceFormComponent)
  },
  {
    path: 'balances/:id/edit',
    loadComponent: () => import('./components/balance-form/balance-form.component').then(m => m.BalanceFormComponent)
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