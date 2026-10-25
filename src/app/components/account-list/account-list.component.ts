import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AccountService } from '../../services/account.service';
import { Account } from '../../models/account.model';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-account-list',
  standalone: true,
  templateUrl: './account-list.component.html',
  styleUrls: ['./account-list.component.css'],
  imports: [DecimalPipe, RouterLink]
})
export class AccountListComponent implements OnInit {
  accounts: Account[] = [];
  loading = false;
  error: string | null = null;
  targetDeleteId: number | null = null;

  constructor(
    private accountService: AccountService,
    private router: Router,
    public cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.loading = true;
    this.error = null;

    this.accountService.getAllAccounts().subscribe({
      next: (accounts) => {
        this.accounts = accounts;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.error = 'Failed to load accounts';
        this.loading = false;
        this.cdr.detectChanges();
        console.error('Error loading accounts:', error);
      }
    });
  }

  editAccount(id: number): void {
    this.router.navigate(['/accounts', id, 'edit']);
  }

  deleteAccount(id: number): void {
    if (confirm('Are you sure you want to delete this account?')) {
      this.accountService.deleteAccount(id).subscribe({
        next: () => {
          this.loadAccounts(); // Refresh the list
        },
        error: (error) => {
          this.error = 'Failed to delete account';
          console.error('Error deleting account:', error);
        }
      });
    }
  }

  addAccount(): void {
    this.router.navigate(['/accounts', 'new']);
  }

  setTargetDeleteId(id: number) {
    this.targetDeleteId = id;
  }

  confirmDelete() {
    if (this.targetDeleteId) {
      this.accountService.deleteAccount(this.targetDeleteId).subscribe(() => {
        this.loadAccounts(); // Refresh the list view
        this.targetDeleteId = null;
      });
    }
  }
}
