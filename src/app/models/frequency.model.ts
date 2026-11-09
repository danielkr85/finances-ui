import { FormGroup, Validators } from '@angular/forms';

/** CUSTOM exists on the server but is rejected (400), so the UI doesn't offer it. */
export type IntervalUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type Month =
  | 'JANUARY'
  | 'FEBRUARY'
  | 'MARCH'
  | 'APRIL'
  | 'MAY'
  | 'JUNE'
  | 'JULY'
  | 'AUGUST'
  | 'SEPTEMBER'
  | 'OCTOBER'
  | 'NOVEMBER'
  | 'DECEMBER';

/**
 * A recurrence schedule. Each unit takes exactly certain fields; sending any other is a 400:
 * - DAY: nothing else
 * - WEEK: dayOfWeek
 * - MONTH: dayOfMonth, plus month (the anchor) when intervalCount > 1 — e.g. quarterly Jan/Apr/Jul/Oct
 * - YEAR: month and dayOfMonth (must exist in that month)
 * dayOfMonth 29–31 falls on the last day of shorter months.
 */
export interface FrequencyRequest {
  intervalUnit: IntervalUnit;
  /** Defaults to 1. */
  intervalCount?: number;
  dayOfWeek?: DayOfWeek;
  dayOfMonth?: number;
  month?: Month;
}

export interface Frequency {
  intervalUnit: IntervalUnit;
  intervalCount: number;
  dayOfWeek: DayOfWeek | null;
  dayOfMonth: number | null;
  month: Month | null;
  /** Read-only display text, e.g. "Monthly", "Bi-weekly", "Every 3 days". */
  description: string;
}

export interface Option<T extends string> {
  value: T;
  label: string;
}

export const INTERVAL_UNITS: Option<IntervalUnit>[] = [
  { value: 'DAY', label: 'Daily' },
  { value: 'WEEK', label: 'Weekly' },
  { value: 'MONTH', label: 'Monthly' },
  { value: 'YEAR', label: 'Yearly' },
];

export const DAYS_OF_WEEK: Option<DayOfWeek>[] = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
];

export const MONTHS_OF_YEAR: Option<Month>[] = [
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
  { value: 'DECEMBER', label: 'December' },
];

/** Sets the form's frequency validators to match the server's rules for the selected unit and count. */
export function updateFrequencyFieldRequirements(form: FormGroup): void {
  const unit: IntervalUnit = form.get('intervalUnit')?.value;
  const count = Number(form.get('intervalCount')?.value) || 1;

  const dayOfWeek = form.get('dayOfWeek');
  const dayOfMonth = form.get('dayOfMonth');
  const month = form.get('month');

  const needsDayOfWeek = unit === 'WEEK';
  const needsDayOfMonth = unit === 'MONTH' || unit === 'YEAR';
  const needsMonth = unit === 'YEAR' || (unit === 'MONTH' && count > 1);

  if (needsDayOfWeek) {
    dayOfWeek?.setValidators([Validators.required]);
  } else {
    dayOfWeek?.clearValidators();
    dayOfWeek?.setValue('', { emitEvent: false });
  }

  if (needsDayOfMonth) {
    dayOfMonth?.setValidators([Validators.required, Validators.min(1), Validators.max(31)]);
    if (dayOfMonth?.value == null || dayOfMonth.value === '') {
      dayOfMonth?.setValue(1, { emitEvent: false });
    }
  } else {
    dayOfMonth?.clearValidators();
    dayOfMonth?.setValue(null, { emitEvent: false });
  }

  if (needsMonth) {
    month?.setValidators([Validators.required]);
  } else {
    month?.clearValidators();
    month?.setValue('', { emitEvent: false });
  }

  for (const control of [dayOfWeek, dayOfMonth, month]) {
    control?.updateValueAndValidity({ emitEvent: false });
  }
}

/** Form values the frequency fields produce. */
export interface FrequencyFormValue {
  intervalUnit: IntervalUnit;
  intervalCount: number | string;
  dayOfWeek?: DayOfWeek | '' | null;
  dayOfMonth?: number | string | null;
  month?: Month | '' | null;
}

/** Builds a frequency payload holding only the fields the selected unit allows. */
export function buildFrequencyPayload(value: FrequencyFormValue): FrequencyRequest {
  const unit = value.intervalUnit;
  const count = Number(value.intervalCount) || 1;
  const frequency: FrequencyRequest = { intervalUnit: unit, intervalCount: count };

  if (unit === 'WEEK' && value.dayOfWeek) {
    frequency.dayOfWeek = value.dayOfWeek;
  } else if (unit === 'MONTH') {
    frequency.dayOfMonth = Number(value.dayOfMonth);
    if (count > 1 && value.month) {
      frequency.month = value.month;
    }
  } else if (unit === 'YEAR') {
    frequency.dayOfMonth = Number(value.dayOfMonth);
    if (value.month) {
      frequency.month = value.month;
    }
  }
  return frequency;
}
