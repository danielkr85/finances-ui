import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Account, AccountType, hasRole } from '../../models/account.model';
import { apiErrorMessage } from '../../models/api-error.model';
import { AccountShareService } from '../../services/account-share.service';
import { AccountService } from '../../services/account.service';
import { AuthService } from '../../services/auth.service';
import { MoneyPipe } from '../../shared/money.pipe';

/** What the confirmation dialog will do: delete (owner) or leave (shared member). */
interface PendingRemoval {
  account: Account;
  action: 'delete' | 'leave';
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: 'Checking',
  SAVINGS: 'Savings',
  CREDIT_CARD: 'Credit card',
};

@Component({
  selector: 'app-account-list',
  templateUrl: './account-list.component.html',
  styleUrls: ['./account-list.component.css'],
  imports: [RouterLink, MoneyPipe],
})
export class AccountListComponent implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly shareService = inject(AccountShareService);
  private readonly auth = inject(AuthService);

  readonly typeLabels = ACCOUNT_TYPE_LABELS;
  readonly accounts = signal<Account[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly pending = signal<PendingRemoval | null>(null);

  /** Main account first, then by name. */
  readonly sortedAccounts = computed(() =>
    [...this.accounts()].sort(
      (a, b) => Number(b.main) - Number(a.main) || a.name.localeCompare(b.name),
    ),
  );

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.loading.set(true);
    this.error.set(null);
    this.accountService.getAllAccounts().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Failed to load accounts.'));
        this.loading.set(false);
      },
    });
  }

  canEdit(account: Account): boolean {
    return hasRole(account.myRole, 'EDITOR');
  }

  isOwner(account: Account): boolean {
    return account.myRole === 'OWNER';
  }

  askToRemove(account: Account): void {
    this.pending.set({ account, action: this.isOwner(account) ? 'delete' : 'leave' });
  }

  confirmRemoval(): void {
    const pending = this.pending();
    const me = this.auth.user();
    if (!pending || !me) {
      return;
    }
    const request =
      pending.action === 'delete'
        ? this.accountService.deleteAccount(pending.account.id)
        : this.shareService.removeMember(pending.account.id, me.id);

    request.subscribe({
      next: () => {
        this.pending.set(null);
        this.accounts.update((list) => list.filter((a) => a.id !== pending.account.id));
      },
      error: (err) => {
        this.pending.set(null);
        if (pending.action === 'delete' && err instanceof HttpErrorResponse && err.status === 409) {
          this.error.set(
            `"${pending.account.name}" still has planned transactions. Delete them first.`,
          );
        } else {
          this.error.set(
            apiErrorMessage(
              err,
              pending.action === 'delete'
                ? 'Failed to delete the account.'
                : 'Failed to leave the account.',
            ),
          );
        }
      },
    });
  }
}
