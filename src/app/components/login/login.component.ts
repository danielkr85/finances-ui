import { AfterViewInit, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from '../../models/api-error.model';
import { User } from '../../models/auth.model';
import { AuthService } from '../../services/auth.service';
import { loadGoogleIdentity } from './google-identity';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly googleEnabled = !!environment.googleClientId;
  private readonly googleButton = viewChild<ElementRef<HTMLElement>>('googleButton');

  readonly notice = this.route.snapshot.queryParamMap.get('reason') === 'password-changed'
    ? 'Your password was changed and you were signed out everywhere. Sign in with your new password.'
    : null;
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  ngAfterViewInit(): void {
    const container = this.googleButton()?.nativeElement;
    if (!this.googleEnabled || !container) {
      return;
    }
    loadGoogleIdentity()
      .then(google => {
        google.accounts.id.initialize({
          client_id: environment.googleClientId,
          callback: response => this.signIn(this.auth.loginWithGoogle(response.credential))
        });
        google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', width: 320 });
      })
      .catch(() => this.error.set('Google sign-in is unavailable right now. You can still sign in with a password.'));
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.signIn(this.auth.login(this.form.getRawValue()));
  }

  private signIn(request: Observable<User>): void {
    this.submitting.set(true);
    this.error.set(null);
    request.subscribe({
      next: () => this.router.navigateByUrl(this.safeReturnUrl()),
      error: err => {
        this.submitting.set(false);
        this.error.set(apiErrorMessage(err, 'Sign-in failed. Please try again.'));
      }
    });
  }

  /** Only in-app paths, so a crafted ?returnUrl= can't send the user to another site. */
  private safeReturnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url && url.startsWith('/') && !url.startsWith('//') ? url : '/';
  }
}
