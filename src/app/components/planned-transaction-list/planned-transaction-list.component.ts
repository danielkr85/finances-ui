import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Account, hasRole } from '../../models/account.model';
import { apiErrorMessage } from '../../models/api-error.model';
import { Category } from '../../models/category.model';
import { DAYS_OF_WEEK, MONTHS_OF_YEAR } from '../../models/frequency.model';
import { EventType, PlannedTransaction } from '../../models/planned-transaction.model';
import { AccountService } from '../../services/account.service';
import { PlannedTransactionService } from '../../services/planned-transaction.service';
import { MoneyPipe } from '../../shared/money.pipe';

type TypeFilter = 'ALL' | EventType;

const DAY_LABELS = new Map(DAYS_OF_WEEK.map((d) => [d.value, d.label]));
const MONTH_LABELS = new Map(MONTHS_OF_YEAR.map((m) => [m.value, m.label]));

/** "Monthly on day 1", "Bi-weekly on Friday", "Quarterly from March, day 20", "Yearly on April 30". */
export function describeSchedule(t: PlannedTransaction): string {
  const f = t.frequency;
  if (!f) {
    return 'One-time';
  }
  switch (f.intervalUnit) {
    case 'WEEK':
      return `${f.description} on ${DAY_LABELS.get(f.dayOfWeek!) ?? f.dayOfWeek}`;
    case 'MONTH':
      return f.month
        ? `${f.description} from ${MONTH_LABELS.get(f.month)}, day ${f.dayOfMonth}`
        : `${f.description} on day ${f.dayOfMonth}`;
    case 'YEAR':
      return `${f.description} on ${MONTH_LABELS.get(f.month!)} ${f.dayOfMonth}`;
    default:
      return f.description;
  }
}

@Component({
  selector: 'app-planned-transaction-list',
  imports: [RouterLink, MoneyPipe, DatePipe, TitleCasePipe],
  templateUrl: './planned-transaction-list.component.html',
  styleUrls: ['./planned-transaction-list.component.css'],
})
export class PlannedTransactionListComponent implements OnInit {
  private readonly plannedService = inject(PlannedTransactionService);
  private readonly accountService = inject(AccountService);

  readonly describeSchedule = describeSchedule;
  readonly transactions = signal<PlannedTransaction[]>([]);
  readonly accounts = signal<Account[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly pendingDelete = signal<PlannedTransaction | null>(null);

  readonly typeFilter = signal<TypeFilter>('ALL');
  readonly accountFilter = signal<number | null>(null);
  readonly categoryFilter = signal<ReadonlySet<number>>(new Set());

  private readonly accountsById = computed(() => new Map(this.accounts().map((a) => [a.id, a])));

  /**
   * Categories come from the transactions themselves: on shared accounts they can belong to other members and
   * wouldn't be in your own /categories list.
   */
  readonly categories = computed(() => {
    const byId = new Map<number, Category>();
    for (const t of this.transactions()) {
      if (t.category) {
        byId.set(t.category.id, t.category);
      }
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly filtered = computed(() => {
    const type = this.typeFilter();
    const account = this.accountFilter();
    const cats = this.categoryFilter();
    return this.transactions()
      .filter((t) => type === 'ALL' || t.type === type)
      .filter((t) => account === null || t.accountId === account || t.targetAccountId === account)
      .filter((t) => cats.size === 0 || (t.category !== null && cats.has(t.category.id)))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly hasActiveFilters = computed(
    () =>
      this.typeFilter() !== 'ALL' ||
      this.accountFilter() !== null ||
      this.categoryFilter().size > 0,
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      transactions: this.plannedService.getPlannedTransactions(),
      accounts: this.accountService.getAllAccounts(),
    }).subscribe({
      next: ({ transactions, accounts }) => {
        this.transactions.set(transactions);
        this.accounts.set(accounts);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Failed to load planned transactions.'));
        this.loading.set(false);
      },
    });
  }

  accountName(id: number | null): string {
    if (id === null) {
      return '';
    }
    return this.accountsById().get(id)?.name ?? 'an account you can’t see';
  }

  canEdit(t: PlannedTransaction): boolean {
    const account = this.accountsById().get(t.accountId);
    return !!account && hasRole(account.myRole, 'EDITOR');
  }

  setAccountFilter(value: string): void {
    this.accountFilter.set(value ? Number(value) : null);
  }

  toggleCategory(id: number): void {
    this.categoryFilter.update((current) => {
      const next = new Set(current);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  }

  clearFilters(): void {
    this.typeFilter.set('ALL');
    this.accountFilter.set(null);
    this.categoryFilter.set(new Set());
  }

  confirmDelete(): void {
    const target = this.pendingDelete();
    if (!target) {
      return;
    }
    this.plannedService.deletePlannedTransaction(target.id).subscribe({
      next: () => {
        this.pendingDelete.set(null);
        this.transactions.update((list) => list.filter((t) => t.id !== target.id));
      },
      error: (err) => {
        this.pendingDelete.set(null);
        this.error.set(apiErrorMessage(err, 'Failed to delete the planned transaction.'));
      },
    });
  }
}
