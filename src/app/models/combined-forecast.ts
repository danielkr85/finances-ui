import { Account } from './account.model';
import { FinancialEvent, Forecast, Projection, signedAmount } from './forecast.model';

/**
 * The `accountId` of a combined forecast and its events. No real account has id 0, so the forecast page's "this
 * account's events" filter keeps exactly the combined events.
 */
export const COMBINED_ACCOUNT_ID = 0;

/** An event restated as its effect on the combined total; `sourceAccountId` is the account it happens on. */
export interface CombinedEvent extends FinancialEvent {
  sourceAccountId: number;
}

export function isCombinedEvent(event: FinancialEvent): event is CombinedEvent {
  return 'sourceAccountId' in event;
}

/**
 * Adds several accounts' forecasts into one net figure: cash in bank accounts minus what's owed on credit cards.
 * There's no server endpoint for this, so it's built from the per-account forecasts (same `from`/`to`).
 *
 * - Each event becomes its effect on the net: spending on a card lowers the net just like spending from checking.
 * - A transfer between two included accounts changes nothing in total, so both sides are dropped. A transfer to an
 *   account that isn't included keeps its one side, because that money does leave (or enter) the total.
 */
export function combineForecasts(parts: { account: Account; forecast: Forecast }[]): Forecast {
  const sign = (account: Account) => (account.type === 'CREDIT_CARD' ? -1 : 1);
  const first = parts[0]?.forecast;

  const byDate = new Map<string, CombinedEvent[]>();
  for (const { account, forecast } of parts) {
    for (const projection of forecast.projections) {
      // Each forecast also lists the other side of its transfers; take only this account's own side.
      for (const event of projection.events.filter((e) => e.accountId === account.id)) {
        const net = sign(account) * signedAmount(event);
        const combined: CombinedEvent = {
          ...event,
          accountId: COMBINED_ACCOUNT_ID,
          sourceAccountId: account.id,
          direction: net >= 0 ? 'CREDIT' : 'DEBIT',
          amount: Math.abs(net),
        };
        byDate.set(projection.date, [...(byDate.get(projection.date) ?? []), combined]);
      }
    }
  }

  const openingBalance = parts.reduce(
    (sum, p) => sum + sign(p.account) * p.forecast.openingBalance,
    0,
  );
  let balance = openingBalance;
  const projections: Projection[] = [];
  for (const date of [...byDate.keys()].sort()) {
    const events = withoutInternalTransfers(byDate.get(date)!);
    if (events.length === 0) {
      continue;
    }
    const amountChange = events.reduce((sum, e) => sum + signedAmount(e), 0);
    balance += amountChange;
    projections.push({ date, amountChange, resultingBalance: balance, events });
  }

  return {
    accountId: COMBINED_ACCOUNT_ID,
    from: first?.from ?? '',
    to: first?.to ?? '',
    openingBalance,
    projections,
    finalBalance: balance,
  };
}

/** Both sides of the same transfer on the same day means it moved money between included accounts. */
function withoutInternalTransfers(events: CombinedEvent[]): CombinedEvent[] {
  const sides = new Map<number, number>();
  for (const e of events) {
    if (e.eventType === 'TRANSFER') {
      sides.set(e.plannedTransactionId, (sides.get(e.plannedTransactionId) ?? 0) + 1);
    }
  }
  return events.filter(
    (e) => e.eventType !== 'TRANSFER' || sides.get(e.plannedTransactionId) !== 2,
  );
}
