import { FinancialEvent, Forecast } from '../../models/forecast.model';
import { addDaysIso, daysBetween } from '../../shared/dates';

/** The balance at the end of one day of the forecast window. */
export interface DailyBalance {
  /** Days since `forecast.from` (0-based); the chart's x value. */
  x: number;
  /** Balance after that day's events; for a credit card, what's owed. */
  y: number;
  date: string;
  /** This account's events on that day (a transfer's other side is left out). */
  events: FinancialEvent[];
}

/**
 * One point per day from `from` to `to`. The API only lists dates with events, but the balance holds between them,
 * so every day gets the last known balance. Daily points let the hover snap to the exact date under the pointer.
 */
export function dailyBalances(forecast: Forecast): DailyBalance[] {
  const byDate = new Map(forecast.projections.map((p) => [p.date, p]));
  const days = Math.max(0, daysBetween(forecast.from, forecast.to));
  const points: DailyBalance[] = [];
  let balance = forecast.openingBalance;

  for (let x = 0; x <= days; x++) {
    const date = addDaysIso(forecast.from, x);
    const projection = byDate.get(date);
    if (projection) {
      balance = projection.resultingBalance;
    }
    points.push({
      x,
      y: balance,
      date,
      events: projection?.events.filter((e) => e.accountId === forecast.accountId) ?? [],
    });
  }
  return points;
}

const FULL = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const COMPACT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Axis ticks: in full while the axis stays under $10,000 ($2,500), compact once it reaches it ($12.5K). */
export function axisMoney(value: number, axisMaxAbs: number): string {
  return axisMaxAbs >= 10_000 ? COMPACT.format(value) : FULL.format(value);
}
