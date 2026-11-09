import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AccountMember, AccountShareRequest, ShareRole } from '../models/account.model';

@Injectable({ providedIn: 'root' })
export class AccountShareService {
  private readonly http = inject(HttpClient);

  private url(accountId: number, userId?: number): string {
    const base = `${environment.apiUrl}/accounts/${accountId}/shares`;
    return userId === undefined ? base : `${base}/${userId}`;
  }

  /** VIEWER. The owner comes first, with role OWNER. */
  getMembers(accountId: number): Observable<AccountMember[]> {
    return this.http.get<AccountMember[]>(this.url(accountId));
  }

  /** OWNER. 404 if no user has that email, 409 if already a member. */
  addMember(accountId: number, request: AccountShareRequest): Observable<AccountMember> {
    return this.http.post<AccountMember>(this.url(accountId), request);
  }

  /** OWNER. */
  updateMemberRole(accountId: number, userId: number, role: ShareRole): Observable<AccountMember> {
    return this.http.put<AccountMember>(this.url(accountId, userId), { role });
  }

  /** OWNER, or the member themselves ("leave this account"). */
  removeMember(accountId: number, userId: number): Observable<void> {
    return this.http.delete<void>(this.url(accountId, userId));
  }
}
