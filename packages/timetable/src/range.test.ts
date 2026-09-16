import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateTimetableRange } from './range.js';

afterEach(() => vi.useRealTimers());
describe('validateTimetableRange', () => {
  it('defaults to the controlled current local day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 16, 12));
    expect(validateTimetableRange({})).toMatchObject({
      startDate: '2026-09-16',
      endDate: '2026-09-16',
    });
  });
  it('treats either supplied endpoint as a single date', () => {
    expect(validateTimetableRange({ start_date: '2026-09-16' })).toMatchObject({
      startDate: '2026-09-16',
      endDate: '2026-09-16',
    });
    expect(validateTimetableRange({ end_date: '2026-09-17' })).toMatchObject({
      startDate: '2026-09-17',
      endDate: '2026-09-17',
    });
  });
  it('accepts 31 dates and a DST crossing independently of elapsed hours', () => {
    expect(
      validateTimetableRange({
        start_date: '2026-03-08',
        end_date: '2026-04-07',
      }).endDate,
    ).toBe('2026-04-07');
  });
  it.each([
    [{ start_date: '2026-01-01', end_date: '2026-02-01' }],
    [{ start_date: '2026-09-17', end_date: '2026-09-16' }],
    [{ start_date: '2026-02-30' }],
    [{ start_date: '16-09-2026' }],
  ])('rejects invalid range %#', (input) =>
    expect(() => validateTimetableRange(input)).toThrow(),
  );
});
