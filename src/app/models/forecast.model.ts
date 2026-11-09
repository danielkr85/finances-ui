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
