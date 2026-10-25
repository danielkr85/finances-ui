import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IncomeService } from '../../services/income.service';
import { CategoryService } from '../../services/category.service';
import { AccountService } from '../../services/account.service';
import { IncomeRequest } from '../../models/income.model';
import { Account } from '../../models/account.model';
import {
  IntervalUnit,
  INTERVAL_UNITS,
  DAYS_OF_WEEK,
  MONTHS_OF_YEAR,
  mapLegacyIntervalType,
  updateFrequencyFieldRequirements,
  buildFrequencyPayload
} from '../../models/frequency.model';
import { Category } from '../../models/category.model';
import { ChangeDetectorRef } from '@angular/core';

function dateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const start = control.get('startDate')?.value;
  const end = control.get('endDate')?.value;
  if (start && end && end < start) {
    return { endDateBeforeStartDate: true };
  }
  return null;
}

@Component({
  selector: 'app-income-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './income-form.component.html',
  styleUrl: './income-form.component.css'
})
export class IncomeFormComponent implements OnInit {
  incomeForm: FormGroup;
  isEditing = false;
  loading = false;
  error: string | null = null;
  incomeId: number | string | null = null;

  intervalUnits = INTERVAL_UNITS;
  daysOfWeek = DAYS_OF_WEEK;
  monthsOfYear = MONTHS_OF_YEAR;
  categories: Category[] = [];
  accounts: Account[] = [];

  loadingCategories = false;
  loadingAccounts = false;

  constructor(
    private fb: FormBuilder,
    private incomeService: IncomeService,
    private categoryService: CategoryService,
    private accountService: AccountService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.incomeForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      amount: ['', [Validators.required, Validators.min(0)]],
      accountId: [null, [Validators.required]],
      startDate: ['', [Validators.required]],
      endDate: [''],
      categoryId: [null],
      intervalUnit: ['MONTH', [Validators.required]],
      intervalCount: [1, [Validators.required, Validators.min(1)]],
      dayOfWeek: [''],
      dayOfMonth: [1, [Validators.required, Validators.min(1), Validators.max(31)]],
      month: [''],
      customExpression: ['']
    }, { validators: dateRangeValidator });

    this.incomeForm.get('intervalUnit')?.valueChanges.subscribe(() => {
      this.updateFieldRequirements();
    });

    this.incomeForm.get('intervalCount')?.valueChanges.subscribe(() => {
      this.updateFieldRequirements();
    });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadAccounts();

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEditing = true;
      this.incomeId = id;
      this.loadIncomeForEdit();
    } else {
      this.incomeForm.patchValue({
        startDate: new Date().toISOString().split('T')[0]
      });
      this.updateFieldRequirements();
    }
  }

  loadAccounts(): void {
    this.loadingAccounts = true;
    this.accountService.getAllAccounts().subscribe({
      next: (data) => {
        this.accounts = data || [];
        this.loadingAccounts = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load accounts for income form:', err);
        this.loadingAccounts = false;
      }
    });
  }

  loadCategories(): void {
    this.loadingCategories = true;
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.categories = data;
        }
        this.loadingCategories = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load categories for income form:', err);
        this.loadingCategories = false;
      }
    });
  }

  updateFieldRequirements(): void {
    updateFrequencyFieldRequirements(this.incomeForm);
  }

  loadIncomeForEdit(): void {
    if (this.incomeId === null) return;

    this.loading = true;
    this.error = null;

    this.incomeService.getIncomeById(this.incomeId).subscribe({
      next: (income) => {
        if (income.category && !this.categories.some(c => c.id === income.category?.id)) {
          this.categories.push(income.category);
        }

        let unit = income.frequency?.intervalUnit;
        let count = income.frequency?.intervalCount ?? 1;

        if (!unit && (income.frequency as any)?.intervalType) {
          const legacy = mapLegacyIntervalType((income.frequency as any).intervalType);
          unit = legacy.intervalUnit;
          count = legacy.intervalCount;
        }

        const accountId = income.accountId != null 
          ? Number(income.accountId) 
          : (income.account?.id ? Number(income.account.id) : null);

        this.incomeForm.patchValue({
          name: income.name,
          amount: income.amount,
          accountId: accountId,
          startDate: income.startDate ? String(income.startDate).split('T')[0] : '',
          endDate: income.endDate ? String(income.endDate).split('T')[0] : '',
          categoryId: income.category ? Number(income.category.id) : (income.categoryId ? Number(income.categoryId) : null),
          intervalUnit: unit || 'MONTH',
          intervalCount: count,
          dayOfWeek: income.frequency?.dayOfWeek || '',
          dayOfMonth: income.frequency?.dayOfMonth ?? ((unit === 'MONTH' || unit === 'YEAR') ? 1 : null),
          month: income.frequency?.month || '',
          customExpression: income.frequency?.customExpression || ''
        });
        this.updateFieldRequirements();
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load income';
        this.loading = false;
        console.error('Error loading income:', error);
      }
    });
  }

  onSubmit(): void {
    if (this.incomeForm.invalid) {
      this.incomeForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    const formVal = this.incomeForm.value;
    const selectedCategory = this.categories.find(c => c.id === Number(formVal.categoryId));
    const frequency = buildFrequencyPayload(formVal);

    const incomeData: IncomeRequest = {
      name: formVal.name.trim(),
      amount: Number(formVal.amount),
      frequency,
      accountId: Number(formVal.accountId),
      startDate: formVal.startDate,
      endDate: formVal.endDate ? formVal.endDate : null,
      ...(selectedCategory ? { category: selectedCategory, categoryId: selectedCategory.id } : {})
    };

    if (this.isEditing && this.incomeId !== null) {
      this.incomeService.updateIncome(this.incomeId, incomeData).subscribe({
        next: () => {
          this.router.navigate(['/incomes']);
        },
        error: (error) => {
          this.error = 'Failed to update income';
          this.loading = false;
          console.error('Error updating income:', error);
        }
      });
    } else {
      this.incomeService.createIncome(incomeData).subscribe({
        next: () => {
          this.router.navigate(['/incomes']);
        },
        error: (error) => {
          this.error = 'Failed to create income';
          this.loading = false;
          console.error('Error creating income:', error);
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/incomes']);
  }
}
