import { describe, expect, it } from 'vitest';
import { dateRange, localDateText } from './range.js';

describe('dateRange', () => {
  it('accepts bounded date ranges', () => {
    const range = dateRange('2026-01-01', '2026-01-31');
    expect(range.start.getFullYear()).toBe(2026);
    expect(range.start.getHours()).toBe(0);
    expect(range.end.getHours()).toBe(23);
  });

  it('accepts a single-day range', () => {
    expect(dateRange('2026-05-01', '2026-05-01')).toBeTruthy();
  });

  it('accepts a 31-day range spanning the fall DST transition', () => {
    // 2026-10-15 to 2026-11-14 spans November 1st fallback DST in America/New_York
    const range = dateRange('2026-10-15', '2026-11-14');
    expect(range).toBeTruthy();
  });

  it.each([
    ['2026-01-31', '2026-01-01'],
    ['2026-01-01', '2026-02-01'],
    ['invalid', '2026-01-01'],
  ])('rejects reversed, excessive, or malformed ranges: %s to %s', (a, b) => {
    expect(() => dateRange(a, b)).toThrow();
  });

  it('reports the required format for malformed dates', () => {
    expect(() => dateRange('2026/01/01', '2026-01-02')).toThrow(
      'Date range must use YYYY-MM-DD',
    );
  });

  it('formats dates from local calendar components', () => {
    const date = new Date(2026, 8, 7, 23, 30);
    expect(localDateText(date)).toBe('2026-09-07');
  });
});
