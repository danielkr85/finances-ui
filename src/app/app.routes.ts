import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './guards/auth.guards';

const accountForm = () => import('./components/account-form/account-form.component').then(m => m.AccountFormComponent);
const plannedForm = () =>
  import('./components/planned-transaction-form/planned-transaction-form.component').then(m => m.PlannedTransactionFormComponent);

/** Everything behind sign-in. */
const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'accounts',
    loadComponent: () => import('./components/account-list/account-list.component').then(m => m.AccountListComponent)
  },
  { path: 'accounts/new', loadComponent: accountForm },
  { path: 'accounts/:id/edit', loadComponent: accountForm },
  {
    path: 'planned-transactions',
    loadComponent: () =>
      import('./components/planned-transaction-list/planned-transaction-list.component').then(m => m.PlannedTransactionListComponent)
  },
  { path: 'planned-transactions/new', loadComponent: plannedForm },
  { path: 'planned-transactions/:id/edit', loadComponent: plannedForm },
  {
    path: 'forecast',
    loadComponent: () => import('./components/forecast/forecast.component').then(m => m.ForecastComponent)
  },
  {
    path: 'categories',
    loadComponent: () => import('./components/category-list/category-list.component').then(m => m.CategoryListComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'admin/users',
    canActivate: [adminGuard],
    loadComponent: () => import('./components/admin-users/admin-users.component').then(m => m.AdminUsersComponent)
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
