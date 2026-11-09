import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { RecurringRuleService } from '../../services/recurring-rule.service';
import { CategoryService } from '../../services/category.service';
import { AccountService } from '../../services/account.service';
import { RecurringRule, RecurringRuleType } from '../../models/recurring-rule.model';
import { Category } from '../../models/category.model';
import { AccountResponse } from '../../models/account.model';

@Component({
  selector: 'app-recurring-rule-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './recurring-rule-list.component.html',
  styleUrls: ['./recurring-rule-list.component.css']
})
export class RecurringRuleListComponent implements OnInit {
  recurringRules: RecurringRule[] = [];
  categories: Category[] = [];
  accounts: AccountResponse[] = [];
  loading = false;
  loadingCategories = false;
  error: string | null = null;
  targetDeleteId: number | string | null = null;

  selectedCategoryIds = new Set<number>();
  selectedType: 'ALL' | RecurringRuleType = 'ALL';

  constructor(
    private recurringRuleService: RecurringRuleService,
    private categoryService: CategoryService,
    private accountService: AccountService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRecurringRules();
    this.loadCategories();
    this.loadAccounts();
  }

  loadRecurringRules(): void {
    this.loading = true;
    this.error = null;
    this.recurringRuleService.getAllRecurringRules().subscribe({
      next: (rules) => {
        this.recurringRules = rules;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load recurring rules';
        this.loading = false;
        console.error('Error loading recurring rules:', error);
      }
    });
  }

  loadCategories(): void {
    this.loadingCategories = true;
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.loadingCategories = false;
      },
      error: (err) => {
        console.error('Error loading categories:', err);
        this.loadingCategories = false;
      }
    });
  }

  loadAccounts(): void {
    this.accountService.getAllAccounts().subscribe({
      next: (accounts) => {
        this.accounts = accounts;
      },
      error: (err) => {
        console.error('Error loading accounts:', err);
      }
    });
  }

  get filteredRules(): RecurringRule[] {
    return this.recurringRules.filter(rule => {
      const matchesType = this.selectedType === 'ALL' || rule.type === this.selectedType;
      const ruleCatId = Number(rule.categoryId || rule.category?.id);
      const matchesCategory = this.selectedCategoryIds.size === 0 || this.selectedCategoryIds.has(ruleCatId);
      return matchesType && matchesCategory;
    });
  }

  get filteredTotalAmount(): number {
    return this.filteredRules.reduce((sum, r) => sum + (r.defaultAmount || 0), 0);
  }

  get hasActiveFilters(): boolean {
    return this.selectedCategoryIds.size > 0 || this.selectedType !== 'ALL';
  }

  toggleTypeFilter(type: 'ALL' | RecurringRuleType): void {
    this.selectedType = type;
  }

  toggleCategory(categoryId: number | string): void {
    const id = Number(categoryId);
    if (this.selectedCategoryIds.has(id)) {
      this.selectedCategoryIds.delete(id);
    } else {
      this.selectedCategoryIds.add(id);
    }
  }

  isCategorySelected(categoryId: number | string): boolean {
    return this.selectedCategoryIds.has(Number(categoryId));
  }

  clearFilters(): void {
    this.selectedCategoryIds.clear();
    this.selectedType = 'ALL';
  }

  getCategoryName(rule: RecurringRule): string {
    if (rule.category?.name) return rule.category.name;
    const cat = this.categories.find(c => Number(c.id) === Number(rule.categoryId));
    return cat ? cat.name : 'Uncategorized';
  }

  getAccountName(rule: RecurringRule): string {
    if (rule.account?.name) return rule.account.name;
    const acc = this.accounts.find(a => Number(a.id) === Number(rule.accountId));
    return acc ? acc.name : '';
  }

  addRecurringRule(): void {
    this.router.navigate(['/recurring-rules', 'new']);
  }

  setTargetDeleteId(id: number | string): void {
    this.targetDeleteId = id;
  }

  confirmDelete(): void {
    if (this.targetDeleteId !== null) {
      this.recurringRuleService.deleteRecurringRule(this.targetDeleteId).subscribe({
        next: () => {
          this.loadRecurringRules();
          this.targetDeleteId = null;
        },
        error: (error) => {
          this.error = 'Failed to delete recurring rule';
          console.error('Error deleting recurring rule:', error);
        }
      });
    }
  }
}
