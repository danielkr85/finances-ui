import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Forecast } from '../../models/forecast.model';
import { addDaysIso, todayIso } from '../../shared/dates';
import { account } from '../../testing/api-fixtures';
import { ForecastComponent } from './forecast.component';

const API = environment.apiUrl;

describe('ForecastComponent', () => {
  let http: HttpTestingController;
  const today = todayIso();

  function setup(query: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [ForecastComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(query) } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ForecastComponent);
    fixture.detectChanges();
    http
      .expectOne(`${API}/accounts`)
      .flush([account(1, 'Checking', { main: true }), account(2, 'Amex', { type: 'CREDIT_CARD' })]);
    return { c: fixture.componentInstance, navigate };
  }

  afterEach(() => http.verify());

  it('defaults to the main account for the next 90 days and records it in the URL', () => {
    const { navigate } = setup();
    const to = addDaysIso(today, 90);
    http.expectOne(`${API}/forecasts?accountId=1&from=${today}&to=${to}`).flush(forecast(1, []));
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { accountId: 1, from: today, to },
        replaceUrl: true,
      }),
    );
  });

  it('reads account and dates from the URL', () => {
    const to = addDaysIso(today, 10);
    setup({ accountId: '2', from: today, to });
    http.expectOne(`${API}/forecasts?accountId=2&from=${today}&to=${to}`).flush(forecast(2, []));
  });

  it("shows only this account's side of a transfer, and the lowest balance", () => {
    const { c } = setup();
    http
      .expectOne((r) => r.url === `${API}/forecasts`)
      .flush(
        forecast(1, [
          {
            date: '2030-01-01',
            amountChange: -500,
            resultingBalance: 500,
            events: [
              event(1, 'Card payment', 500, 'DEBIT', 'TRANSFER'),
              event(2, 'Card payment', 500, 'DEBIT', 'TRANSFER'),
            ],
          },
          {
            date: '2030-01-05',
            amountChange: 2000,
            resultingBalance: 2500,
            events: [event(1, 'Paycheck', 2000, 'CREDIT', 'INCOME')],
          },
        ]),
      );

    expect(c.rows()[0].events.map((e) => e.accountId)).toEqual([1]);
    expect(c.extreme()).toEqual({ balance: 500, date: '2030-01-01' });
  });

  it('tracks the most owed for a credit card', () => {
    const { c } = setup({ accountId: '2' });
    http
      .expectOne((r) => r.url === `${API}/forecasts`)
      .flush(
        forecast(2, [
          { date: '2030-01-01', amountChange: 300, resultingBalance: 1300, events: [] },
          { date: '2030-01-13', amountChange: -1300, resultingBalance: 0, events: [] },
        ]),
      );
    expect(c.isCreditCard()).toBe(true);
    expect(c.extreme()).toEqual({ balance: 1300, date: '2030-01-01' });
  });

  it("doesn't ask the server for a range in the past", () => {
    const { c } = setup();
    http.expectOne((r) => r.url === `${API}/forecasts`).flush(forecast(1, []));
    c.setFrom(addDaysIso(today, -1));
    http.expectNone((r) => r.url === `${API}/forecasts`);
    expect(c.error()).toContain('from today');
  });

  function forecast(accountId: number, projections: Forecast['projections']): Forecast {
    return {
      accountId,
      from: today,
      to: addDaysIso(today, 90),
      openingBalance: 1000,
      projections,
      finalBalance: 1000,
    };
  }

  function event(
    accountId: number,
    description: string,
    amount: number,
    direction: 'DEBIT' | 'CREDIT',
    eventType: 'INCOME' | 'EXPENSE' | 'TRANSFER',
  ) {
    return {
      description,
      amount,
      eventDate: '2030-01-01',
      eventType,
      direction,
      accountId,
      category: null,
      plannedTransactionId: 1,
    };
  }
});
