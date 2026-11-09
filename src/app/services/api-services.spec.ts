import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AccountShareService } from './account-share.service';
import { AccountService } from './account.service';
import { CategoryService } from './category.service';
import { ForecastService } from './forecast.service';
import { PlannedTransactionService } from './planned-transaction.service';
import { AdminUserService, UserService } from './user.service';

const API = environment.apiUrl;

/** Each service method must hit the endpoint the finances-service controllers define. */
describe('API services', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function expectCall(call: Observable<unknown>, method: string, urlWithParams: string, body?: unknown) {
    const done = firstValueFrom(call);
    const req = http.expectOne(r => r.urlWithParams === urlWithParams);
    expect(req.request.method).toBe(method);
    if (body !== undefined) {
      expect(req.request.body).toEqual(body);
    }
    req.flush(method === 'DELETE' ? null : {});
    await done;
  }

  it('accounts', async () => {
    const s = TestBed.inject(AccountService);
    const body = { name: 'Amex', amount: -20, type: 'CREDIT_CARD' as const, main: false, paymentDueDay: 13 };
    await expectCall(s.getAllAccounts(), 'GET', `${API}/accounts`);
    await expectCall(s.getAccountById(2), 'GET', `${API}/accounts/2`);
    await expectCall(s.createAccount(body), 'POST', `${API}/accounts`, body);
    await expectCall(s.updateAccount(2, body), 'PUT', `${API}/accounts/2`, body);
    await expectCall(s.deleteAccount(2), 'DELETE', `${API}/accounts/2`);
  });

  it('shares concurrent account-list requests but never serves stale results', async () => {
    const s = TestBed.inject(AccountService);
    const a = firstValueFrom(s.getAllAccounts());
    const b = firstValueFrom(s.getAllAccounts());
    http.expectOne(`${API}/accounts`).flush([{ id: 1 }]);
    expect(await a).toEqual([{ id: 1 }]);
    expect(await b).toEqual([{ id: 1 }]);

    const later = firstValueFrom(s.getAllAccounts());
    http.expectOne(`${API}/accounts`).flush([{ id: 1 }, { id: 2 }]);
    expect(await later).toHaveLength(2);
  });

  it('account sharing', async () => {
    const s = TestBed.inject(AccountShareService);
    await expectCall(s.getMembers(2), 'GET', `${API}/accounts/2/shares`);
    await expectCall(s.addMember(2, { email: 'pat@example.com', role: 'VIEWER' }), 'POST',
      `${API}/accounts/2/shares`, { email: 'pat@example.com', role: 'VIEWER' });
    await expectCall(s.updateMemberRole(2, 5, 'EDITOR'), 'PUT', `${API}/accounts/2/shares/5`, { role: 'EDITOR' });
    await expectCall(s.removeMember(2, 5), 'DELETE', `${API}/accounts/2/shares/5`);
  });

  it('categories', async () => {
    const s = TestBed.inject(CategoryService);
    await expectCall(s.getCategories(), 'GET', `${API}/categories`);
    await expectCall(s.createCategory({ name: 'Food' }), 'POST', `${API}/categories`, { name: 'Food' });
    await expectCall(s.updateCategory(3, { name: 'Groceries' }), 'PUT', `${API}/categories/3`);
    await expectCall(s.deleteCategory(3), 'DELETE', `${API}/categories/3`);
  });

  it('planned transactions', async () => {
    const s = TestBed.inject(PlannedTransactionService);
    const body = {
      name: 'Rent', amount: 1500, type: 'EXPENSE' as const, frequency: { intervalUnit: 'MONTH' as const, dayOfMonth: 1 },
      accountId: 1, targetAccountId: null, startDate: '2026-12-01', endDate: null, categoryId: 3
    };
    await expectCall(s.getPlannedTransactions(), 'GET', `${API}/planned-transactions`);
    await expectCall(s.getPlannedTransactions(1), 'GET', `${API}/planned-transactions?accountId=1`);
    await expectCall(s.getPlannedTransactionById(4), 'GET', `${API}/planned-transactions/4`);
    await expectCall(s.createPlannedTransaction(body), 'POST', `${API}/planned-transactions`, body);
    await expectCall(s.updatePlannedTransaction(4, body), 'PUT', `${API}/planned-transactions/4`, body);
    await expectCall(s.deletePlannedTransaction(4), 'DELETE', `${API}/planned-transactions/4`);
  });

  it('forecasts and cycle budgets', async () => {
    const s = TestBed.inject(ForecastService);
    await expectCall(s.getForecast(1, '2026-11-09', '2026-12-31'), 'GET',
      `${API}/forecasts?accountId=1&from=2026-11-09&to=2026-12-31`);
    await expectCall(s.getCycleBudget(2), 'GET', `${API}/cycle-budgets?accountId=2`);
  });

  it('current user and admin users', async () => {
    const me = TestBed.inject(UserService);
    await expectCall(me.getCurrentUser(), 'GET', `${API}/users/me`);
    await expectCall(me.changePassword({ currentPassword: 'old', newPassword: 'a-new-password' }), 'PUT',
      `${API}/users/me/password`);

    const admin = TestBed.inject(AdminUserService);
    await expectCall(admin.getUsers(), 'GET', `${API}/admin/users`);
    await expectCall(admin.createUser({ email: 'pat@example.com', displayName: 'Pat', role: 'USER' }), 'POST',
      `${API}/admin/users`, { email: 'pat@example.com', displayName: 'Pat', role: 'USER' });
    await expectCall(admin.updateUser(5, { displayName: 'Pat', role: 'USER', enabled: false }), 'PUT',
      `${API}/admin/users/5`);
    await expectCall(admin.deleteUser(5), 'DELETE', `${API}/admin/users/5`);
  });
});
