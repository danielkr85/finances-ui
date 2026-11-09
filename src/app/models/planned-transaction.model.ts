import { Category } from './category.model';
import { Frequency, FrequencyRequest } from './frequency.model';

export type EventType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface PlannedTransactionRequest {
  name: string;
  /** Whole dollars, > 0; the direction comes from `type`. */
  amount: number;
  type: EventType;
  /** null = one-time, on `startDate`. */
  frequency: FrequencyRequest | null;
  /** Where the money comes from (EXPENSE/TRANSFER) or goes to (INCOME). Requires EDITOR. */
  accountId: number;
  /** Required for TRANSFER (≠ accountId), null otherwise. A card payment is a TRANSFER from bank to card. */
  targetAccountId: number | null;
  /** yyyy-MM-dd */
  startDate: string;
  /** yyyy-MM-dd, ≥ startDate; last possible date of a recurring transaction. */
  endDate: string | null;
  /** One of your own categories; when editing someone else's transaction you may keep theirs. */
  categoryId: number | null;
}

export interface PlannedTransaction {
  id: number;
  name: string;
  amount: number;
  type: EventType;
  frequency: Frequency | null;
  accountId: number;
  targetAccountId: number | null;
  startDate: string;
  endDate: string | null;
  /** On shared accounts this may be another member's category (not in your /categories list). */
  category: Category | null;
  oneTime: boolean;
  createdAt: string;
  updatedAt: string;
}
