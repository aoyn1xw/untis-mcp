import { expect, it } from 'vitest';
import { dateRange, localDateText } from './range.js';

it('accepts bounded date ranges', () =>
  expect(dateRange('2026-01-01', '2026-01-31')).toBeTruthy());
it.each([
  ['2026-01-31', '2026-01-01'],
  ['2026-01-01', '2026-02-01'],
])('rejects reversed or excessive ranges', (a, b) =>
  expect(() => dateRange(a, b)).toThrow(),
);

it('formats dates from local calendar components', () => {
  const date = new Date(2026, 8, 7, 23, 30);
  expect(localDateText(date)).toBe('2026-09-07');
});
