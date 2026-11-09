import { Pipe, PipeTransform } from '@angular/core';

const DOLLARS = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/**
 * Formats the API's whole-dollar amounts: 1500 → "$1,500", -20 → "-$20".
 * With `signed`, positive values get a "+" (for balance changes).
 */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined, signed = false): string {
    if (value === null || value === undefined) {
      return '';
    }
    const text = DOLLARS.format(value);
    return signed && value > 0 ? `+${text}` : text;
  }
}
