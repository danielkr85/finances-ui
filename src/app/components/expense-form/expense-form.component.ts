import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ExpenseService } from '../../services/expense.service';
import { ExpenseRequest, Category, IntervalUnit } from '../../models/expense.model';

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

  intervalUnits = [
    { value: 'DAY', label: 'Daily' },
    { value: 'WEEK', label: 'Weekly' },
    { value: 'MONTH', label: 'Monthly' },
    { value: 'YEAR', label: 'Yearly' },
    { value: 'CUSTOM', label: 'Custom' }
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

  monthsOfYear = [
    { value: 'JANUARY', label: 'January' },
    { value: 'FEBRUARY', label: 'February' },
    { value: 'MARCH', label: 'March' },
    { value: 'APRIL', label: 'April' },
    { value: 'MAY', label: 'May' },
    { value: 'JUNE', label: 'June' },
    { value: 'JULY', label: 'July' },
    { value: 'AUGUST', label: 'August' },
    { value: 'SEPTEMBER', label: 'September' },
    { value: 'OCTOBER', label: 'October' },
    { value: 'NOVEMBER', label: 'November' },
    { value: 'DECEMBER', label: 'December' }
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
    const unit = this.expenseForm.get('intervalUnit')?.value;
    const count = Number(this.expenseForm.get('intervalCount')?.value) || 1;

    const dayOfWeekControl = this.expenseForm.get('dayOfWeek');
    const dayOfMonthControl = this.expenseForm.get('dayOfMonth');
    const monthControl = this.expenseForm.get('month');
    const customExpressionControl = this.expenseForm.get('customExpression');

    if (unit === 'WEEK') {
      dayOfWeekControl?.setValidators([Validators.required]);
      dayOfMonthControl?.clearValidators();
      dayOfMonthControl?.setValue(null, { emitEvent: false });
      monthControl?.clearValidators();
      monthControl?.setValue('', { emitEvent: false });
      customExpressionControl?.clearValidators();
      customExpressionControl?.setValue('', { emitEvent: false });
    } else if (unit === 'MONTH') {
      dayOfMonthControl?.setValidators([Validators.required, Validators.min(1), Validators.max(31)]);
      if (dayOfMonthControl?.value == null) {
        dayOfMonthControl?.setValue(1, { emitEvent: false });
      }
      if (count > 1) {
        monthControl?.setValidators([Validators.required]);
      } else {
        monthControl?.clearValidators();
        monthControl?.setValue('', { emitEvent: false });
      }
      dayOfWeekControl?.clearValidators();
      dayOfWeekControl?.setValue('', { emitEvent: false });
      customExpressionControl?.clearValidators();
      customExpressionControl?.setValue('', { emitEvent: false });
    } else if (unit === 'YEAR') {
      monthControl?.setValidators([Validators.required]);
      dayOfMonthControl?.setValidators([Validators.required, Validators.min(1), Validators.max(31)]);
      if (dayOfMonthControl?.value == null) {
        dayOfMonthControl?.setValue(1, { emitEvent: false });
      }
      dayOfWeekControl?.clearValidators();
      dayOfWeekControl?.setValue('', { emitEvent: false });
      customExpressionControl?.clearValidators();
      customExpressionControl?.setValue('', { emitEvent: false });
    } else if (unit === 'CUSTOM') {
      customExpressionControl?.setValidators([Validators.required]);
      dayOfWeekControl?.clearValidators();
      dayOfWeekControl?.setValue('', { emitEvent: false });
      dayOfMonthControl?.clearValidators();
      dayOfMonthControl?.setValue(null, { emitEvent: false });
      monthControl?.clearValidators();
      monthControl?.setValue('', { emitEvent: false });
    } else {
      // DAY
      dayOfWeekControl?.clearValidators();
      dayOfWeekControl?.setValue('', { emitEvent: false });
      dayOfMonthControl?.clearValidators();
      dayOfMonthControl?.setValue(null, { emitEvent: false });
      monthControl?.clearValidators();
      monthControl?.setValue('', { emitEvent: false });
      customExpressionControl?.clearValidators();
      customExpressionControl?.setValue('', { emitEvent: false });
    }

    dayOfWeekControl?.updateValueAndValidity({ emitEvent: false });
    dayOfMonthControl?.updateValueAndValidity({ emitEvent: false });
    monthControl?.updateValueAndValidity({ emitEvent: false });
    customExpressionControl?.updateValueAndValidity({ emitEvent: false });
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
          const oldType = (expense.frequency as any).intervalType;
          switch (oldType) {
            case 'DAILY': unit = 'DAY'; count = 1; break;
            case 'WEEKLY': unit = 'WEEK'; count = 1; break;
            case 'BI_WEEKLY': unit = 'WEEK'; count = 2; break;
            case 'MONTHLY': unit = 'MONTH'; count = 1; break;
            case 'QUARTERLY': unit = 'MONTH'; count = 3; break;
            case 'SEMI_ANNUALLY': unit = 'MONTH'; count = 6; break;
            case 'YEARLY': unit = 'YEAR'; count = 1; break;
            case 'CUSTOM': unit = 'CUSTOM'; count = 1; break;
            default: unit = 'MONTH'; count = 1;
          }
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
    const unit: IntervalUnit = formVal.intervalUnit;
    const count = Number(formVal.intervalCount) || 1;

    const frequency: any = {
      intervalUnit: unit,
      intervalCount: count
    };

    if (unit === 'WEEK') {
      frequency.dayOfWeek = formVal.dayOfWeek;
    } else if (unit === 'MONTH') {
      frequency.dayOfMonth = Number(formVal.dayOfMonth);
      if (count > 1 && formVal.month) {
        frequency.month = formVal.month;
      }
    } else if (unit === 'YEAR') {
      frequency.month = formVal.month;
      frequency.dayOfMonth = Number(formVal.dayOfMonth);
    } else if (unit === 'CUSTOM') {
      frequency.customExpression = formVal.customExpression;
      frequency.intervalCount = 1;
    }

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
