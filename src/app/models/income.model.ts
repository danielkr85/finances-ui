import { Frequency } from './frequency.model';
import { Category } from './category.model';
import { Account } from './account.model';

export interface Income {
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

export interface IncomeRequest {
    name: string;
    amount: number;
    frequency: Frequency;
    categoryId?: number;
    category?: Category;
    accountId: number;
    startDate: string;
    endDate?: string | null;
}
