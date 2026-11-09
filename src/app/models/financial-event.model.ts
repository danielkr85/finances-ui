import { Account } from './account.model';
import { Category } from './category.model';
import { RecurringRule } from './recurring-rule.model';

export type FinancialEventStatus = 'PLANNED' | 'POSTED' | 'CLEARED';

export interface FinancialEvent {
  id: number | string;
  description: string;
  amount: number;
  eventDate: string;
  status: FinancialEventStatus;
  accountId: number;
  categoryId: number;
  recurringRuleId: number | null;
  account?: Account;
  category?: Category;
  recurringRule?: RecurringRule;
}

export interface FinancialEventRequest {
  description: string;
  amount: number;
  eventDate: string;
  status: FinancialEventStatus;
  accountId: number;
  categoryId: number;
  recurringRuleId?: number | null;
}
