import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Income, IncomeRequest } from '../models/income.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class IncomeService {
    private apiUrl = `${environment.apiUrl}/incomes`;

    constructor(private http: HttpClient) { }

    getAllIncomes(): Observable<Income[]> {
        return this.http.get<Income[]>(this.apiUrl);
    }

    getIncomeById(id: number | string): Observable<Income> {
        return this.http.get<Income>(`${this.apiUrl}/${id}`);
    }

    createIncome(income: IncomeRequest): Observable<Income> {
        return this.http.post<Income>(this.apiUrl, income);
    }

    updateIncome(id: number | string, income: IncomeRequest): Observable<Income> {
        return this.http.put<Income>(`${this.apiUrl}/${id}`, income);
    }

    deleteIncome(id: number | string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
