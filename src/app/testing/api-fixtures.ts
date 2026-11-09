import { Account, AccountRole, AccountType } from '../models/account.model';
import { Category } from '../models/category.model';
import { PlannedTransaction } from '../models/planned-transaction.model';

const STAMP = '2026-11-09T14:32:58';

export function account(id: number, name: string, overrides: Partial<Account> = {}): Account {
  return {
    id,
    name,
    amount: 1000,
    type: 'CHECKING' as AccountType,
    main: false,
    paymentDueDay: null,
    closingDaysBeforeDue: null,
    statementBalance: null,
    monthlyTarget: null,
    ownerId: 1,
    ownerEmail: 'me@example.com',
    myRole: 'OWNER' as AccountRole,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  };
}

export function category(id: number, name: string): Category {
  return { id, name, createdAt: STAMP, updatedAt: STAMP };
}

export function planned(
  id: number,
  overrides: Partial<PlannedTransaction> = {},
): PlannedTransaction {
  return {
    id,
    name: 'Rent',
    amount: 1500,
    type: 'EXPENSE',
    frequency: {
      intervalUnit: 'MONTH',
      intervalCount: 1,
      dayOfWeek: null,
      dayOfMonth: 1,
      month: null,
      description: 'Monthly',
    },
    accountId: 1,
    targetAccountId: null,
    startDate: '2026-12-01',
    endDate: null,
    category: null,
    oneTime: false,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  };
}

export const validationError = (fields: { field: string; message: string }[]) => ({
  timestamp: STAMP,
  status: 400,
  error: 'Bad Request',
  message: 'Validation failed',
  path: '/api/v1/x',
  fields,
});
