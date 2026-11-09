import { FinancialEvent } from './forecast.model';

/** "How much can I still spend on this card this billing cycle?" */
export interface CycleBudget {
  accountId: number;
  /** First day of the current cycle (inclusive). */
  cycleStart: string;
  /** Statement closing date of the current cycle (inclusive). */
  cycleClose: string;
  paymentDueDate: string;
  /** From today to cycleClose, counting both ends. */
  daysLeftInCycle: number;
  monthlyTarget: number;
  statementBalance: number;
  /** amount − statementBalance: charges already on the card this cycle. */
  spentThisCycle: number;
  /** Planned expenses minus planned refunds from today through cycleClose. */
  plannedRemaining: number;
  /** monthlyTarget − spentThisCycle − plannedRemaining; negative means over budget. */
  remaining: number;
  plannedEvents: FinancialEvent[];
}
