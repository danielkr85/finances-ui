import { FormBuilder } from '@angular/forms';
import { buildFrequencyPayload, updateFrequencyFieldRequirements } from './frequency.model';

/** The server rejects any field the unit doesn't take, so payloads must hold exactly the right ones. */
describe('buildFrequencyPayload', () => {
  const base = { intervalCount: 1, dayOfWeek: 'FRIDAY', dayOfMonth: 15, month: 'MARCH' } as const;

  it('DAY sends only the unit and count', () => {
    expect(buildFrequencyPayload({ ...base, intervalUnit: 'DAY', intervalCount: '2' }))
      .toEqual({ intervalUnit: 'DAY', intervalCount: 2 });
  });

  it('WEEK sends the weekday', () => {
    expect(buildFrequencyPayload({ ...base, intervalUnit: 'WEEK', intervalCount: 2 }))
      .toEqual({ intervalUnit: 'WEEK', intervalCount: 2, dayOfWeek: 'FRIDAY' });
  });

  it('monthly sends only the day of month', () => {
    expect(buildFrequencyPayload({ ...base, intervalUnit: 'MONTH' }))
      .toEqual({ intervalUnit: 'MONTH', intervalCount: 1, dayOfMonth: 15 });
  });

  it('every N months also sends the anchor month', () => {
    expect(buildFrequencyPayload({ ...base, intervalUnit: 'MONTH', intervalCount: 3 }))
      .toEqual({ intervalUnit: 'MONTH', intervalCount: 3, dayOfMonth: 15, month: 'MARCH' });
  });

  it('YEAR sends month and day of month', () => {
    expect(buildFrequencyPayload({ ...base, intervalUnit: 'YEAR', dayOfMonth: '30', month: 'APRIL' }))
      .toEqual({ intervalUnit: 'YEAR', intervalCount: 1, dayOfMonth: 30, month: 'APRIL' });
  });
});

describe('updateFrequencyFieldRequirements', () => {
  const form = () => new FormBuilder().group({
    intervalUnit: ['MONTH'], intervalCount: [1], dayOfWeek: [''], dayOfMonth: [null as number | null], month: ['']
  });

  it('requires the anchor month only for every N months', () => {
    const f = form();
    updateFrequencyFieldRequirements(f);
    expect(f.valid).toBe(true);
    expect(f.value.dayOfMonth).toBe(1);

    f.patchValue({ intervalCount: 3 }, { emitEvent: false });
    updateFrequencyFieldRequirements(f);
    expect(f.controls.month.hasError('required')).toBe(true);
  });

  it('requires a weekday for WEEK and clears the monthly fields', () => {
    const f = form();
    f.patchValue({ intervalUnit: 'WEEK', dayOfMonth: 15, month: 'MARCH' }, { emitEvent: false });
    updateFrequencyFieldRequirements(f);
    expect(f.controls.dayOfWeek.hasError('required')).toBe(true);
    expect(f.value.dayOfMonth).toBeNull();
    expect(f.value.month).toBe('');
  });
});
