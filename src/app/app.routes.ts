import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/balances',
    pathMatch: 'full'
  },
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
  }
];
