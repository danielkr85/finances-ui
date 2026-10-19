import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    pathMatch: 'full'
  },
  // --- Balances ---
  {
    path: 'balances',
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