import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { hasCycleBudget } from '../models/account.model';
import { CycleBudget } from '../models/cycle-budget.model';
import { User } from '../models/user.model';
import { AuthService } from '../services/auth.service';
import { TEST_USER, tokens } from '../testing/auth-fixtures';
import { account, category } from '../testing/api-fixtures';
import { AccountSharesComponent } from './account-shares/account-shares.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { CategoryListComponent } from './category-list/category-list.component';
import { CycleBudgetCardComponent } from './cycle-budget-card/cycle-budget-card.component';
import { ProfileComponent } from './profile/profile.component';

const API = environment.apiUrl;
const CONFLICT = { status: 409, statusText: 'Conflict' };

let http: HttpTestingController;
let configured = false;
let navigate: ReturnType<typeof vi.spyOn>;

function configure(component: unknown) {
  TestBed.configureTestingModule({
    imports: [component as never],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  http = TestBed.inject(HttpTestingController);
  configured = true;
  navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
}

async function signInAs(user: User) {
  const done = firstValueFrom(
    TestBed.inject(AuthService).login({ email: user.email, password: 'x' }),
  );
  http.expectOne(`${API}/auth/login`).flush(tokens('t', 15 * 60_000, user));
  await done;
}

afterEach(() => {
  if (configured) {
    http.verify();
  }
  configured = false;
});

describe('hasCycleBudget', () => {
  const card = account(2, 'Amex', {
    type: 'CREDIT_CARD',
    amount: 1000,
    paymentDueDay: 13,
    closingDaysBeforeDue: 25,
    statementBalance: 400,
    monthlyTarget: 2000,
  });
  it('needs a credit card with all four billing fields and a statement within the balance', () => {
    expect(hasCycleBudget(card)).toBe(true);
    expect(hasCycleBudget({ ...card, monthlyTarget: null })).toBe(false);
    expect(hasCycleBudget({ ...card, statementBalance: 1200 })).toBe(false);
    expect(hasCycleBudget({ ...card, type: 'CHECKING' })).toBe(false);
  });
});

describe('CycleBudgetCardComponent', () => {
  function render(budget: Partial<CycleBudget> | 'error') {
    configure(CycleBudgetCardComponent);
    const fixture = TestBed.createComponent(CycleBudgetCardComponent);
    fixture.componentRef.setInput('account', account(2, 'Amex', { type: 'CREDIT_CARD' }));
    fixture.detectChanges();
    const req = http.expectOne(`${API}/cycle-budgets?accountId=2`);
    if (budget === 'error') {
      req.flush(
        { status: 400, message: 'Account 2 is missing billing settings' },
        { status: 400, statusText: 'Bad Request' },
      );
    } else {
      req.flush({
        accountId: 2,
        cycleStart: '2026-10-20',
        cycleClose: '2026-11-18',
        paymentDueDate: '2026-12-13',
        daysLeftInCycle: 10,
        monthlyTarget: 5000,
        statementBalance: 0,
        spentThisCycle: 2000,
        plannedRemaining: 900,
        remaining: 2100,
        plannedEvents: [],
        ...budget,
      });
    }
    fixture.detectChanges();
    return { c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  it('shows what is left and a per-day allowance', () => {
    const { c, el } = render({});
    expect(c.perDay()).toBe(210);
    expect(c.bar()).toEqual({ spent: 40, planned: 18 });
    expect(el.textContent).toContain('$2,100');
    expect(el.textContent).toContain('About $210 a day');
  });

  it('flags going over budget', () => {
    const { c, el } = render({ spentThisCycle: 4800, plannedRemaining: 600, remaining: -400 });
    expect(c.perDay()).toBe(0);
    expect(c.bar()).toEqual({ spent: 96, planned: 4 });
    expect(el.textContent).toContain('Over the $5,000 target');
  });

  it("shows the server's message when the budget can't be computed", () => {
    const { el } = render('error');
    expect(el.textContent).toContain('missing billing settings');
  });
});

describe('AccountSharesComponent', () => {
  const OWNER = { userId: 1, email: 'me@example.com', displayName: 'Me', role: 'OWNER' as const };
  const PAT = { userId: 5, email: 'pat@example.com', displayName: 'Pat', role: 'VIEWER' as const };

  async function render(myRole: 'OWNER' | 'EDITOR', me: User) {
    configure(AccountSharesComponent);
    await signInAs(me);
    const fixture = TestBed.createComponent(AccountSharesComponent);
    fixture.componentRef.setInput('account', account(2, 'Joint', { myRole }));
    fixture.detectChanges();
    http.expectOne(`${API}/accounts/2/shares`).flush([OWNER, PAT]);
    return fixture.componentInstance;
  }

  it('lets the owner share by email and shows "no such user" from the server', async () => {
    const c = await render('OWNER', TEST_USER);
    c.form.setValue({ email: 'nobody@example.com', role: 'EDITOR' });
    c.add();
    const req = http.expectOne(`${API}/accounts/2/shares`);
    expect(req.request.body).toEqual({ email: 'nobody@example.com', role: 'EDITOR' });
    req.flush(
      { status: 404, message: 'No user found with email nobody@example.com' },
      { status: 404, statusText: 'Not Found' },
    );
    expect(c.error()).toBe('No user found with email nobody@example.com');
  });

  it('lets a member leave and goes back to the account list', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const c = await render('EDITOR', {
      ...TEST_USER,
      id: 5,
      email: 'pat@example.com',
      displayName: 'Pat',
    });
    expect(c.isOwner()).toBe(false);
    c.remove(PAT);
    http
      .expectOne(`${API}/accounts/2/shares/5`)
      .flush(null, { status: 204, statusText: 'No Content' });
    expect(navigate).toHaveBeenCalledWith(['/accounts']);
  });
});

describe('ProfileComponent', () => {
  it('signs out everywhere after changing the password', async () => {
    configure(ProfileComponent);
    await signInAs(TEST_USER);
    const c = TestBed.createComponent(ProfileComponent).componentInstance;
    c.form.setValue({
      currentPassword: 'old',
      newPassword: 'a-long-new-password',
      confirmPassword: 'a-long-new-password',
    });
    c.changePassword();
    const req = http.expectOne(`${API}/users/me/password`);
    expect(req.request.body).toEqual({
      currentPassword: 'old',
      newPassword: 'a-long-new-password',
    });
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { reason: 'password-changed' },
    });
  });

  it('checks the confirmation and minimum length before calling the server', async () => {
    configure(ProfileComponent);
    await signInAs(TEST_USER);
    const c = TestBed.createComponent(ProfileComponent).componentInstance;
    c.form.setValue({ currentPassword: 'old', newPassword: 'short', confirmPassword: 'different' });
    c.changePassword();
    expect(c.form.controls.newPassword.hasError('minlength')).toBe(true);
    expect(c.form.hasError('mismatch')).toBe(true);
    http.expectNone(`${API}/users/me/password`);
  });
});

describe('AdminUsersComponent', () => {
  const ADMIN: User = { ...TEST_USER, id: 1, role: 'ADMIN', displayName: 'Admin' };
  const PAT: User = { ...TEST_USER, id: 5, email: 'pat@example.com', displayName: 'Pat' };

  async function render() {
    configure(AdminUsersComponent);
    await signInAs(ADMIN);
    const fixture = TestBed.createComponent(AdminUsersComponent);
    fixture.detectChanges();
    http.expectOne(`${API}/admin/users`).flush([PAT, ADMIN]);
    return fixture.componentInstance;
  }

  it('creates a Google-only user by leaving the password out', async () => {
    const c = await render();
    c.openCreate();
    c.form.patchValue({ email: 'sam@gmail.com', displayName: 'Sam' });
    c.save();
    expect(http.expectOne(`${API}/admin/users`).request.body).toEqual({
      email: 'sam@gmail.com',
      displayName: 'Sam',
      role: 'USER',
    });
  });

  it("won't let an admin demote or disable themselves", async () => {
    const c = await render();
    c.openEdit(ADMIN);
    expect(c.editingSelf()).toBe(true);
    expect(c.form.controls.role.disabled).toBe(true);
    expect(c.form.controls.enabled.disabled).toBe(true);
    c.form.patchValue({ displayName: 'Boss' });
    c.save();
    const req = http.expectOne(`${API}/admin/users/1`);
    expect(req.request.body).toEqual({ displayName: 'Boss', role: 'ADMIN', enabled: true });
    req.flush({ ...ADMIN, displayName: 'Boss' });
    expect(TestBed.inject(AuthService).user()?.displayName).toBe('Boss');
  });

  it('explains why a user who still owns data cannot be deleted', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const c = await render();
    c.remove(PAT);
    http.expectOne(`${API}/admin/users/5`).flush({ status: 409, message: 'conflict' }, CONFLICT);
    expect(c.error()).toContain('still owns accounts or categories');
  });
});

describe('CategoryListComponent', () => {
  it('explains that a category in use cannot be deleted', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    configure(CategoryListComponent);
    const fixture = TestBed.createComponent(CategoryListComponent);
    fixture.detectChanges();
    http.expectOne(`${API}/categories`).flush([category(3, 'Housing')]);
    const c = fixture.componentInstance;

    c.remove(c.categories()[0]);
    http.expectOne(`${API}/categories/3`).flush({ status: 409, message: 'in use' }, CONFLICT);
    expect(c.error()).toContain('used by planned transactions');
    expect(c.categories().length).toBe(1);
  });
});
