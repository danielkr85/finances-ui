import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RecurringRuleService } from '../../services/recurring-rule.service';
import { CategoryService } from '../../services/category.service';
import { AccountService } from '../../services/account.service';
import { RecurringRuleRequest, RecurringRuleType } from '../../models/recurring-rule.model';
import { Account } from '../../models/account.model';
import { Category } from '../../models/category.model';
import {
  IntervalUnit,
  INTERVAL_UNITS,
  DAYS_OF_WEEK,
  MONTHS_OF_YEAR,
  updateFrequencyFieldRequirements,
  buildFrequencyPayload
} from '../../models/frequency.model';

function dateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const start = control.get('startDate')?.value;
  const end = control.get('endDate')?.value;
  if (start && end && end < start) {
    return { endDateBeforeStartDate: true };
  }
  return null;
}

@Component({
  selector: 'app-recurring-rule-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './recurring-rule-form.component.html',
  styleUrls: ['./recurring-rule-form.component.css']
})
export class RecurringRuleFormComponent implements OnInit {
  ruleForm: FormGroup;
  isEditing = false;
  loading = false;
  error: string | null = null;
  ruleId: number | string | null = null;

  intervalUnits = INTERVAL_UNITS;
  daysOfWeek = DAYS_OF_WEEK;
  monthsOfYear = MONTHS_OF_YEAR;
  categories: Category[] = [];
  accounts: Account[] = [];

  showNewCategoryInput = false;
  newCategoryName = '';
  creatingCategory = false;
  categoryError: string | null = null;
  loadingCategories = false;
  loadingAccounts = false;

  constructor(
    private fb: FormBuilder,
    private recurringRuleService: RecurringRuleService,
    private categoryService: CategoryService,
    private accountService: AccountService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.ruleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      type: ['EXPENSE' as RecurringRuleType, [Validators.required]],
      defaultAmount: ['', [Validators.required, Validators.min(0)]],
      accountId: [null, [Validators.required]],
      categoryId: [null, [Validators.required]],
      startDate: ['', [Validators.required]],
      endDate: [''],
      intervalUnit: ['MONTH', [Validators.required]],
      intervalCount: [1, [Validators.required, Validators.min(1)]],
      dayOfWeek: [''],
      dayOfMonth: [1, [Validators.required, Validators.min(1), Validators.max(31)]],
      month: ['']
    }, { validators: dateRangeValidator });

    this.ruleForm.get('intervalUnit')?.valueChanges.subscribe(() => {
      this.updateFieldRequirements();
    });

    this.ruleForm.get('intervalCount')?.valueChanges.subscribe(() => {
      this.updateFieldRequirements();
    });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadAccounts();

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEditing = true;
      this.ruleId = id;
      this.loadRuleForEdit();
    } else {
      this.updateFieldRequirements();
    }
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
    this.loadingAccounts = true;
    this.accountService.getAllAccounts().subscribe({
      next: (accounts) => {
        this.accounts = accounts;
        this.loadingAccounts = false;
      },
      error: (err) => {
        console.error('Error loading accounts:', err);
        this.loadingAccounts = false;
      }
    });
  }

  updateFieldRequirements(): void {
    updateFrequencyFieldRequirements(this.ruleForm);
    this.cdr.detectChanges();
  }

  loadRuleForEdit(): void {
    if (!this.ruleId) return;
    this.loading = true;
    this.recurringRuleService.getRecurringRuleById(this.ruleId).subscribe({
      next: (rule) => {
        const intervalUnit = rule.frequency?.intervalUnit;
        const intervalCount = rule.frequency?.intervalCount;

        const categoryId = rule.categoryId || rule.category?.id || null;
        const accountId = rule.accountId || rule.account?.id || null;

        this.ruleForm.patchValue({
          name: rule.name,
          type: rule.type || 'EXPENSE',
          defaultAmount: rule.defaultAmount,
          accountId: accountId ? Number(accountId) : null,
          categoryId: categoryId ? Number(categoryId) : null,
          startDate: rule.startDate || '',
          endDate: rule.endDate || '',
          intervalUnit: intervalUnit || 'MONTH',
          intervalCount: intervalCount || 1,
          dayOfWeek: rule.frequency?.dayOfWeek || '',
          dayOfMonth: rule.frequency?.dayOfMonth || 1,
          month: rule.frequency?.month || ''
        });

        this.updateFieldRequirements();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load recurring rule details';
        this.loading = false;
        console.error('Error loading rule:', err);
      }
    });
  }

  toggleNewCategoryInput(): void {
    this.showNewCategoryInput = !this.showNewCategoryInput;
    this.newCategoryName = '';
    this.categoryError = null;
  }

  createCategory(): void {
    if (!this.newCategoryName.trim()) return;

    this.creatingCategory = true;
    this.categoryError = null;

    this.categoryService.createCategory({ name: this.newCategoryName.trim() }).subscribe({
      next: (created) => {
        this.categories.push(created);
        this.ruleForm.patchValue({ categoryId: Number(created.id) });
        this.showNewCategoryInput = false;
        this.newCategoryName = '';
        this.creatingCategory = false;
      },
      error: (err) => {
        this.categoryError = 'Failed to create category';
        this.creatingCategory = false;
        console.error('Error creating category:', err);
      }
    });
  }

  onSubmit(): void {
    if (this.ruleForm.invalid) {
      this.ruleForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    const formVal = this.ruleForm.value;
    const frequency = buildFrequencyPayload(formVal);

    const payload: RecurringRuleRequest = {
      name: formVal.name.trim(),
      type: formVal.type,
      defaultAmount: Number(formVal.defaultAmount),
      frequency,
      accountId: Number(formVal.accountId),
      categoryId: Number(formVal.categoryId),
      startDate: formVal.startDate,
      endDate: formVal.endDate ? formVal.endDate : null
    };

    if (this.isEditing && this.ruleId) {
      this.recurringRuleService.updateRecurringRule(this.ruleId, payload).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/recurring-rules']);
        },
        error: (err) => {
          this.error = 'Failed to update recurring rule';
          this.loading = false;
          console.error('Error updating rule:', err);
        }
      });
    } else {
      this.recurringRuleService.createRecurringRule(payload).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/recurring-rules']);
        },
        error: (err) => {
          this.error = 'Failed to create recurring rule';
          this.loading = false;
          console.error('Error creating rule:', err);
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/recurring-rules']);
  }
}
