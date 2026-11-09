import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, merge, of } from 'rxjs';
import { Account, hasRole } from '../../models/account.model';
import { apiErrorMessage } from '../../models/api-error.model';
import { Category } from '../../models/category.model';
import {
  buildFrequencyPayload,
  DAYS_OF_WEEK,
  DayOfWeek,
  FrequencyFormValue,
  INTERVAL_UNITS,
  IntervalUnit,
  Month,
  MONTHS_OF_YEAR,
  updateFrequencyFieldRequirements,
} from '../../models/frequency.model';
import {
  EventType,
  PlannedTransaction,
  PlannedTransactionRequest,
} from '../../models/planned-transaction.model';
import { AccountService } from '../../services/account.service';
import { CategoryService } from '../../services/category.service';
import { PlannedTransactionService } from '../../services/planned-transaction.service';
import { todayIso } from '../../shared/dates';
import { applyServerErrors, serverError } from '../../shared/form-errors';

const WHOLE_NUMBER = Validators.pattern(/^\d+$/);

/** Cross-field rules the server also enforces: end ≥ start, and a transfer between two different accounts. */
function plannedTransactionRules(group: AbstractControl): ValidationErrors | null {
  const v = (group as FormGroup).getRawValue() as {
    type: EventType;
    accountId: number | null;
    targetAccountId: number | null;
    startDate: string;
    endDate: string | null;
    recurring: boolean;
  };
  const errors: ValidationErrors = {};
  if (v.recurring && v.startDate && v.endDate && v.endDate < v.startDate) {
    errors['endBeforeStart'] = true;
  }
  if (v.type === 'TRANSFER' && v.accountId !== null && v.accountId === v.targetAccountId) {
    errors['sameAccount'] = true;
  }
  return Object.keys(errors).length ? errors : null;
}

