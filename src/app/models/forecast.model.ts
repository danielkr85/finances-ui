import { Category } from './category.model';
import { EventType } from './planned-transaction.model';

/** Effect on the event's own account: DEBIT lowers its balance, CREDIT raises it (for a card: debt goes up). */
export type Direction = 'DEBIT' | 'CREDIT';

/**
 * A projected occurrence of a planned transaction (read-only, computed by the server). A transfer produces two
 * events, one per account; `accountId` says which.
 */
export interface FinancialEvent {
  description: string;
  amount: number;
  /** yyyy-MM-dd */
  eventDate: string;
  eventType: EventType;
  direction: Direction;
  accountId: number;
  category: Category | null;
  plannedTransactionId: number;
  /**
   * Set when the server sized `amount` from a credit card's statement instead of the planned amount: the next two
   * payments from checking into a card with billing details. Null when the planned amount was used.
   */
  amountBasis: AmountBasis | null;
}

export type AmountBasis = 'LAST_STATEMENT' | 'PROJECTED_STATEMENT' | 'MONTHLY_TARGET';

const AMOUNT_BASIS_LABELS: Record<AmountBasis, string> = {
  LAST_STATEMENT: 'Last statement',
  PROJECTED_STATEMENT: 'Projected statement',
  MONTHLY_TARGET: 'Monthly target',
};

/** "Last statement" etc., or null for an event that uses its planned amount. */
export function amountBasisLabel(event: FinancialEvent): string | null {
  return event.amountBasis ? AMOUNT_BASIS_LABELS[event.amountBasis] : null;
}

export interface Projection {
  date: string;
  /** Net effect on the forecasted account on this date. */
  amountChange: number;
  resultingBalance: number;
  events: FinancialEvent[];
}

export interface Forecast {
  accountId: number;
  from: string;
  to: string;
  /** Today's balance plus everything planned between today and `from`. */
  openingBalance: number;
  /** Only dates with events, in order. */
  projections: Projection[];
  finalBalance: number;
}

/**
 * The forecast's low point for a bank account, or its peak for a credit card (where the balance is what's owed).
 * Ties keep the earliest date; the opening balance on `from` counts.
 */
export function forecastExtreme(
  forecast: Forecast,
  isCreditCard: boolean,
): { balance: number; date: string } {
  let best = { balance: forecast.openingBalance, date: forecast.from };
  for (const p of forecast.projections) {
    if (isCreditCard ? p.resultingBalance > best.balance : p.resultingBalance < best.balance) {
      best = { balance: p.resultingBalance, date: p.date };
    }
  }
  return best;
}

/** Signed effect of an event on its own account: CREDIT raises the balance (for a card: what's owed). */
export function signedAmount(event: FinancialEvent): number {
  return event.direction === 'CREDIT' ? event.amount : -event.amount;
}
