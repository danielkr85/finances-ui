import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { applyServerErrors, serverError } from '../../shared/form-errors';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const { newPassword, confirmPassword } = group.value as {
    newPassword: string;
    confirmPassword: string;
  };
  return confirmPassword && newPassword !== confirmPassword ? { mismatch: true } : null;
}

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  private readonly userService = inject(UserService);
  protected readonly auth = inject(AuthService);

  readonly serverError = serverError;
  readonly minLength = PASSWORD_MIN_LENGTH;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(PASSWORD_MIN_LENGTH),
          Validators.maxLength(PASSWORD_MAX_LENGTH),
        ],
      ],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  changePassword(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.userService.changePassword({ currentPassword, newPassword }).subscribe({
      // The server ends every session of this user, this one included.
      next: () => this.auth.endSession('password-changed'),
      error: (err) => {
        this.error.set(applyServerErrors(this.form, err, 'Failed to change the password.'));
        this.saving.set(false);
      },
    });
  }
}
