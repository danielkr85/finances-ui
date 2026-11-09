import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RecurringRule, RecurringRuleRequest } from '../models/recurring-rule.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RecurringRuleService {
  private apiUrl = `${environment.apiUrl}/recurringRules`;

  constructor(private http: HttpClient) { }

  getAllRecurringRules(): Observable<RecurringRule[]> {
    return this.http.get<RecurringRule[]>(this.apiUrl);
  }

  getRecurringRuleById(id: number | string): Observable<RecurringRule> {
    return this.http.get<RecurringRule>(`${this.apiUrl}/${id}`);
  }

  createRecurringRule(rule: RecurringRuleRequest): Observable<RecurringRule> {
    return this.http.post<RecurringRule>(this.apiUrl, rule);
  }

  updateRecurringRule(id: number | string, rule: RecurringRuleRequest): Observable<RecurringRule> {
    return this.http.put<RecurringRule>(`${this.apiUrl}/${id}`, rule);
  }

  deleteRecurringRule(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
