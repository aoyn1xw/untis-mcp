import { expect, it } from 'vitest';
import { safeError } from './errors.js';

it('does not reflect credentials from errors', () => {
  expect(
    safeError(new Error('request with key SUPERSECRET failed')).message,
  ).toBe('WebUntis request failed');
});

it.each([
  [401, 'unauthorized'],
  [403, 'forbidden'],
])('preserves safe HTTP status %i', (status, message) => {
  expect(safeError({ response: { status, data: 'PRIVATE' } }).message).toBe(
    message,
  );
});
