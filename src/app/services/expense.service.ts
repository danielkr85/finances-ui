import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Expense } from '../models/expense.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ExpenseService {
    private apiUrl = `${environment.apiUrl}/expenses`;

    constructor(private http: HttpClient) { }

    getAllExpenses(): Observable<Expense[]> {
        return this.http.get<Expense[]>(this.apiUrl);
    }

    deleteExpense(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`); 1
    }
}