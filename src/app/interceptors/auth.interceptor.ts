import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * For calls to the finances API:
 * - /auth/** goes out with credentials (the refresh cookie) and no bearer token;
 * - everything else gets `Authorization: Bearer <token>`, refreshing first if the token is about to expire;
 * - a 401 triggers one refresh and one retry; if the refresh is rejected, the user is sent to the login page.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  const auth = inject(AuthService);
  if (req.url.startsWith(auth.authUrl)) {
    return next(req.clone({ withCredentials: true }));
  }

  const endSessionAndRethrow = (err: unknown) => {
    if (err instanceof HttpErrorResponse && err.status === 401) {
      auth.sessionExpired();
    }
    return throwError(() => err);
  };

  return auth.validAccessToken().pipe(
    catchError(endSessionAndRethrow),
    switchMap(token => next(withBearer(req, token)).pipe(
      catchError(err => {
        if (!(err instanceof HttpErrorResponse) || err.status !== 401 || token === null) {
          return throwError(() => err);
        }
        return auth.refresh().pipe(
          catchError(endSessionAndRethrow),
          switchMap(tokens => next(withBearer(req, tokens.accessToken)))
        );
      })
    ))
  );
};

function withBearer<T>(req: HttpRequest<T>, token: string | null): HttpRequest<T> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}
