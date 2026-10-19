import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { BalanceService } from '../../services/balance.service';
import { Balance } from '../../models/balance.model';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-balance-list',
  templateUrl: './balance-list.component.html',
  styleUrls: ['./balance-list.component.css'],
  imports: [DecimalPipe, RouterLink]
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
    this.loading = true;
    this.error = null;

    this.balanceService.getAllBalances().subscribe({
      next: (balances) => {
        this.balances = balances;
        this.loading = false;
        this.cdr.detectChanges();
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

  // Keep track of the item to delete
  targetDeleteId: number | null = null;

  setTargetDeleteId(id: number) {
    this.targetDeleteId = id;
  }

  confirmDelete() {
    if (this.targetDeleteId) {
      // Call your actual service logic here
      this.balanceService.deleteBalance(this.targetDeleteId).subscribe(() => {
        this.loadBalances(); // Refresh the list view
        this.targetDeleteId = null;
      });
    }
  }
}
