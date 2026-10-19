export type IntervalUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

export interface Frequency {
    id?: number;
    intervalUnit: IntervalUnit;
    intervalCount: number;
    dayOfWeek?: string;
    dayOfMonth?: number;
    month?: string;
    customExpression?: string;
    description?: string;
    intervalType?: string;
}

export interface Category {
    id: number;
    name: string;
    createdAt?: string;
    updatedAt?: string;
}

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
