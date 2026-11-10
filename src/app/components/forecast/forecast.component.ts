import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { forkJoin, map } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Account, hasCycleBudget } from '../../models/account.model';
import { apiErrorMessage } from '../../models/api-error.model';
import { combineForecasts, isCombinedEvent } from '../../models/combined-forecast';
import {
  FinancialEvent,
  Forecast,
  forecastExtreme,
  signedAmount,
} from '../../models/forecast.model';
import { AccountService } from '../../services/account.service';
import { ForecastService } from '../../services/forecast.service';
import { addDaysIso, isIsoDate, todayIso } from '../../shared/dates';
import { MoneyPipe } from '../../shared/money.pipe';
import { CycleBudgetCardComponent } from '../cycle-budget-card/cycle-budget-card.component';
import { ForecastChartComponent } from '../forecast-chart/forecast-chart.component';

export const RANGE_PRESETS = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '6 months', days: 182 },
  { label: '1 year', days: 365 },
];
const DEFAULT_DAYS = 90;
/** `accountId` in the URL for the combined view. */
export const ALL_ACCOUNTS = 'all';
/** Rows shown on the dashboard before "See full forecast". */
const EMBEDDED_ROWS = 8;

/**
 * Day-by-day projection of an account's balance from its planned transactions, or of all accounts combined (cash
 * minus card debt). Routed at /forecast (state in the query string: accountId, which may be "all", from, to) or
 * embedded on the dashboard with `embedded`.
 */
@Component({
  selector: 'app-forecast',
  imports: [RouterLink, MoneyPipe, DatePipe, CycleBudgetCardComponent, ForecastChartComponent],
  templateUrl: './forecast.component.html',
  styleUrls: ['./forecast.component.css'],
})
export class ForecastComponent implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly forecastService = inject(ForecastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Compact dashboard mode: no URL syncing, fewer rows. */
  readonly embedded = input(false);

  readonly presets = RANGE_PRESETS;
  readonly signedAmount = signedAmount;
  readonly hasCycleBudget = hasCycleBudget;
  readonly today = todayIso();

  readonly accounts = signal<Account[]>([]);
  readonly accountId = signal<number | null>(null);
  /** Showing all accounts added together instead of `accountId`. */
  readonly combined = signal(false);
  /** Accounts left out of the combined view (it starts with everything). */
  readonly excludedIds = signal<ReadonlySet<number>>(new Set());
  readonly from = signal(this.today);
  readonly to = signal(addDaysIso(this.today, DEFAULT_DAYS));
  readonly forecast = signal<Forecast | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  private requestSeq = 0;

  readonly account = computed(() =>
    this.combined() ? null : (this.accounts().find((a) => a.id === this.accountId()) ?? null),
  );
  readonly isCreditCard = computed(() => this.account()?.type === 'CREDIT_CARD');
  readonly includedAccounts = computed(() =>
    this.accounts().filter((a) => !this.excludedIds().has(a.id)),
  );
  /** Combining needs at least two accounts to mean anything. */
  readonly canCombine = computed(() => this.accounts().length > 1);
  readonly balanceLabel = computed(() =>
    this.combined() ? 'Net' : this.isCreditCard() ? 'Owed' : 'Balance',
  );
  /** For "See full forecast" and the URL. */
  readonly selectionParam = computed(() => (this.combined() ? ALL_ACCOUNTS : this.accountId()));

  /** Each date with only this account's events (a transfer also lists the other account's side). */
  readonly rows = computed(() => {
    const f = this.forecast();
    if (!f) {
      return [];
    }
    const rows = f.projections.map((p) => ({
      ...p,
      events: p.events.filter((e) => e.accountId === f.accountId),
    }));
    return this.embedded() ? rows.slice(0, EMBEDDED_ROWS) : rows;
  });
  readonly hiddenRows = computed(
    () => (this.forecast()?.projections.length ?? 0) - this.rows().length,
  );

  /** The low point for a bank account, or the peak of what's owed on a card. */
  readonly extreme = computed(() => {
    const f = this.forecast();
    return f ? forecastExtreme(f, this.isCreditCard()) : null;
  });

  ngOnInit(): void {
    if (!this.embedded()) {
      const q = this.route.snapshot.queryParamMap;
      const from = q.get('from');
      const to = q.get('to');
      if (isIsoDate(from) && from >= this.today) {
        this.from.set(from);
      }
      if (isIsoDate(to) && to >= this.from()) {
        this.to.set(to);
      } else {
        this.to.set(addDaysIso(this.from(), DEFAULT_DAYS));
      }
    }

    this.accountService.getAllAccounts().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        const param = this.embedded() ? null : this.route.snapshot.queryParamMap.get('accountId');
        const requested = Number(param);
        const initial =
          accounts.find((a) => a.id === requested) ?? accounts.find((a) => a.main) ?? accounts[0];
        if (initial) {
          this.accountId.set(initial.id);
          this.combined.set(param === ALL_ACCOUNTS && accounts.length > 1);
          this.load();
        }
      },
      error: (err) => this.error.set(apiErrorMessage(err, 'Failed to load accounts.')),
    });
  }

  selectAccount(value: string): void {
    if (value === ALL_ACCOUNTS) {
      this.combined.set(true);
    } else {
      this.combined.set(false);
      this.accountId.set(Number(value));
    }
    this.load();
  }

  toggleIncluded(accountId: number): void {
    const next = new Set(this.excludedIds());
    if (!next.delete(accountId)) {
      next.add(accountId);
    }
    this.excludedIds.set(next);
    this.load();
  }

  /** The account a combined-view event happens on. */
  sourceAccountName(event: FinancialEvent): string | null {
    if (!isCombinedEvent(event)) {
      return null;
    }
    return this.accounts().find((a) => a.id === event.sourceAccountId)?.name ?? null;
  }

  setFrom(value: string): void {
    this.from.set(value);
    this.load();
  }

  setTo(value: string): void {
    this.to.set(value);
    this.load();
  }

  applyPreset(days: number): void {
    this.from.set(this.today);
    this.to.set(addDaysIso(this.today, days));
    this.load();
  }

  isPreset(days: number): boolean {
    return this.from() === this.today && this.to() === addDaysIso(this.today, days);
  }

  private load(): void {
    const accountId = this.accountId();
    const from = this.from();
    const to = this.to();
    if (accountId === null) {
      return;
    }
    if (!isIsoDate(from) || !isIsoDate(to) || from < this.today || to < from) {
      this.error.set('Choose a start date from today on, and an end date on or after it.');
      return;
    }
    if (!this.embedded()) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { accountId: this.selectionParam(), from, to },
        replaceUrl: true,
      });
    }

    const request = ++this.requestSeq;
    this.error.set(null);
    if (this.combined() && this.includedAccounts().length === 0) {
      this.forecast.set(null);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    // No combined endpoint exists: fetch each included account's forecast and add them up.
    const forecast$ = this.combined()
      ? forkJoin(
          this.includedAccounts().map((account) =>
            this.forecastService
              .getForecast(account.id, from, to)
              .pipe(map((forecast) => ({ account, forecast }))),
          ),
        ).pipe(map(combineForecasts))
      : this.forecastService.getForecast(accountId, from, to);
    forecast$.subscribe({
      next: (forecast) => {
        if (request === this.requestSeq) {
          // ignore responses for a selection that has since changed
          this.forecast.set(forecast);
          this.loading.set(false);
        }
      },
      error: (err) => {
        if (request === this.requestSeq) {
          this.forecast.set(null);
          this.error.set(apiErrorMessage(err, 'Failed to load the forecast.'));
          this.loading.set(false);
        }
      },
    });
  }
}
