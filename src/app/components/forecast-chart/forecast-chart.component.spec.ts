import { TestBed } from '@angular/core/testing';
import { Forecast, forecastExtreme } from '../../models/forecast.model';
import { daysBetween } from '../../shared/dates';
import { ForecastChartComponent } from './forecast-chart.component';
import { axisMoney, dailyBalances } from './forecast-series';

const event = (
  accountId: number,
  description: string,
  amount: number,
  direction: 'DEBIT' | 'CREDIT',
) => ({
  description,
  amount,
  eventDate: '',
  eventType: 'EXPENSE' as const,
  direction,
  accountId,
  category: null,
  plannedTransactionId: 1,
});

const FORECAST: Forecast = {
  accountId: 1,
  from: '2026-03-07',
  to: '2026-03-12',
  openingBalance: 1000,
  projections: [
    {
      date: '2026-03-08',
      amountChange: -500,
      resultingBalance: 500,
      events: [event(1, 'Card payment', 500, 'DEBIT'), event(2, 'Card payment', 500, 'DEBIT')],
    },
    {
      date: '2026-03-10',
      amountChange: 2000,
      resultingBalance: 2500,
      events: [event(1, 'Paycheck', 2000, 'CREDIT')],
    },
  ],
  finalBalance: 2500,
};

describe('dailyBalances', () => {
  it('has one point per day and holds the balance between events', () => {
    const points = dailyBalances(FORECAST);
    expect(points.map((p) => p.date)).toEqual([
      '2026-03-07',
      '2026-03-08',
      '2026-03-09',
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
    ]);
    expect(points.map((p) => p.y)).toEqual([1000, 500, 500, 2500, 2500, 2500]);
    expect(points.map((p) => p.x)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("keeps only this account's side of a transfer", () => {
    const points = dailyBalances(FORECAST);
    expect(points[1].events.map((e) => e.accountId)).toEqual([1]);
    expect(points[2].events).toEqual([]);
  });

  it('applies an event on the first day', () => {
    const points = dailyBalances({
      ...FORECAST,
      projections: [{ date: '2026-03-07', amountChange: 50, resultingBalance: 1050, events: [] }],
    });
    expect(points[0].y).toBe(1050);
  });
});

describe('daysBetween', () => {
  it('counts calendar days across a daylight-saving change', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2); // US clocks change on Mar 8, 2026
    expect(daysBetween('2026-11-09', '2026-11-09')).toBe(0);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });
});

describe('axisMoney', () => {
  it('writes ticks in full below $10,000 and compact from there', () => {
    expect(axisMoney(2500, 5000)).toBe('$2,500');
    expect(axisMoney(-500, 5000)).toBe('-$500');
    expect(axisMoney(12500, 20000)).toBe('$12.5K');
  });
});

describe('ForecastChartComponent', () => {
  it('describes the forecast for screen readers and renders without a canvas', async () => {
    // jsdom has no canvas: the chart must skip drawing instead of throwing.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    TestBed.configureTestingModule({ imports: [ForecastChartComponent] });
    const fixture = TestBed.createComponent(ForecastChartComponent);
    fixture.componentRef.setInput('forecast', FORECAST);
    fixture.componentRef.setInput('accountName', 'Checking');
    await fixture.whenStable();

    const canvas = (fixture.nativeElement as HTMLElement).querySelector('canvas');
    expect(canvas?.getAttribute('role')).toBe('img');
    expect(canvas?.getAttribute('aria-label')).toBe(
      'Balance forecast for Checking, Mar 7 to Mar 12: starts at $1,000, ends at $2,500, lowest $500 on Mar 8.',
    );
  });

  it('marks the most owed for a credit card', () => {
    expect(forecastExtreme(FORECAST, true)).toEqual({ balance: 2500, date: '2026-03-10' });
    expect(forecastExtreme(FORECAST, false)).toEqual({ balance: 500, date: '2026-03-08' });
  });
});
