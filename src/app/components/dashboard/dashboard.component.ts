import { Component } from '@angular/core';
import { BalanceListComponent } from '../balance-list/balance-list.component';
import { ExpenseListComponent } from '../expense-list/expense-list.component';

@Component({
  selector: 'app-dashboard',
  imports: [BalanceListComponent, ExpenseListComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent { }