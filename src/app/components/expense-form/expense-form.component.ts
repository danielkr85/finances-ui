import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ExpenseService } from '../../services/expense.service';
import { CategoryService } from '../../services/category.service';
import { ExpenseRequest } from '../../models/expense.model';
import {
  IntervalUnit,
  INTERVAL_UNITS,
  DAYS_OF_WEEK,
  MONTHS_OF_YEAR,
  mapLegacyIntervalType,
  updateFrequencyFieldRequirements,
  buildFrequencyPayload
} from '../../models/frequency.model';
import { Category, DEFAULT_CATEGORIES } from '../../models/category.model';

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './expense-form.component.html',
  styleUrl: './expense-form.component.css'
})
export class ExpenseFormComponent implements OnInit {
  expenseForm: FormGroup;
  isEditing = false;
  loading = false;
  error: string | null = null;
  expenseId: number | string | null = null;

  intervalUnits = INTERVAL_UNITS;
  daysOfWeek = DAYS_OF_WEEK;
  monthsOfYear = MONTHS_OF_YEAR;
  categories: Category[] = [...DEFAULT_CATEGORIES];

  showNewCategoryInput = false;
  newCategoryName = '';
  creatingCategory = false;
  categoryError: string | null = null;
  loadingCategories = false;
  private previousCategoryId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private expenseService: ExpenseService,
    private categoryService: CategoryService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.expenseForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      amount: ['', [Validators.required, Validators.min(0)]],
      categoryId: [null],
      intervalUnit: ['MONTH', [Validators.required]],
      intervalCount: [1, [Validators.required, Validators.min(1)]],
      dayOfWeek: [''],
      dayOfMonth: [1, [Validators.required, Validators.min(1), Validators.max(31)]],
      month: [''],
      customExpression: ['']
    });

    this.expenseForm.get('intervalUnit')?.valueChanges.subscribe(() => {
      this.updateFieldRequirements();
    });

    this.expenseForm.get('intervalCount')?.valueChanges.subscribe(() => {
      this.updateFieldRequirements();
    });
  }

  ngOnInit(): void {
    this.loadCategories();

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEditing = true;
      this.expenseId = id;
      this.loadExpenseForEdit();
    } else {
      this.updateFieldRequirements();
    }
  }

  loadCategories(): void {
    this.loadingCategories = true;
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          const currentId = this.expenseForm.get('categoryId')?.value;
          const currentCat = this.categories.find(c => c.id === currentId);
          this.categories = data;
          if (currentCat && !this.categories.some(c => c.id === currentCat.id)) {
            this.categories.push(currentCat);
          }
        }
        this.loadingCategories = false;
      },
      error: (err) => {
        console.error('Failed to load categories from API, keeping defaults:', err);
        this.loadingCategories = false;
      }
    });
  }

  onCategoryChange(): void {
    const val = this.expenseForm.get('categoryId')?.value;
    if (val === '__NEW__') {
      this.openNewCategoryInput();
      this.expenseForm.get('categoryId')?.setValue(this.previousCategoryId, { emitEvent: false });
    } else {
      this.previousCategoryId = val !== null && val !== undefined ? Number(val) : null;
    }
  }

  openNewCategoryInput(): void {
    this.showNewCategoryInput = true;
    this.newCategoryName = '';
    this.categoryError = null;
  }

  cancelNewCategory(): void {
    this.showNewCategoryInput = false;
    this.newCategoryName = '';
    this.categoryError = null;
    this.expenseForm.get('categoryId')?.setValue(this.previousCategoryId);
  }

  saveNewCategory(): void {
    const trimmed = this.newCategoryName.trim();
    if (!trimmed) {
      this.categoryError = 'Category name cannot be empty.';
      return;
    }

    const existing = this.categories.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      this.expenseForm.get('categoryId')?.setValue(existing.id);
      this.previousCategoryId = existing.id;
      this.showNewCategoryInput = false;
      this.newCategoryName = '';
      this.categoryError = null;
      return;
    }

    this.creatingCategory = true;
    this.categoryError = null;

    this.categoryService.createCategory({ name: trimmed }).subscribe({
      next: (newCategory) => {
        const parsedCategory: Category = {
          ...newCategory,
          id: Number(newCategory.id)
        };
        this.categories.push(parsedCategory);
        this.expenseForm.get('categoryId')?.setValue(parsedCategory.id);
        this.previousCategoryId = parsedCategory.id;
        this.creatingCategory = false;
        this.showNewCategoryInput = false;
        this.newCategoryName = '';
      },
      error: (err) => {
        console.error('Error creating category:', err);
        this.categoryError = err?.error?.message || 'Failed to create category. Please try again.';
        this.creatingCategory = false;
      }
    });
  }

  updateFieldRequirements(): void {
    updateFrequencyFieldRequirements(this.expenseForm);
  }

  loadExpenseForEdit(): void {
    if (this.expenseId === null) return;

    this.loading = true;
    this.error = null;

    this.expenseService.getExpenseById(this.expenseId).subscribe({
      next: (expense) => {
        if (expense.category && !this.categories.some(c => c.id === expense.category?.id)) {
          this.categories.push(expense.category);
        }

        const categoryId = expense.category ? Number(expense.category.id) : null;
        this.previousCategoryId = categoryId;

        let unit = expense.frequency?.intervalUnit;
        let count = expense.frequency?.intervalCount ?? 1;

        if (!unit && (expense.frequency as any)?.intervalType) {
          const legacy = mapLegacyIntervalType((expense.frequency as any).intervalType);
          unit = legacy.intervalUnit;
          count = legacy.intervalCount;
        }

        this.expenseForm.patchValue({
          name: expense.name,
          amount: expense.amount,
          categoryId: categoryId,
          intervalUnit: unit || 'MONTH',
          intervalCount: count,
          dayOfWeek: expense.frequency?.dayOfWeek || '',
          dayOfMonth: expense.frequency?.dayOfMonth ?? ((unit === 'MONTH' || unit === 'YEAR') ? 1 : null),
          month: expense.frequency?.month || '',
          customExpression: expense.frequency?.customExpression || ''
        });
        this.updateFieldRequirements();
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load expense';
        this.loading = false;
        console.error('Error loading expense:', error);
      }
    });
  }

  onSubmit(): void {
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    const formVal = this.expenseForm.value;
    const selectedCategory = this.categories.find(c => c.id === Number(formVal.categoryId));
    const frequency = buildFrequencyPayload(formVal);

    const expenseData: ExpenseRequest = {
      name: formVal.name.trim(),
      amount: Number(formVal.amount),
      frequency,
      ...(selectedCategory ? { category: selectedCategory, categoryId: selectedCategory.id } : {})
    };

    if (this.isEditing && this.expenseId !== null) {
      this.expenseService.updateExpense(this.expenseId, expenseData).subscribe({
        next: () => {
          this.router.navigate(['/expenses']);
        },
        error: (error) => {
          this.error = 'Failed to update expense';
          this.loading = false;
          console.error('Error updating expense:', error);
        }
      });
    } else {
      this.expenseService.createExpense(expenseData).subscribe({
        next: () => {
          this.router.navigate(['/expenses']);
        },
        error: (error) => {
          this.error = 'Failed to create expense';
          this.loading = false;
          console.error('Error creating expense:', error);
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/expenses']);
  }
}
