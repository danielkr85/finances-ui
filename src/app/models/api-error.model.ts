import { HttpErrorResponse } from '@angular/common/http';

export interface ApiFieldError {
  field: string;
  message: string;
}

/** The error body every finances-service endpoint returns. */
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  /** Human-readable; safe to show to the user. */
  message: string;
  path: string;
  /** Only present on validation errors (400). */
  fields?: ApiFieldError[];
}

export function isApiError(body: unknown): body is ApiError {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as ApiError).message === 'string' &&
    typeof (body as ApiError).status === 'number'
  );
}

/** A message to show the user for a failed API call. */
export function apiErrorMessage(
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return "Can't reach the server. Check your connection and try again.";
    }
    if (isApiError(err.error)) {
      return err.error.message;
    }
  }
  return fallback;
}
