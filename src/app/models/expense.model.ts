export interface Frequency {
    intervalType: string;
    intervalCount: number;
    dayOfWeek?: string;
    dayOfMonth?: number;
    customExpression?: string;
}

export interface Category {
    id: number;
    name: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Expense {
    id?: number;
    name: string;
    amount: number;
    frequency: Frequency;
    category?: Category;
    createdAt?: string;
    updatedAt?: string;
}