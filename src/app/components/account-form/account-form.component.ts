import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Account, AccountRequest, AccountType } from '../../models/account.model';
import { apiErrorMessage } from '../../models/api-error.model';
import { AccountService } from '../../services/account.service';
import { applyServerErrors, serverError } from '../../shared/form-errors';
import { ACCOUNT_TYPE_LABELS } from '../account-list/account-list.component';
import { AccountSharesComponent } from '../account-shares/account-shares.component';

const WHOLE_NUMBER = Validators.pattern(/^-?\d+$/);

/** A credit card's unpaid statement is part of what's owed, so it can't exceed the amount. */
function statementWithinAmount(group: AbstractControl): ValidationErrors | null {
  const { type, amount, statementBalance } = group.value as {
    type: AccountType;
    amount: number | null;
    statementBalance: number | null;
  };
  return type === 'CREDIT_CARD' &&
    amount !== null &&
    statementBalance !== null &&
    statementBalance > amount
    ? { statementExceedsAmount: true }
    : null;
}

@Component({
  selector: 'app-account-form',
  imports: [ReactiveFormsModule, RouterLink, AccountSharesComponent],
  templateUrl: './account-form.component.html',
  styleUrls: ['./account-form.component.css'],
})
export class AccountFormComponent implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly serverError = serverError;
  readonly accountTypes = (Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((value) => ({
    value,
    label: ACCOUNT_TYPE_LABELS[value],
  }));

  readonly accountId = signal<number | null>(null);
  readonly account = signal<Account | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly isEditing = computed(() => this.accountId() !== null);
  readonly readOnly = computed(() => this.account()?.myRole === 'VIEWER');

  readonly form = inject(FormBuilder).group(
    {
      name: ['', [Validators.required, Validators.maxLength(255)]],
      amount: [null as number | null, [Validators.required, WHOLE_NUMBER]],
      type: ['CHECKING' as AccountType, Validators.required],
      main: [false],
      paymentDueDay: [null as number | null, [Validators.min(1), Validators.max(31), WHOLE_NUMBER]],
      closingDaysBeforeDue: [
        null as number | null,
        [Validators.min(1), Validators.max(28), WHOLE_NUMBER],
      ],
      statementBalance: [null as number | null, [Validators.min(0), WHOLE_NUMBER]],
      monthlyTarget: [null as number | null, [Validators.min(0), WHOLE_NUMBER]],
    },
    { validators: statementWithinAmount },
  );

  private readonly type = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });
  readonly isCreditCard = computed(() => this.type() === 'CREDIT_CARD');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.accountId.set(id);
      this.load(id);
    }
  }

  private load(id: number): void {
    this.loading.set(true);
    this.accountService.getAccountById(id).subscribe({
      next: (account) => {
        this.account.set(account);
        this.form.patchValue(account);
        if (account.myRole === 'VIEWER') {
          this.form.disable();
        } else if (account.myRole === 'EDITOR') {
          this.form.controls.name.disable(); // only the owner can rename
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Failed to load the account.'));
        this.loading.set(false);
      },
    });
  }

  invalid(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && control.touched;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const creditCard = v.type === 'CREDIT_CARD';
    const request: AccountRequest = {
      name: v.name!.trim(),
      amount: Number(v.amount),
      type: v.type!,
      main: !!v.main,
      // Billing fields are only allowed on credit cards.
      paymentDueDay: creditCard ? v.paymentDueDay : null,
      closingDaysBeforeDue: creditCard ? v.closingDaysBeforeDue : null,
      statementBalance: creditCard ? v.statementBalance : null,
      monthlyTarget: creditCard ? v.monthlyTarget : null,
    };

    const id = this.accountId();
    const save =
      id === null
        ? this.accountService.createAccount(request)
        : this.accountService.updateAccount(id, request);

    this.saving.set(true);
    this.error.set(null);
    save.subscribe({
      next: () => this.router.navigate(['/accounts']),
      error: (err) => {
        this.saving.set(false);
        this.error.set(applyServerErrors(this.form, err, 'Failed to save the account.'));
      },
    });
  }
}