@Component({
  selector: 'app-planned-transaction-form',
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './planned-transaction-form.component.html',
  styleUrls: ['./planned-transaction-form.component.css'],
})
export class PlannedTransactionFormComponent implements OnInit {
  private readonly plannedService = inject(PlannedTransactionService);
  private readonly accountService = inject(AccountService);
  private readonly categoryService = inject(CategoryService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly serverError = serverError;
  readonly intervalUnits = INTERVAL_UNITS;
  readonly daysOfWeek = DAYS_OF_WEEK;
  readonly monthsOfYear = MONTHS_OF_YEAR;

  readonly transactionId = signal<number | null>(null);
  readonly transaction = signal<PlannedTransaction | null>(null);
  readonly accounts = signal<Account[]>([]);
  readonly ownCategories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly showNewCategory = signal(false);
  readonly creatingCategory = signal(false);
  readonly categoryError = signal<string | null>(null);
  newCategoryName = '';

  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.group(
    {
      name: ['', [Validators.required, Validators.maxLength(255)]],
      type: ['EXPENSE' as EventType, Validators.required],
      amount: [null as number | null, [Validators.required, Validators.min(1), WHOLE_NUMBER]],
      accountId: [null as number | null, Validators.required],
      targetAccountId: [{ value: null as number | null, disabled: true }, Validators.required],
      categoryId: [null as number | null],
      recurring: [true],
      startDate: [todayIso(), Validators.required],
      endDate: [null as string | null],
      frequency: this.fb.group({
        intervalUnit: ['MONTH' as IntervalUnit, Validators.required],
        intervalCount: [
          1 as number | string,
          [Validators.required, Validators.min(1), WHOLE_NUMBER],
        ],
        dayOfWeek: ['' as DayOfWeek | ''],
        dayOfMonth: [1 as number | string | null],
        month: ['' as Month | ''],
      }),
    },
    { validators: plannedTransactionRules },
  );

  private readonly type = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });
  private readonly sourceId = toSignal(this.form.controls.accountId.valueChanges, {
    initialValue: null,
  });
  readonly recurring = toSignal(this.form.controls.recurring.valueChanges, { initialValue: true });
  private readonly frequencyValue = toSignal(this.form.controls.frequency.valueChanges, {
    initialValue: this.form.controls.frequency.value,
  });

  readonly isTransfer = computed(() => this.type() === 'TRANSFER');
  readonly unit = computed(() => this.frequencyValue().intervalUnit);
  readonly needsAnchorMonth = computed(
    () =>
      this.unit() === 'YEAR' ||
      (this.unit() === 'MONTH' && Number(this.frequencyValue().intervalCount) > 1),
  );

  /** Planned transactions can only be put on accounts you can edit (both ends, for a transfer). */
  readonly editableAccounts = computed(() =>
    this.accounts().filter((a) => hasRole(a.myRole, 'EDITOR')),
  );
  readonly targetAccounts = computed(() =>
    this.editableAccounts().filter((a) => a.id !== this.sourceId()),
  );

  /** Your categories, plus the transaction's current one when it belongs to another member (it can be kept). */
  readonly categoryOptions = computed(() => {
    const current = this.transaction()?.category;
    const own = this.ownCategories();
    return current && !own.some((c) => c.id === current.id)
      ? [...own, { ...current, name: `${current.name} (shared)` }]
      : own;
  });

  /** Viewers can open the page but not change anything. */
  readonly readOnly = computed(() => {
    const t = this.transaction();
    if (!t) {
      return false;
    }
    const source = this.accounts().find((a) => a.id === t.accountId);
    return !source || !hasRole(source.myRole, 'EDITOR');
  });

  readonly accountLabel = computed(() =>
    this.type() === 'INCOME' ? 'Into account' : 'From account',
  );

  constructor() {
    this.form.controls.type.valueChanges.subscribe(() => this.applyTypeRules());
    this.form.controls.recurring.valueChanges.subscribe(() => this.applyRecurringRules());
    const freq = this.form.controls.frequency.controls;
    merge(freq.intervalUnit.valueChanges, freq.intervalCount.valueChanges).subscribe(() =>
      updateFrequencyFieldRequirements(this.form.controls.frequency),
    );
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.transactionId.set(id);

    forkJoin({
      accounts: this.accountService.getAllAccounts(),
      categories: this.categoryService.getCategories(),
      transaction: id ? this.plannedService.getPlannedTransactionById(id) : of(null),
    }).subscribe({
      next: ({ accounts, categories, transaction }) => {
        this.accounts.set(accounts);
        this.ownCategories.set(categories);
        if (transaction) {
          this.fillForm(transaction);
        } else {
          this.prefillAccount();
          updateFrequencyFieldRequirements(this.form.controls.frequency);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Failed to load the form.'));
        this.loading.set(false);
      },
    });
  }

  /** New transactions start on ?accountId= if you can edit it, else your main account. */
  private prefillAccount(): void {
    const requested = Number(this.route.snapshot.queryParamMap.get('accountId'));
    const editable = this.editableAccounts();
    const account =
      editable.find((a) => a.id === requested) ?? editable.find((a) => a.main) ?? editable[0];
    if (account) {
      this.form.controls.accountId.setValue(account.id);
    }
  }

  private fillForm(t: PlannedTransaction): void {
    this.transaction.set(t);
    this.form.patchValue({
      name: t.name,
      type: t.type,
      amount: t.amount,
      accountId: t.accountId,
      targetAccountId: t.targetAccountId,
      categoryId: t.category?.id ?? null,
      recurring: t.frequency !== null,
      startDate: t.startDate,
      endDate: t.endDate,
    });
    if (t.frequency) {
      this.form.controls.frequency.patchValue({
        intervalUnit: t.frequency.intervalUnit,
        intervalCount: t.frequency.intervalCount,
        dayOfWeek: t.frequency.dayOfWeek ?? '',
        dayOfMonth: t.frequency.dayOfMonth,
        month: t.frequency.month ?? '',
      });
    }
    updateFrequencyFieldRequirements(this.form.controls.frequency);
    if (this.readOnly()) {
      this.form.disable({ emitEvent: false });
    }
  }

  private applyTypeRules(): void {
    const target = this.form.controls.targetAccountId;
    if (this.form.controls.type.value === 'TRANSFER') {
      target.enable({ emitEvent: false });
    } else {
      target.reset(null, { emitEvent: false });
      target.disable({ emitEvent: false });
    }
  }

  private applyRecurringRules(): void {
    const { frequency, endDate } = this.form.controls;
    if (this.form.controls.recurring.value) {
      frequency.enable({ emitEvent: false });
      endDate.enable({ emitEvent: false });
      updateFrequencyFieldRequirements(frequency);
    } else {
      frequency.disable({ emitEvent: false });
      endDate.disable({ emitEvent: false });
    }
  }

  invalid(path: string): boolean {
    const control = this.form.get(path);
    return !!control && control.invalid && control.touched;
  }

  toggleNewCategory(): void {
    this.showNewCategory.update((v) => !v);
    this.newCategoryName = '';
    this.categoryError.set(null);
  }

  createCategory(): void {
    const name = this.newCategoryName.trim();
    if (!name) {
      return;
    }
    this.creatingCategory.set(true);
    this.categoryError.set(null);
    this.categoryService.createCategory({ name }).subscribe({
      next: (created) => {
        this.ownCategories.update((list) =>
          [...list, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        this.form.controls.categoryId.setValue(created.id);
        this.showNewCategory.set(false);
        this.newCategoryName = '';
        this.creatingCategory.set(false);
      },
      error: (err) => {
        this.categoryError.set(apiErrorMessage(err, 'Failed to create the category.'));
        this.creatingCategory.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const request: PlannedTransactionRequest = {
      name: v.name!.trim(),
      type: v.type!,
      amount: Number(v.amount),
      frequency: v.recurring ? buildFrequencyPayload(v.frequency as FrequencyFormValue) : null,
      accountId: v.accountId!,
      targetAccountId: v.type === 'TRANSFER' ? v.targetAccountId : null,
      startDate: v.startDate!,
      endDate: v.recurring && v.endDate ? v.endDate : null,
      categoryId: v.categoryId,
    };

    const id = this.transactionId();
    const save =
      id === null
        ? this.plannedService.createPlannedTransaction(request)
        : this.plannedService.updatePlannedTransaction(id, request);

    this.saving.set(true);
    this.error.set(null);
    save.subscribe({
      next: () => this.router.navigate(['/planned-transactions']),
      error: (err) => {
        this.saving.set(false);
        this.error.set(
          applyServerErrors(this.form, err, 'Failed to save the planned transaction.', {
            frequency: 'frequency.intervalUnit',
          }),
        );
      },
    });
  }
}
