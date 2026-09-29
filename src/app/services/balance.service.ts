import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BalanceRequest, BalanceResponse } from '../models/balance.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BalanceService {
  private baseUrl = `${environment.apiUrl}/balances`;

  constructor(private http: HttpClient) { }

  getAllBalances(): Observable<BalanceResponse[]> {
    return this.http.get<BalanceResponse[]>(this.baseUrl);
  }

  getBalanceById(id: number): Observable<BalanceResponse> {
    return this.http.get<BalanceResponse>(`${this.baseUrl}/${id}`);
  }

  createBalance(balance: BalanceRequest): Observable<BalanceResponse> {
    return this.http.post<BalanceResponse>(this.baseUrl, balance);
  }

  updateBalance(id: number, balance: BalanceRequest): Observable<BalanceResponse> {
    return this.http.put<BalanceResponse>(`${this.baseUrl}/${id}`, balance);
  }

  deleteBalance(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}