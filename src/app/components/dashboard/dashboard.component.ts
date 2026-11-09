import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { Account, hasCycleBudget } from '../../models/account.model';
import { AccountService } from '../../services/account.service';
import { AccountListComponent } from '../account-list/account-list.component';
import { CycleBudgetCardComponent } from '../cycle-budget-card/cycle-budget-card.component';
import { ForecastComponent } from '../forecast/forecast.component';

@Component({
  selector: 'app-dashboard',
  imports: [AccountListComponent, ForecastComponent, CycleBudgetCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  // The account list shows its own load errors; this only decides which budget cards to show.
  private readonly accounts = toSignal(
    inject(AccountService).getAllAccounts().pipe(catchError(() => of([] as Account[]))),
    { initialValue: [] as Account[] }
  );

  readonly budgetCards = computed(() => this.accounts().filter(hasCycleBudget));
}
