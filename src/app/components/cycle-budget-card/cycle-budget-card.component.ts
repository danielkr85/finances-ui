import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { Account } from '../../models/account.model';
import { apiErrorMessage } from '../../models/api-error.model';
import { CycleBudget } from '../../models/cycle-budget.model';
import { ForecastService } from '../../services/forecast.service';
import { MoneyPipe } from '../../shared/money.pipe';

type BudgetState =
  | { status: 'loading' }
  | { status: 'ok'; budget: CycleBudget }
  | { status: 'error'; message: string };

/** "How much can I still spend on this card this cycle?" for one fully configured credit card. */
@Component({
  selector: 'app-cycle-budget-card',
  imports: [MoneyPipe, DatePipe],
  templateUrl: './cycle-budget-card.component.html',
  styleUrls: ['./cycle-budget-card.component.css'],
})
export class CycleBudgetCardComponent {
  private readonly forecastService = inject(ForecastService);

  readonly account = input.required<Account>();
  readonly showEvents = signal(false);

  readonly state = toSignal(
    toObservable(computed(() => this.account().id)).pipe(
      switchMap((id) =>
        this.forecastService.getCycleBudget(id).pipe(
          map((budget): BudgetState => ({ status: 'ok', budget })),
          catchError((err) =>
            of<BudgetState>({
              status: 'error',
              message: apiErrorMessage(err, 'Failed to load the cycle budget.'),
            }),
          ),
          startWith<BudgetState>({ status: 'loading' }),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as BudgetState },
  );

  readonly budget = computed(() => {
    const s = this.state();
    return s.status === 'ok' ? s.budget : null;
  });

  /** Even spending allowance per remaining day (none when over budget). */
  readonly perDay = computed(() => {
    const b = this.budget();
    return b && b.remaining > 0 && b.daysLeftInCycle > 0
      ? Math.floor(b.remaining / b.daysLeftInCycle)
      : 0;
  });

  /** Bar widths as % of the target: spent, planned, then what's left. */
  readonly bar = computed(() => {
    const b = this.budget();
    if (!b || b.monthlyTarget <= 0) {
      return null;
    }
    const pct = (v: number) => Math.max(0, Math.min(100, (v / b.monthlyTarget) * 100));
    const spent = pct(b.spentThisCycle);
    const planned = Math.min(pct(Math.max(0, b.plannedRemaining)), 100 - spent);
    return { spent, planned };
  });
}
