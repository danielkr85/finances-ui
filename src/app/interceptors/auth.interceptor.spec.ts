import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { flushMicrotasks, tokens } from '../testing/auth-fixtures';
import { authInterceptor } from './auth.interceptor';

const API = environment.apiUrl;
const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' };

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  it('adds the bearer token to API calls', async () => {
    await signIn('access-1');

    const result = firstValueFrom(client.get(`${API}/accounts`));
    await flushMicrotasks();
    const req = http.expectOne(`${API}/accounts`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-1');
    expect(req.request.withCredentials).toBe(false);
    req.flush([]);
    await result;
  });

  it('leaves other hosts alone', async () => {
    await signIn('access-1');

    const result = firstValueFrom(client.get('https://example.com/data'));
    const req = http.expectOne('https://example.com/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
    await result;
  });

  it('sends auth calls with credentials and without a bearer token', async () => {
    await signIn('access-1');

    const result = firstValueFrom(client.post(`${API}/auth/logout`, null));
    const req = http.expectOne(`${API}/auth/logout`);
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(null);
    await result;
  });

  it('refreshes once and retries a call that got a 401', async () => {
    await signIn('stale');

    const result = firstValueFrom(client.get<string[]>(`${API}/categories`));
    await flushMicrotasks();
    http.expectOne(`${API}/categories`).flush({ status: 401 }, UNAUTHORIZED);
    await flushMicrotasks();
    http.expectOne(`${API}/auth/refresh`).flush(tokens('fresh'));
    await flushMicrotasks();

    const retry = http.expectOne(`${API}/categories`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer fresh');
    retry.flush(['Food']);
    expect(await result).toEqual(['Food']);
  });

  it('sends the user to the login page when the refresh is rejected', async () => {
    await signIn('stale');

    const result = firstValueFrom(client.get(`${API}/accounts`)).catch((err) => err);
    await flushMicrotasks();
    http.expectOne(`${API}/accounts`).flush({ status: 401 }, UNAUTHORIZED);
    await flushMicrotasks();
    http.expectOne(`${API}/auth/refresh`).flush({ status: 401 }, UNAUTHORIZED);

    expect((await result).status).toBe(401);
    expect(auth.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], expect.anything());
  });

  it('does not retry other errors', async () => {
    await signIn('access-1');

    const result = firstValueFrom(client.get(`${API}/accounts/7`)).catch((err) => err);
    await flushMicrotasks();
    http
      .expectOne(`${API}/accounts/7`)
      .flush(
        { status: 404, message: 'Account not found' },
        { status: 404, statusText: 'Not Found' },
      );

    expect((await result).status).toBe(404);
    expect(auth.isAuthenticated()).toBe(true);
  });

  async function signIn(accessToken: string): Promise<void> {
    const done = firstValueFrom(auth.login({ email: 'me@example.com', password: 'secret' }));
    http.expectOne(`${API}/auth/login`).flush(tokens(accessToken));
    await done;
  }
});
