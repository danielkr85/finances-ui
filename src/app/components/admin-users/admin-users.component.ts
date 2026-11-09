import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { apiErrorMessage } from '../../models/api-error.model';
import {
  CreateUserRequest, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, UpdateUserRequest, User, UserRole
} from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { AdminUserService } from '../../services/user.service';
import { applyServerErrors, serverError } from '../../shared/form-errors';

type Mode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; user: User };

/** Admin-only user management. There's no public sign-up: this is how people get access. */
@Component({
  selector: 'app-admin-users',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './admin-users.component.html'
})
export class AdminUsersComponent implements OnInit {
  private readonly adminService = inject(AdminUserService);
  private readonly auth = inject(AuthService);

  readonly serverError = serverError;
  readonly users = signal<User[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly mode = signal<Mode>({ kind: 'closed' });

  readonly myId = computed(() => this.auth.user()?.id ?? null);
  /** Admins can't demote, disable or delete themselves. */
  readonly editingSelf = computed(() => {
    const m = this.mode();
    return m.kind === 'edit' && m.user.id === this.myId();
  });

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    displayName: ['', [Validators.required, Validators.maxLength(255)]],
    role: ['USER' as UserRole, Validators.required],
    enabled: [true],
    // Optional: blank = Google-only (create) or unchanged (edit).
    password: ['', [Validators.minLength(PASSWORD_MIN_LENGTH), Validators.maxLength(PASSWORD_MAX_LENGTH)]]
  });

  ngOnInit(): void {
    this.adminService.getUsers().subscribe({
      next: users => {
        this.users.set(sortUsers(users));
        this.loading.set(false);
      },
      error: err => {
        this.error.set(apiErrorMessage(err, 'Failed to load users.'));
        this.loading.set(false);
      }
    });
  }

  openCreate(): void {
    this.form.reset({ email: '', displayName: '', role: 'USER', enabled: true, password: '' });
    this.form.enable();
    this.formError.set(null);
    this.mode.set({ kind: 'create' });
  }

  openEdit(user: User): void {
    this.form.reset({ email: user.email, displayName: user.displayName, role: user.role, enabled: user.enabled, password: '' });
    this.form.enable();
    this.form.controls.email.disable(); // the email can't be changed
    if (user.id === this.myId()) {
      this.form.controls.role.disable();
      this.form.controls.enabled.disable();
    }
    this.formError.set(null);
    this.mode.set({ kind: 'edit', user });
  }

  close(): void {
    this.mode.set({ kind: 'closed' });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const password = v.password || undefined;
    const mode = this.mode();
    const request = mode.kind === 'edit'
      ? this.adminService.updateUser(mode.user.id,
          { displayName: v.displayName.trim(), role: v.role, enabled: v.enabled, password } satisfies UpdateUserRequest)
      : this.adminService.createUser(
          { email: v.email.trim(), displayName: v.displayName.trim(), role: v.role, password } satisfies CreateUserRequest);

    this.saving.set(true);
    this.formError.set(null);
    request.subscribe({
      next: saved => {
        this.users.update(list => sortUsers([...list.filter(u => u.id !== saved.id), saved]));
        this.auth.updateCurrentUser(saved);
        this.saving.set(false);
        this.close();
      },
      error: err => {
        this.formError.set(applyServerErrors(this.form, err, 'Failed to save the user.'));
        this.saving.set(false);
      }
    });
  }

  remove(user: User): void {
    if (!confirm(`Delete ${user.displayName} (${user.email})? They won't be able to sign in any more.`)) {
      return;
    }
    this.error.set(null);
    this.adminService.deleteUser(user.id).subscribe({
      next: () => {
        this.users.update(list => list.filter(u => u.id !== user.id));
        const m = this.mode();
        if (m.kind === 'edit' && m.user.id === user.id) {
          this.close();
        }
      },
      error: err => this.error.set(err instanceof HttpErrorResponse && err.status === 409
        ? `${user.displayName} still owns accounts or categories, so they can't be deleted. Disable them instead.`
        : apiErrorMessage(err, 'Failed to delete the user.'))
    });
  }
}

function sortUsers(users: User[]): User[] {
  return [...users].sort((a, b) => a.displayName.localeCompare(b.displayName));
}
