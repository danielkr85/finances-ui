import { Component } from '@angular/core';
import { AccountListComponent } from '../account-list/account-list.component';
import { RecurringRuleListComponent } from '../recurring-rule-list/recurring-rule-list.component';
import { FinancialEventListComponent } from '../financial-event-list/financial-event-list.component';

@Component({
  selector: 'app-dashboard',
  imports: [AccountListComponent, RecurringRuleListComponent, FinancialEventListComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent { }