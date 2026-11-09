import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Account, AccountMember, ShareRole } from '../../models/account.model';
import { apiErrorMessage } from '../../models/api-error.model';
import { AccountShareService } from '../../services/account-share.service';
import { AuthService } from '../../services/auth.service';
import { applyServerErrors, serverError } from '../../shared/form-errors';

export const SHARE_ROLES: { value: ShareRole; label: string; hint: string }[] = [
  { value: 'EDITOR', label: 'Editor', hint: 'Can change the balance and planned transactions' },
  { value: 'VIEWER', label: 'Viewer', hint: 'Can only look' }
];

/** Who can see an account. The owner manages members; anyone else can see the list and leave. */
@Component({
  selector: 'app-account-shares',
  imports: [ReactiveFormsModule],
  templateUrl: './account-shares.component.html'
})
export class AccountSharesComponent implements OnInit {
  private readonly shareService = inject(AccountShareService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly account = input.required<Account>();

  readonly roles = SHARE_ROLES;
  readonly serverError = serverError;
  readonly members = signal<AccountMember[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly isOwner = computed(() => this.account().myRole === 'OWNER');
  readonly myId = computed(() => this.auth.user()?.id ?? null);

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['VIEWER' as ShareRole, Validators.required]
  });

  ngOnInit(): void {
    this.shareService.getMembers(this.account().id).subscribe({
      next: members => {
        this.members.set(members);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(apiErrorMessage(err, 'Failed to load who has access.'));
        this.loading.set(false);
      }
    });
  }

  add(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, role } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    this.shareService.addMember(this.account().id, { email: email.trim(), role }).subscribe({
      next: member => {
        this.members.update(list => [...list, member]);
        this.form.reset({ email: '', role });
        this.busy.set(false);
      },
      error: err => {
        // 404 "no user with that email" and 409 "already a member" come back as plain messages.
        this.error.set(applyServerErrors(this.form, err, 'Failed to share the account.'));
        this.busy.set(false);
      }
    });
  }

  changeRole(member: AccountMember, role: string): void {
    this.busy.set(true);
    this.error.set(null);
    this.shareService.updateMemberRole(this.account().id, member.userId, role as ShareRole).subscribe({
      next: updated => {
        this.members.update(list => list.map(m => (m.userId === updated.userId ? updated : m)));
        this.busy.set(false);
      },
      error: err => {
        this.error.set(apiErrorMessage(err, 'Failed to change the role.'));
        this.members.update(list => [...list]); // re-render the select with the old role
        this.busy.set(false);
      }
    });
  }

  remove(member: AccountMember): void {
    const leaving = member.userId === this.myId();
    const prompt = leaving
      ? `Leave "${this.account().name}"? You'll lose access until the owner shares it again.`
      : `Remove ${member.displayName} (${member.email}) from "${this.account().name}"?`;
    if (!confirm(prompt)) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.shareService.removeMember(this.account().id, member.userId).subscribe({
      next: () => {
        if (leaving) {
          this.router.navigate(['/accounts']);
          return;
        }
        this.members.update(list => list.filter(m => m.userId !== member.userId));
        this.busy.set(false);
      },
      error: err => {
        this.error.set(apiErrorMessage(err, leaving ? 'Failed to leave the account.' : 'Failed to remove the member.'));
        this.busy.set(false);
      }
    });
  }
}
