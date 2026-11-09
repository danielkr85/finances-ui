import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CycleBudget } from '../models/cycle-budget.model';
import { Forecast } from '../models/forecast.model';

/** Read-only projections computed by the server from planned transactions. */
@Injectable({ providedIn: 'root' })
export class ForecastService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Day-by-day balance projection for an account. Dates are yyyy-MM-dd; `from` must be today or later and
   * not after `to` (400 otherwise).
   */
  getForecast(accountId: number, from: string, to: string): Observable<Forecast> {
    const params = new HttpParams().set('accountId', accountId).set('from', from).set('to', to);
    return this.http.get<Forecast>(`${this.apiUrl}/forecasts`, { params });
  }

  /**
   * What's left to spend on a credit card this billing cycle. 400 unless the account is a CREDIT_CARD with all
   * four billing fields set.
   */
  getCycleBudget(accountId: number): Observable<CycleBudget> {
    const params = new HttpParams().set('accountId', accountId);
    return this.http.get<CycleBudget>(`${this.apiUrl}/cycle-budgets`, { params });
  }
}
