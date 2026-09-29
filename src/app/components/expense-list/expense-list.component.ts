import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ExpenseService } from '../../services/expense.service';
import { Expense } from '../../models/expense.model';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe, TitleCasePipe } from '@angular/common';

@Component({
    selector: 'app-expense-list',
    templateUrl: './expense-list.component.html',
    styleUrls: ['./expense-list.component.css'],
    imports: [DecimalPipe, RouterLink, TitleCasePipe]
})
export class ExpenseListComponent implements OnInit {
    expenses: Expense[] = [];
    loading = false;
    error: string | null = null;
    targetDeleteId: number | string | null = null;

    constructor(
        private expenseService: ExpenseService,
        private router: Router,
        public cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadExpenses();
    }

    loadExpenses(): void {
        this.loading = true;
        this.error = null;

        this.expenseService.getAllExpenses().subscribe({
            next: (expenses) => {
                this.expenses = expenses;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (error) => {
                this.error = 'Failed to load expenses';
                this.loading = false;
                this.cdr.detectChanges();
                console.error('Error loading expenses:', error);
            }
        });
    }

    addExpense(): void {
        this.router.navigate(['/expenses', 'new']);
    }

    setTargetDeleteId(id: number | string) {
        this.targetDeleteId = id;
    }

    confirmDelete() {
        if (this.targetDeleteId) {
            this.expenseService.deleteExpense(this.targetDeleteId).subscribe({
                next: () => {
                    this.loadExpenses();
                    this.targetDeleteId = null;
                },
                error: (error) => {
                    this.error = 'Failed to delete expense';
                    console.error('Error deleting expense:', error);
                }
            });
        }
    }
}