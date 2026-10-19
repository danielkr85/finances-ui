export * from './frequency.model';
export * from './category.model';

import { Frequency } from './frequency.model';
import { Category } from './category.model';

export interface Expense {
    id?: number | string;
    name: string;
    amount: number;
    frequency: Frequency;
    category?: Category;
    createdAt?: string;
    updatedAt?: string;
}

export interface ExpenseRequest {
    name: string;
    amount: number;
    frequency: Frequency;
    categoryId?: number;
    category?: Category;
}
