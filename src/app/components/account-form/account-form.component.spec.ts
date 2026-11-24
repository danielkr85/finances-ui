import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Account } from '../../models/account.model';
import { account } from '../../testing/api-fixtures';
import { AccountFormComponent } from './account-form.component';

const API = environment.apiUrl;

describe('AccountFormComponent', () => {
  let http: HttpTestingController;

  function setup(existing?: Account) {
    TestBed.configureTestingModule({
      imports: [AccountFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap(existing ? { id: String(existing.id) } : {}) },
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AccountFormComponent);
    fixture.detectChanges();
    if (existing) {
      http.expectOne(`${API}/accounts/${existing.id}`).flush(existing);
    }
    return fixture.componentInstance;
  }

  afterEach(() => http.verify());

  it('allows a negative balance and leaves out billing fields for non-cards', () => {
    const c = setup();
    c.form.patchValue({
      name: 'Overdrawn',
      amount: -40,
      type: 'CHECKING',
      paymentDueDay: 13,
      monthlyTarget: 500,
    });
    expect(c.form.valid).toBe(true);
    c.onSubmit();

    expect(http.expectOne(`${API}/accounts`).request.body).toEqual({
      name: 'Overdrawn',
      amount: -40,
      type: 'CHECKING',
      main: false,
      paymentDueDay: null,
      closingDaysBeforeDue: null,
      statementBalance: null,
      monthlyTarget: null,
    });
  });

  it('sends billing fields for credit cards', () => {
    const c = setup();
    c.form.patchValue({
      name: 'Amex',
      amount: 7472,
      type: 'CREDIT_CARD',
      paymentDueDay: 13,
      closingDaysBeforeDue: 25,
      statementBalance: 5472,
      monthlyTarget: 5000,
    });
    expect(c.isCreditCard()).toBe(true);
    c.onSubmit();

    expect(http.expectOne(`${API}/accounts`).request.body).toMatchObject({
      type: 'CREDIT_CARD',
      paymentDueDay: 13,
      closingDaysBeforeDue: 25,
      statementBalance: 5472,
      monthlyTarget: 5000,
    });
  });

  it('adds pending charges to the amount owed on a credit card', () => {
    const c = setup(account(7, 'Amex', { type: 'CREDIT_CARD', amount: 1000 }));
    expect(c.form.controls.pendingAmount.value).toBeNull();
    expect(c.totalWithPending()).toBeNull();
    c.form.patchValue({ amount: 900, pendingAmount: 250, statementBalance: 1100 });
    expect(c.totalWithPending()).toBe(1150);
    expect(c.form.valid).toBe(true); // the statement is checked against the total
    c.onSubmit();

    expect(http.expectOne(`${API}/accounts/7`).request.body).toEqual({
      name: 'Amex',
      amount: 1150,
      type: 'CREDIT_CARD',
      main: false,
      paymentDueDay: null,
      closingDaysBeforeDue: null,
      statementBalance: 1100,
      monthlyTarget: null,
    });
  });

  it('ignores pending charges after switching to another account type', () => {
    const c = setup();
    c.form.patchValue({ name: 'Cash', amount: 100, type: 'CREDIT_CARD', pendingAmount: 50 });
    c.form.patchValue({ type: 'CHECKING' });
    expect(c.totalWithPending()).toBeNull();
    c.onSubmit();

    const body = http.expectOne(`${API}/accounts`).request.body;
    expect(body.amount).toBe(100);
    expect(body).not.toHaveProperty('pendingAmount');
  });

  it('rejects negative or fractional pending charges', () => {
    const c = setup();
    c.form.patchValue({ name: 'Amex', amount: 100, type: 'CREDIT_CARD', pendingAmount: -5 });
    expect(c.form.controls.pendingAmount.hasError('min')).toBe(true);
    c.form.patchValue({ pendingAmount: 5.5 });
    expect(c.form.controls.pendingAmount.hasError('pattern')).toBe(true);
  });

  it("won't let the unpaid statement exceed what's owed", () => {
    const c = setup();
    c.form.patchValue({ name: 'Amex', amount: 100, type: 'CREDIT_CARD', statementBalance: 200 });
    expect(c.form.hasError('statementExceedsAmount')).toBe(true);
    c.onSubmit();
    http.expectNone(`${API}/accounts`);
  });

  it('rejects fractional dollars', () => {
    const c = setup();
    c.form.patchValue({ name: 'Cash', amount: 12.5 });
    expect(c.form.controls.amount.hasError('pattern')).toBe(true);
  });

  it('lets an editor change the balance but not the name, and still sends the name', () => {
    const c = setup(account(7, 'Joint', { myRole: 'EDITOR', ownerId: 9 }));
    expect(c.form.controls.name.disabled).toBe(true);
    c.form.patchValue({ amount: 2500 });
    c.onSubmit();

    const req = http.expectOne(`${API}/accounts/7`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toMatchObject({ name: 'Joint', amount: 2500 });
  });

  it('is read-only for viewers', () => {
    const c = setup(account(8, 'Parents', { myRole: 'VIEWER' }));
    expect(c.readOnly()).toBe(true);
    expect(c.form.disabled).toBe(true);
  });

  it('shows a duplicate-name conflict from the server', () => {
    const c = setup();
    c.form.patchValue({ name: 'Checking', amount: 0 });
    c.onSubmit();
    http.expectOne(`${API}/accounts`).flush(
      {
        status: 409,
        error: 'Conflict',
        message: "An account named 'Checking' already exists",
        path: '/api/v1/accounts',
      },
      { status: 409, statusText: 'Conflict' },
    );
    expect(c.error()).toBe("An account named 'Checking' already exists");
  });
});
