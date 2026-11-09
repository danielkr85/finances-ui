import { Frequency, FrequencyRequest } from './frequency.model';
import { Category } from './category.model';
import { Account } from './account.model';

export type RecurringRuleType = 'INCOME' | 'EXPENSE';

export interface RecurringRule {
  id: number | string;
  name: string;
  defaultAmount: number;
  type: RecurringRuleType;
  frequency: Frequency;
  accountId: number;
  categoryId: number;
  startDate: string;
  endDate: string | null;
  createdAt?: string;
  updatedAt?: string;
  account?: Account;
  category?: Category;
}

export interface RecurringRuleRequest {
  name: string;
  defaultAmount: number;
  type: RecurringRuleType;
  frequency: FrequencyRequest;
  accountId: number;
  categoryId: number;
  startDate: string;
  endDate?: string | null;
}
