export * from './frequency.model';
export * from './category.model';
export * from './account.model';

import { Frequency } from './frequency.model';
import { Category } from './category.model';
import { Account } from './account.model';

export interface Expense {
    id?: number | string;
    name: string;
    amount: number;
    frequency: Frequency;
    category?: Category;
    categoryId?: number;
    account?: Account;
    accountId?: number;
    startDate?: string;
    endDate?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface ExpenseRequest {
    name: string;
    amount: number;
    frequency: Frequency;
    categoryId?: number;
    category?: Category;
    accountId: number;
    startDate: string;
    endDate?: string | null;
}
