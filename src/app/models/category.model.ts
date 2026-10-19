export interface Category {
    id: number;
    name: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface CategoryRequest {
    name: string;
}


export const DEFAULT_CATEGORIES: Category[] = [
    { id: 1, name: 'Food' },
    { id: 2, name: 'Utilities' },
    { id: 3, name: 'Housing' },
    { id: 4, name: 'Transportation' },
    { id: 5, name: 'Entertainment' },
    { id: 6, name: 'Healthcare' },
    { id: 7, name: 'Personal' },
    { id: 8, name: 'Other' }
];
