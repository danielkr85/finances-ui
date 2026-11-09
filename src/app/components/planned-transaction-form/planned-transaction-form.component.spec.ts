import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { account, category, planned, validationError } from '../../testing/api-fixtures';
import { PlannedTransactionFormComponent } from './planned-transaction-form.component';

const API = environment.apiUrl;
const ACCOUNTS = [
  account(1, 'Checking', { main: true }),
  account(2, 'Amex', { type: 'CREDIT_CARD' }),
  account(3, 'Shared savings', { myRole: 'VIEWER', ownerId: 9, ownerEmail: 'pat@example.com' })
];

describe('PlannedTransactionFormComponent', () => {
  let http: HttpTestingController;

  function setup(params: Record<string, string> = {}, query: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [PlannedTransactionFormComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(params), queryParamMap: convertToParamMap(query) } } }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(PlannedTransactionFormComponent);
    fixture.detectChanges();
    http.expectOne(`${API}/accounts`).flush(ACCOUNTS);
    http.expectOne(`${API}/categories`).flush([category(3, 'Housing')]);
    return fixture.componentInstance;
  }

  afterEach(() => http.verify());

  it('only offers accounts you can edit, starting on the main one', () => {
    const c = setup();
    expect(c.editableAccounts().map(a => a.name)).toEqual(['Checking', 'Amex']);
    expect(c.form.controls.accountId.value).toBe(1);
  });

  it('starts on the account from ?accountId=', () => {
    const c = setup({}, { accountId: '2' });
    expect(c.form.controls.accountId.value).toBe(2);
  });

  it('sends a one-time expense without frequency or end date', () => {
    const c = setup();
    c.form.patchValue({ name: ' Concert ', amount: 120, recurring: false, startDate: '2026-12-20', endDate: '2027-01-01' });
    c.onSubmit();

    const req = http.expectOne(`${API}/planned-transactions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Concert', type: 'EXPENSE', amount: 120, frequency: null, accountId: 1, targetAccountId: null,
      startDate: '2026-12-20', endDate: null, categoryId: null
    });
  });

  it('sends a recurring transfer with exactly the frequency fields its unit takes', () => {
    const c = setup();
    c.form.patchValue({ name: 'Card payment', type: 'TRANSFER', amount: 500, startDate: '2026-12-13' });
    c.form.controls.targetAccountId.setValue(2);
    c.form.controls.frequency.patchValue({ intervalUnit: 'WEEK', intervalCount: 2, dayOfWeek: 'FRIDAY' });
    c.onSubmit();

    expect(http.expectOne(`${API}/planned-transactions`).request.body).toEqual({
      name: 'Card payment', type: 'TRANSFER', amount: 500,
      frequency: { intervalUnit: 'WEEK', intervalCount: 2, dayOfWeek: 'FRIDAY' },
      accountId: 1, targetAccountId: 2, startDate: '2026-12-13', endDate: null, categoryId: null
    });
  });

  it('requires a different target account for transfers', () => {
    const c = setup();
    c.form.patchValue({ name: 'Move', type: 'TRANSFER', amount: 5 });
    expect(c.form.controls.targetAccountId.hasError('required')).toBe(true);
    c.form.controls.targetAccountId.setValue(1);
    expect(c.form.hasError('sameAccount')).toBe(true);
    expect(c.targetAccounts().map(a => a.id)).toEqual([2]);
  });

  it('rejects an end date before the start', () => {
    const c = setup();
    c.form.patchValue({ name: 'Gym', amount: 40, startDate: '2026-12-01', endDate: '2026-11-01' });
    expect(c.form.hasError('endBeforeStart')).toBe(true);
    c.onSubmit();
    http.expectNone(`${API}/planned-transactions`);
  });

  it('loads a transaction for editing and keeps another member’s category as an option', () => {
    const c = setupEdit(planned(4, {
      type: 'INCOME', amount: 650, category: category(77, 'Dividends'),
      frequency: { intervalUnit: 'MONTH', intervalCount: 3, dayOfWeek: null, dayOfMonth: 20, month: 'MARCH', description: 'Quarterly' }
    }));
    expect(c.form.getRawValue()).toMatchObject({ type: 'INCOME', amount: 650, categoryId: 77, recurring: true });
    expect(c.form.controls.frequency.getRawValue()).toMatchObject({ intervalUnit: 'MONTH', intervalCount: 3, dayOfMonth: 20, month: 'MARCH' });
    expect(c.categoryOptions().map(o => o.name)).toEqual(['Housing', 'Dividends (shared)']);
    expect(c.needsAnchorMonth()).toBe(true);
    expect(c.readOnly()).toBe(false);

    c.onSubmit();
    const req = http.expectOne(`${API}/planned-transactions/4`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.frequency).toEqual({ intervalUnit: 'MONTH', intervalCount: 3, dayOfMonth: 20, month: 'MARCH' });
    expect(req.request.body.categoryId).toBe(77);
  });

  it('is read-only on an account where you are a viewer', () => {
    const c = setupEdit(planned(5, { accountId: 3, frequency: null, oneTime: true }));
    expect(c.readOnly()).toBe(true);
    expect(c.form.disabled).toBe(true);
    expect(c.form.controls.recurring.value).toBe(false);
  });

  it('puts server validation messages on the matching fields', () => {
    const c = setup();
    c.form.patchValue({ name: 'Rent', amount: 1500 });
    c.onSubmit();
    http.expectOne(`${API}/planned-transactions`).flush(
      validationError([
        { field: 'amount', message: 'Amount must be positive' },
        { field: 'frequency', message: 'MONTH (every 1) requires [DAY_OF_MONTH]' }
      ]),
      { status: 400, statusText: 'Bad Request' });

    expect(c.form.controls.amount.errors?.['server']).toBe('Amount must be positive');
    expect(c.form.get('frequency.intervalUnit')?.errors?.['server']).toContain('requires');
    expect(c.error()).toBe('Please fix the highlighted fields.');
    expect(c.saving()).toBe(false);
  });

  function setupEdit(t: ReturnType<typeof planned>) {
    TestBed.configureTestingModule({
      imports: [PlannedTransactionFormComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: String(t.id) }), queryParamMap: convertToParamMap({}) } } }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PlannedTransactionFormComponent);
    fixture.detectChanges();
    http.expectOne(`${API}/accounts`).flush(ACCOUNTS);
    http.expectOne(`${API}/categories`).flush([category(3, 'Housing')]);
    http.expectOne(`${API}/planned-transactions/${t.id}`).flush(t);
    return fixture.componentInstance;
  }
});
