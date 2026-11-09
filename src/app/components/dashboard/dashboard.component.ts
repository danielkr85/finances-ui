import { Component } from '@angular/core';
import { AccountListComponent } from '../account-list/account-list.component';
import { ForecastComponent } from '../forecast/forecast.component';

@Component({
  selector: 'app-dashboard',
  imports: [AccountListComponent, ForecastComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent { }
