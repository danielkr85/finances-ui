import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Expense, ExpenseRequest } from '../models/expense.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ExpenseService {
    private apiUrl = `${environment.apiUrl}/expenses`;

    constructor(private http: HttpClient) { }

    getAllExpenses(categoryIds?: (number | string)[]): Observable<Expense[]> {
        let params = new HttpParams();
        if (categoryIds && categoryIds.length > 0) {
            categoryIds.forEach(id => {
                params = params.append('categoryId', id.toString());
            });
        }
        return this.http.get<Expense[]>(this.apiUrl, { params });
    }


    getExpenseById(id: number | string): Observable<Expense> {
        return this.http.get<Expense>(`${this.apiUrl}/${id}`);
    }

    createExpense(expense: ExpenseRequest): Observable<Expense> {
        return this.http.post<Expense>(this.apiUrl, expense);
    }

    updateExpense(id: number | string, expense: ExpenseRequest): Observable<Expense> {
        return this.http.put<Expense>(`${this.apiUrl}/${id}`, expense);
    }

    deleteExpense(id: number | string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}