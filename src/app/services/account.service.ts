import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AccountRequest, AccountResponse } from '../models/account.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private baseUrl = `${environment.apiUrl}/accounts`;

  constructor(private http: HttpClient) { }

  getAllAccounts(): Observable<AccountResponse[]> {
    return this.http.get<AccountResponse[]>(this.baseUrl);
  }

  getAccountById(id: number | string): Observable<AccountResponse> {
    return this.http.get<AccountResponse>(`${this.baseUrl}/${id}`);
  }

  createAccount(account: AccountRequest): Observable<AccountResponse> {
    return this.http.post<AccountResponse>(this.baseUrl, account);
  }

  updateAccount(id: number, account: AccountRequest): Observable<AccountResponse> {
    return this.http.put<AccountResponse>(`${this.baseUrl}/${id}`, account);
  }

  deleteAccount(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
