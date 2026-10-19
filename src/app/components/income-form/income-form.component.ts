import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IncomeService } from '../../services/income.service';
import { IncomeRequest } from '../../models/income.model';
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
  categories: Category[] = [...DEFAULT_CATEGORIES];

  constructor(
    private fb: FormBuilder,
    private incomeService: IncomeService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.incomeForm = this.fb.group({
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

    this.incomeForm.get('intervalUnit')?.valueChanges.subscribe(() => {
      this.updateFieldRequirements();
    });

    this.incomeForm.get('intervalCount')?.valueChanges.subscribe(() => {
      this.updateFieldRequirements();
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEditing = true;
      this.incomeId = id;
      this.loadIncomeForEdit();
    } else {
      this.updateFieldRequirements();
    }
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

        this.incomeForm.patchValue({
          name: income.name,
          amount: income.amount,
          categoryId: income.category ? Number(income.category.id) : null,
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
