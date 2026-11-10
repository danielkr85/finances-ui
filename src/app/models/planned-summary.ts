import { Frequency } from './frequency.model';
import { PlannedTransaction } from './planned-transaction.model';

/** Average month length in days and weeks, so daily and weekly schedules spread evenly across the year. */
const DAYS_PER_MONTH = 365.25 / 12;
const WEEKS_PER_MONTH = DAYS_PER_MONTH / 7;

/** How many times a schedule fires in an average month: weekly ≈ 4.35, quarterly ≈ 0.33, yearly ≈ 0.083. */
export function occurrencesPerMonth(f: Frequency): number {
  const count = f.intervalCount || 1;
  switch (f.intervalUnit) {
    case 'DAY':
      return DAYS_PER_MONTH / count;
    case 'WEEK':
      return WEEKS_PER_MONTH / count;
    case 'MONTH':
      return 1 / count;
    case 'YEAR':
      return 1 / (12 * count);
  }
}

export interface PlannedSummary {
  income: number;
  expenses: number;
  /** Only set when looking at one account: transfers into and out of it. */
  transfersIn: number;
  transfersOut: number;
  /** Across all accounts, transfers only move money between them; this is how much moves per month. */
  transfersMoved: number;
  /** income − expenses, plus transfers in − out when looking at one account. */
  net: number;
  /** Recurring transactions that went into the averages. */
  recurringCount: number;
}

/**
 * Monthly averages of the recurring transactions that haven't ended. One-time transactions are left out: spreading
 * a one-off over a month would make it look like a regular cost.
 *
 * `accountId` decides how transfers count: for one account they're money in or out, for all accounts they cancel
 * out and only the amount moved is reported.
 */
export function summarizePlanned(
  transactions: PlannedTransaction[],
  accountId: number | null,
  today: string,
): PlannedSummary {
  let income = 0;
  let expenses = 0;
  let transfersIn = 0;
  let transfersOut = 0;
  let transfersMoved = 0;
  let recurringCount = 0;

  for (const t of transactions) {
    if (!t.frequency || (t.endDate !== null && t.endDate < today)) {
      continue;
    }
    recurringCount++;
    const monthly = t.amount * occurrencesPerMonth(t.frequency);
    if (t.type === 'INCOME') {
      income += monthly;
    } else if (t.type === 'EXPENSE') {
      expenses += monthly;
    } else if (accountId === null) {
      transfersMoved += monthly;
    } else if (t.targetAccountId === accountId) {
      transfersIn += monthly;
    } else if (t.accountId === accountId) {
      transfersOut += monthly;
    }
  }

  // Round each figure once at the end (money is whole dollars), and derive net from the rounded parts so the
  // cards add up on screen.
  const r = Math.round;
  const summary = {
    income: r(income),
    expenses: r(expenses),
    transfersIn: r(transfersIn),
    transfersOut: r(transfersOut),
    transfersMoved: r(transfersMoved),
  };
  return {
    ...summary,
    net: summary.income - summary.expenses + summary.transfersIn - summary.transfersOut,
    recurringCount,
  };
}
