import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ExpenseService } from '../../services/expense.service';
import { ExpenseRequest, Category } from '../../models/expense.model';

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

  intervalTypes = [
    { value: 'DAILY', label: 'Daily' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'BI_WEEKLY', label: 'Bi-Weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'YEARLY', label: 'Yearly' }
  ];

  daysOfWeek = [
    { value: 'MONDAY', label: 'Monday' },
    { value: 'TUESDAY', label: 'Tuesday' },
    { value: 'WEDNESDAY', label: 'Wednesday' },
    { value: 'THURSDAY', label: 'Thursday' },
    { value: 'FRIDAY', label: 'Friday' },
    { value: 'SATURDAY', label: 'Saturday' },
    { value: 'SUNDAY', label: 'Sunday' }
  ];

  categories: Category[] = [
    { id: 1, name: 'Food' },
    { id: 2, name: 'Utilities' },
    { id: 3, name: 'Housing' },
    { id: 4, name: 'Transportation' },
    { id: 5, name: 'Entertainment' },
    { id: 6, name: 'Healthcare' },
    { id: 7, name: 'Personal' },
    { id: 8, name: 'Other' }
  ];

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
      intervalType: ['MONTHLY', [Validators.required]],
      intervalCount: [1, [Validators.required, Validators.min(1)]],
      dayOfWeek: [''],
      dayOfMonth: [null, [Validators.min(1), Validators.max(31)]]
    });

    this.expenseForm.get('intervalType')?.valueChanges.subscribe((type) => {
      if (type !== 'WEEKLY' && type !== 'BI_WEEKLY') {
        this.expenseForm.get('dayOfWeek')?.setValue('');
      }
      if (type !== 'MONTHLY') {
        this.expenseForm.get('dayOfMonth')?.setValue(null);
      }
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEditing = true;
      this.expenseId = id;
      this.loadExpenseForEdit();
    }
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
        this.expenseForm.patchValue({
          name: expense.name,
          amount: expense.amount,
          categoryId: expense.category ? Number(expense.category.id) : null,
          intervalType: expense.frequency?.intervalType || 'MONTHLY',
          intervalCount: expense.frequency?.intervalCount ?? 1,
          dayOfWeek: expense.frequency?.dayOfWeek || '',
          dayOfMonth: expense.frequency?.dayOfMonth ?? null
        });
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

    const frequency: any = {
      intervalType: formVal.intervalType,
      intervalCount: Number(formVal.intervalCount) || 1
    };

    if ((formVal.intervalType === 'WEEKLY' || formVal.intervalType === 'BI_WEEKLY') && formVal.dayOfWeek) {
      frequency.dayOfWeek = formVal.dayOfWeek;
    }

    if (formVal.intervalType === 'MONTHLY' && formVal.dayOfMonth) {
      frequency.dayOfMonth = Number(formVal.dayOfMonth);
    }

    const expenseData: ExpenseRequest = {
      name: formVal.name.trim(),
      amount: Number(formVal.amount),
      frequency,
      ...(selectedCategory ? { category: selectedCategory } : {})
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
