import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ExpenseService } from '../../services/expense.service';
import { CategoryService } from '../../services/category.service';
import { Expense } from '../../models/expense.model';
import { Category } from '../../models/category.model';
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
    categories: Category[] = [];
    selectedCategoryIds = new Set<number>();
    loading = false;
    loadingCategories = false;
    error: string | null = null;
    targetDeleteId: number | string | null = null;

    constructor(
        private expenseService: ExpenseService,
        private categoryService: CategoryService,
        private router: Router,
        public cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadCategories();
        this.loadExpenses();
    }

    loadCategories(): void {
        this.loadingCategories = true;
        this.categoryService.getCategories().subscribe({
            next: (categories) => {
                this.categories = categories;
                this.loadingCategories = false;
                this.cdr.detectChanges();
            },
            error: (error) => {
                console.error('Failed to load categories:', error);
                this.loadingCategories = false;
            }
        });
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

    get filteredExpenses(): Expense[] {
        if (this.selectedCategoryIds.size === 0) {
            return this.expenses;
        }
        return this.expenses.filter(e =>
            e.category?.id != null && this.selectedCategoryIds.has(Number(e.category.id))
        );
    }

    get filteredTotalAmount(): number {
        return this.filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    }

    get hasActiveFilters(): boolean {
        return this.selectedCategoryIds.size > 0;
    }

    toggleCategory(categoryId: number | string): void {
        const id = Number(categoryId);
        if (this.selectedCategoryIds.has(id)) {
            this.selectedCategoryIds.delete(id);
        } else {
            this.selectedCategoryIds.add(id);
        }
        // Trigger change detection since Set mutations aren't detected
        this.selectedCategoryIds = new Set(this.selectedCategoryIds);
    }

    isSelected(categoryId: number | string): boolean {
        return this.selectedCategoryIds.has(Number(categoryId));
    }

    clearFilters(): void {
        this.selectedCategoryIds = new Set<number>();
    }

    getCategoryExpenseCount(categoryId: number | string): number {
        const id = Number(categoryId);
        return this.expenses.filter(e => Number(e.category?.id) === id).length;
    }

    getUncategorizedCount(): number {
        return this.expenses.filter(e => !e.category?.id).length;
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