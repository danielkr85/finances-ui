import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize, Observable, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';
import { Account, AccountRequest } from '../models/account.model';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/accounts`;

  private inFlight: Observable<Account[]> | null = null;

  /**
   * Accounts you own plus accounts shared with you. Callers that ask at the same time (e.g. the dashboard's
   * widgets) share one request; nothing is cached once it completes, so later calls always get fresh data.
   */
  getAllAccounts(): Observable<Account[]> {
    this.inFlight ??= this.http.get<Account[]>(this.baseUrl).pipe(
      finalize(() => (this.inFlight = null)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    return this.inFlight;
  }

  getAccountById(id: number): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/${id}`);
  }

  /** You become the owner. */
  createAccount(account: AccountRequest): Observable<Account> {
    return this.http.post<Account>(this.baseUrl, account);
  }

  /** EDITOR; renaming requires OWNER. */
  updateAccount(id: number, account: AccountRequest): Observable<Account> {
    return this.http.put<Account>(`${this.baseUrl}/${id}`, account);
  }

  /** OWNER only. */
  deleteAccount(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
