import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinancialEventService } from '../../services/financial-event.service';
import { AccountService } from '../../services/account.service';
import { CategoryService } from '../../services/category.service';
import { FinancialEvent, FinancialEventStatus } from '../../models/financial-event.model';
import { AccountResponse } from '../../models/account.model';
import { Category } from '../../models/category.model';

@Component({
  selector: 'app-financial-event-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './financial-event-list.component.html',
  styleUrls: ['./financial-event-list.component.css']
})
export class FinancialEventListComponent implements OnInit {
  financialEvents: FinancialEvent[] = [];
  accounts: AccountResponse[] = [];
  categories: Category[] = [];
  loading = false;
  error: string | null = null;
  targetDeleteId: number | string | null = null;

  selectedStatus: 'ALL' | FinancialEventStatus = 'ALL';

  constructor(
    private financialEventService: FinancialEventService,
    private accountService: AccountService,
    private categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    this.loadEvents();
    this.loadAccounts();
    this.loadCategories();
  }

  loadEvents(): void {
    this.loading = true;
    this.error = null;
    this.financialEventService.getAllFinancialEvents().subscribe({
      next: (events) => {
        this.financialEvents = events;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load financial events';
        this.loading = false;
        console.error('Error loading events:', err);
      }
    });
  }

  loadAccounts(): void {
    this.accountService.getAllAccounts().subscribe({
      next: (accounts) => {
        this.accounts = accounts;
      },
      error: (err) => console.error('Error loading accounts:', err)
    });
  }

  loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (err) => console.error('Error loading categories:', err)
    });
  }

  get filteredEvents(): FinancialEvent[] {
    if (this.selectedStatus === 'ALL') {
      return this.financialEvents;
    }
    return this.financialEvents.filter(e => e.status === this.selectedStatus);
  }

  get filteredTotalAmount(): number {
    return this.filteredEvents.reduce((sum, e) => sum + (e.amount || 0), 0);
  }

  setStatusFilter(status: 'ALL' | FinancialEventStatus): void {
    this.selectedStatus = status;
  }

  getAccountName(event: FinancialEvent): string {
    if (event.account?.name) return event.account.name;
    const acc = this.accounts.find(a => Number(a.id) === Number(event.accountId));
    return acc ? acc.name : '';
  }

  getCategoryName(event: FinancialEvent): string {
    if (event.category?.name) return event.category.name;
    const cat = this.categories.find(c => Number(c.id) === Number(event.categoryId));
    return cat ? cat.name : 'Uncategorized';
  }

  getStatusBadgeClass(status: FinancialEventStatus): string {
    switch (status) {
      case 'CLEARED':
        return 'text-bg-success';
      case 'POSTED':
        return 'text-bg-primary';
      case 'PLANNED':
      default:
        return 'text-bg-warning text-dark';
    }
  }

  cycleStatus(event: FinancialEvent): void {
    const nextStatus: Record<FinancialEventStatus, FinancialEventStatus> = {
      PLANNED: 'POSTED',
      POSTED: 'CLEARED',
      CLEARED: 'PLANNED'
    };
    const updatedStatus = nextStatus[event.status];
    this.financialEventService.updateFinancialEvent(event.id, {
      description: event.description,
      amount: event.amount,
      eventDate: event.eventDate,
      status: updatedStatus,
      accountId: event.accountId,
      categoryId: event.categoryId,
      recurringRuleId: event.recurringRuleId
    }).subscribe({
      next: () => {
        event.status = updatedStatus;
      },
      error: (err) => {
        console.error('Error cycling status:', err);
      }
    });
  }

  setTargetDeleteId(id: number | string): void {
    this.targetDeleteId = id;
  }

  confirmDelete(): void {
    if (this.targetDeleteId !== null) {
      this.financialEventService.deleteFinancialEvent(this.targetDeleteId).subscribe({
        next: () => {
          this.loadEvents();
          this.targetDeleteId = null;
        },
        error: (err) => {
          this.error = 'Failed to delete financial event';
          console.error('Error deleting event:', err);
        }
      });
    }
  }
}
