import { Frequency } from './frequency.model';
import { Category } from './category.model';

export interface Income {
    id?: number | string;
    name: string;
    amount: number;
    frequency: Frequency;
    category?: Category;
    createdAt?: string;
    updatedAt?: string;
}

export interface IncomeRequest {
    name: string;
    amount: number;
    frequency: Frequency;
    categoryId?: number;
    category?: Category;
}
