import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, defer, finalize, firstValueFrom, map, Observable, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AccessTokenResponse, LoginRequest, User } from '../models/auth.model';

/** Refresh this long before the access token expires, so a request never goes out with a dying token. */
const EXPIRY_MARGIN_MS = 30_000;
/** Web Locks name shared by every tab, so only one tab rotates the refresh token at a time. */
const REFRESH_LOCK = 'finances-auth-refresh';

/**
 * Owns the session. The access token lives only in memory; the refresh token is an HttpOnly cookie scoped to
 * /api/v1/auth that the browser sends when a request uses withCredentials.
 *
 * A refresh token works once: presenting an already-used one signs out every session from that login. So all
 * refreshes go through {@link refresh}, which shares one in-flight request within the tab and takes a Web Lock
 * across tabs.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly authUrl = `${environment.apiUrl}/auth`;

  private readonly session = signal<AccessTokenResponse | null>(null);
  private refreshInFlight: Observable<AccessTokenResponse> | null = null;

  readonly user = computed<User | null>(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');

  login(credentials: LoginRequest): Observable<User> {
    return this.http
      .post<AccessTokenResponse>(`${this.authUrl}/login`, credentials, { withCredentials: true })
      .pipe(tap(tokens => this.session.set(tokens)), map(tokens => tokens.user));
  }

  loginWithGoogle(idToken: string): Observable<User> {
    return this.http
      .post<AccessTokenResponse>(`${this.authUrl}/google`, { idToken }, { withCredentials: true })
      .pipe(tap(tokens => this.session.set(tokens)), map(tokens => tokens.user));
  }

  /**
   * Exchanges the refresh cookie for a new access token (and a rotated cookie). Concurrent callers share one
   * request. A 401 means the session is over, and clears it.
   */
  refresh(): Observable<AccessTokenResponse> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = defer(() => withRefreshLock(() => firstValueFrom(
        this.http.post<AccessTokenResponse>(`${this.authUrl}/refresh`, null, { withCredentials: true })
      ))).pipe(
        tap({
          next: tokens => this.session.set(tokens),
          error: err => {
            if (err instanceof HttpErrorResponse && err.status === 401) {
              this.session.set(null);
            }
          }
        }),
        finalize(() => (this.refreshInFlight = null)),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.refreshInFlight;
  }

  /** The current access token, refreshed first if it's about to expire; null when signed out. */
  validAccessToken(): Observable<string | null> {
    const current = this.session();
    if (!current) {
      return of(null);
    }
    if (Date.parse(current.expiresAt) - Date.now() > EXPIRY_MARGIN_MS) {
      return of(current.accessToken);
    }
    return this.refresh().pipe(map(tokens => tokens.accessToken));
  }

  /** Called once at startup: the in-memory token is gone after a reload, but the refresh cookie may still be valid. */
  restoreSession(): Promise<boolean> {
    return firstValueFrom(this.refresh().pipe(map(() => true), catchError(() => of(false))));
  }

  logout(): void {
    this.http.post<void>(`${this.authUrl}/logout`, null, { withCredentials: true })
      .pipe(catchError(() => of(undefined)))
      .subscribe(() => {
        this.session.set(null);
        this.router.navigate(['/login']);
      });
  }

  /** The session ended server-side (refresh rejected): drop it and send the user to sign in again. */
  sessionExpired(): void {
    this.session.set(null);
    const returnUrl = this.router.url;
    this.router.navigate(['/login'], {
      queryParams: returnUrl && returnUrl !== '/' && !returnUrl.startsWith('/login') ? { returnUrl } : {}
    });
  }
}

async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  return locks ? await locks.request(REFRESH_LOCK, task) : await task();
}
