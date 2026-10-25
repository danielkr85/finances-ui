import { Component } from '@angular/core';
import { AccountListComponent } from '../account-list/account-list.component';
import { IncomeListComponent } from '../income-list/income-list.component';
import { ExpenseListComponent } from '../expense-list/expense-list.component';

@Component({
  selector: 'app-dashboard',
  imports: [AccountListComponent, IncomeListComponent, ExpenseListComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent { }