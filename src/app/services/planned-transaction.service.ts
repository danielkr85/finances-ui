import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PlannedTransaction, PlannedTransactionRequest } from '../models/planned-transaction.model';

@Injectable({ providedIn: 'root' })
export class PlannedTransactionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/planned-transactions`;

  /** On every account you can see, or only those whose source is `accountId`. */
  getPlannedTransactions(accountId?: number): Observable<PlannedTransaction[]> {
    const params = accountId === undefined ? undefined : new HttpParams().set('accountId', accountId);
    return this.http.get<PlannedTransaction[]>(this.baseUrl, { params });
  }

  getPlannedTransactionById(id: number): Observable<PlannedTransaction> {
    return this.http.get<PlannedTransaction>(`${this.baseUrl}/${id}`);
  }

  /** EDITOR on accountId (and on targetAccountId for transfers). */
  createPlannedTransaction(request: PlannedTransactionRequest): Observable<PlannedTransaction> {
    return this.http.post<PlannedTransaction>(this.baseUrl, request);
  }

  updatePlannedTransaction(id: number, request: PlannedTransactionRequest): Observable<PlannedTransaction> {
    return this.http.put<PlannedTransaction>(`${this.baseUrl}/${id}`, request);
  }

  deletePlannedTransaction(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
