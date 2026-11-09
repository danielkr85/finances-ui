import { AbstractControl } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage, isApiError } from '../models/api-error.model';

/** Error key for messages the server attached to a field. Cleared automatically when the value changes. */
export const SERVER_ERROR = 'server';

/**
 * Shows a failed save on the form: validation messages from the server (`fields`) go onto the matching controls
 * (as `errors.server`), and the returned text is for the form's alert. `aliases` maps server field names to
 * control paths when they differ, e.g. { frequency: 'frequency.intervalUnit' }.
 */
export function applyServerErrors(
  form: AbstractControl,
  err: unknown,
  fallback: string,
  aliases: Record<string, string> = {}
): string {
  if (!(err instanceof HttpErrorResponse) || !isApiError(err.error) || !err.error.fields?.length) {
    return apiErrorMessage(err, fallback);
  }
  const unmatched: string[] = [];
  for (const { field, message } of err.error.fields) {
    const control = form.get(aliases[field] ?? field);
    if (control) {
      control.setErrors({ ...control.errors, [SERVER_ERROR]: message });
      control.markAsTouched();
    } else {
      unmatched.push(message);
    }
  }
  return unmatched.length ? unmatched.join(' ') : 'Please fix the highlighted fields.';
}

/** The server's message for a control, if any. */
export function serverError(control: AbstractControl | null): string | null {
  return (control?.errors?.[SERVER_ERROR] as string | undefined) ?? null;
}
