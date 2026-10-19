import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ExpenseService } from '../../services/expense.service';
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
  imports: [CommonModule, ReactiveFormsModule],
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

  constructor(
    private fb: FormBuilder,
    private expenseService: ExpenseService,
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
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEditing = true;
      this.expenseId = id;
      this.loadExpenseForEdit();
    } else {
      this.updateFieldRequirements();
    }
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
          categoryId: expense.category ? Number(expense.category.id) : null,
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
