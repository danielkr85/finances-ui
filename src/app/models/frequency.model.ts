import { FormGroup, Validators } from '@angular/forms';

export type IntervalUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

export interface Frequency {
    id?: number;
    intervalUnit: IntervalUnit;
    intervalCount: number;
    dayOfWeek?: string;
    dayOfMonth?: number;
    month?: string;
    customExpression?: string;
    description?: string;
    intervalType?: string;
}

export interface FrequencyOption {
    value: string;
    label: string;
}

export const INTERVAL_UNITS: { value: IntervalUnit; label: string }[] = [
    { value: 'DAY', label: 'Daily' },
    { value: 'WEEK', label: 'Weekly' },
    { value: 'MONTH', label: 'Monthly' },
    { value: 'YEAR', label: 'Yearly' },
    { value: 'CUSTOM', label: 'Custom' }
];

export const DAYS_OF_WEEK: FrequencyOption[] = [
    { value: 'MONDAY', label: 'Monday' },
    { value: 'TUESDAY', label: 'Tuesday' },
    { value: 'WEDNESDAY', label: 'Wednesday' },
    { value: 'THURSDAY', label: 'Thursday' },
    { value: 'FRIDAY', label: 'Friday' },
    { value: 'SATURDAY', label: 'Saturday' },
    { value: 'SUNDAY', label: 'Sunday' }
];

export const MONTHS_OF_YEAR: FrequencyOption[] = [
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

/**
 * Maps legacy intervalType values (DAILY, WEEKLY, BI_WEEKLY, etc.)
 * to the new intervalUnit + intervalCount architecture.
 */
export function mapLegacyIntervalType(oldType?: string): { intervalUnit: IntervalUnit; intervalCount: number } {
    switch (oldType) {
        case 'DAILY': return { intervalUnit: 'DAY', intervalCount: 1 };
        case 'WEEKLY': return { intervalUnit: 'WEEK', intervalCount: 1 };
        case 'BI_WEEKLY': return { intervalUnit: 'WEEK', intervalCount: 2 };
        case 'MONTHLY': return { intervalUnit: 'MONTH', intervalCount: 1 };
        case 'QUARTERLY': return { intervalUnit: 'MONTH', intervalCount: 3 };
        case 'SEMI_ANNUALLY': return { intervalUnit: 'MONTH', intervalCount: 6 };
        case 'YEARLY': return { intervalUnit: 'YEAR', intervalCount: 1 };
        case 'CUSTOM': return { intervalUnit: 'CUSTOM', intervalCount: 1 };
        default: return { intervalUnit: 'MONTH', intervalCount: 1 };
    }
}

/**
 * Updates dynamic cross-field validation rules matching backend constraints.
 */
export function updateFrequencyFieldRequirements(form: FormGroup): void {
    const unit = form.get('intervalUnit')?.value;
    const count = Number(form.get('intervalCount')?.value) || 1;

    const dayOfWeekControl = form.get('dayOfWeek');
    const dayOfMonthControl = form.get('dayOfMonth');
    const monthControl = form.get('month');
    const customExpressionControl = form.get('customExpression');

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

/**
 * Builds clean frequency object for API request payloads.
 */
export function buildFrequencyPayload(formVal: any): Frequency {
    const unit: IntervalUnit = formVal.intervalUnit;
    const count = Number(formVal.intervalCount) || 1;

    const frequency: Frequency = {
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

    return frequency;
}
