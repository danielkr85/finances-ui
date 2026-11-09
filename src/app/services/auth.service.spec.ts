import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { flushMicrotasks, tokens } from '../testing/auth-fixtures';
import { AuthService } from './auth.service';

const AUTH = `${environment.apiUrl}/auth`;

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', children: [] }]),
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('signs in with a password and keeps the session in memory', async () => {
    const result = firstValueFrom(auth.login({ email: 'me@example.com', password: 'secret' }));

    const req = http.expectOne(`${AUTH}/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({ email: 'me@example.com', password: 'secret' });
    req.flush(tokens('access-1'));

    expect((await result).email).toBe('me@example.com');
    expect(auth.isAuthenticated()).toBe(true);
    expect(await firstValueFrom(auth.validAccessToken())).toBe('access-1');
  });

  it('signs in with a Google ID token', async () => {
    const result = firstValueFrom(auth.loginWithGoogle('google-credential'));

    const req = http.expectOne(`${AUTH}/google`);
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({ idToken: 'google-credential' });
    req.flush(tokens('access-g'));

    await result;
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('shares one refresh request between concurrent callers', async () => {
    const first = firstValueFrom(auth.refresh());
    const second = firstValueFrom(auth.refresh());
    await flushMicrotasks();

    const req = http.expectOne(`${AUTH}/refresh`);
    expect(req.request.withCredentials).toBe(true);
    req.flush(tokens('access-2'));

    expect((await first).accessToken).toBe('access-2');
    expect((await second).accessToken).toBe('access-2');
  });

  it('starts a new refresh once the previous one finished', async () => {
    const first = firstValueFrom(auth.refresh());
    await flushMicrotasks();
    http.expectOne(`${AUTH}/refresh`).flush(tokens('access-2'));
    await first;

    const second = firstValueFrom(auth.refresh());
    await flushMicrotasks();
    http.expectOne(`${AUTH}/refresh`).flush(tokens('access-3'));
    expect((await second).accessToken).toBe('access-3');
  });

  it('clears the session when the refresh token is rejected', async () => {
    await signIn();

    const result = firstValueFrom(auth.refresh()).catch((err) => err);
    await flushMicrotasks();
    http
      .expectOne(`${AUTH}/refresh`)
      .flush(
        { status: 401, message: 'Invalid or expired refresh token' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect((await result).status).toBe(401);
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('refreshes before handing out a token that is about to expire', async () => {
    await signIn(tokens('old', 10_000));

    const token = firstValueFrom(auth.validAccessToken());
    await flushMicrotasks();
    http.expectOne(`${AUTH}/refresh`).flush(tokens('fresh'));

    expect(await token).toBe('fresh');
  });

  it('restores the session at startup when the refresh cookie is valid', async () => {
    const restored = auth.restoreSession();
    await flushMicrotasks();
    http.expectOne(`${AUTH}/refresh`).flush(tokens('access-r'));

    expect(await restored).toBe(true);
    expect(auth.user()?.displayName).toBe('Me');
  });

  it('starts signed out when there is no valid refresh cookie', async () => {
    const restored = auth.restoreSession();
    await flushMicrotasks();
    http
      .expectOne(`${AUTH}/refresh`)
      .flush({ status: 401 }, { status: 401, statusText: 'Unauthorized' });

    expect(await restored).toBe(false);
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('signs out on the server and drops the session', async () => {
    await signIn();

    auth.logout();
    const req = http.expectOne(`${AUTH}/logout`);
    expect(req.request.withCredentials).toBe(true);
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(auth.isAuthenticated()).toBe(false);
  });

  async function signIn(session = tokens('access-1')): Promise<void> {
    const done = firstValueFrom(auth.login({ email: 'me@example.com', password: 'secret' }));
    http.expectOne(`${AUTH}/login`).flush(session);
    await done;
  }
});
