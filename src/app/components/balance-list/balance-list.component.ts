import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { BalanceService } from '../../services/balance.service';
import { Balance } from '../../models/balance.model';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-balance-list',
  templateUrl: './balance-list.component.html',
  styleUrls: ['./balance-list.component.css'],
  imports: [DecimalPipe]
})
export class BalanceListComponent implements OnInit {
  balances: Balance[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private balanceService: BalanceService,
    private router: Router,
    public cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadBalances();
  }

  loadBalances(): void {
      console.log('Step 1: loadBalances started'); // New log
    this.loading = true;
    this.error = null;

    this.balanceService.getAllBalances().subscribe({
      next: (balances) => {
        console.log('Step 2: Data received', balances);
        this.balances = balances;
        this.loading = false;
        this.cdr.detectChanges();
        console.log('Step 3: Loading set to false'); // New log
      },
      error: (error) => {
        this.error = 'Failed to load balances';
        this.loading = false;
        this.cdr.detectChanges();
        console.error('Error loading balances:', error);
      }
    });
  }

  editBalance(id: number): void {
    this.router.navigate(['/balances', id, 'edit']);
  }

  deleteBalance(id: number): void {
    if (confirm('Are you sure you want to delete this balance?')) {
      this.balanceService.deleteBalance(id).subscribe({
        next: () => {
          this.loadBalances(); // Refresh the list
        },
        error: (error) => {
          this.error = 'Failed to delete balance';
          console.error('Error deleting balance:', error);
        }
      });
    }
  }

  addBalance(): void {
    this.router.navigate(['/balances', 'new']);
  }
}
