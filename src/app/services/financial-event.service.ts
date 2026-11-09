import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FinancialEvent, FinancialEventRequest } from '../models/financial-event.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FinancialEventService {
  private apiUrl = `${environment.apiUrl}/financialEvents`;

  constructor(private http: HttpClient) { }

  getAllFinancialEvents(): Observable<FinancialEvent[]> {
    return this.http.get<FinancialEvent[]>(this.apiUrl);
  }

  getFinancialEventById(id: number | string): Observable<FinancialEvent> {
    return this.http.get<FinancialEvent>(`${this.apiUrl}/${id}`);
  }

  createFinancialEvent(event: FinancialEventRequest): Observable<FinancialEvent> {
    return this.http.post<FinancialEvent>(this.apiUrl, event);
  }

  updateFinancialEvent(id: number | string, event: FinancialEventRequest): Observable<FinancialEvent> {
    return this.http.put<FinancialEvent>(`${this.apiUrl}/${id}`, event);
  }

  deleteFinancialEvent(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
