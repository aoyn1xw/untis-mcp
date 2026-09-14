import { describe, expect, it } from 'vitest';
import { safeError } from './errors.js';

describe('safeError', () => {
  it('does not reflect credentials from errors', () => {
    expect(
      safeError(new Error('request with key SUPERSECRET failed')).message,
    ).toBe('WebUntis request failed');
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
  ])(
    'preserves safe HTTP status %i from response object',
    (status, message) => {
      expect(
        safeError({
          response: { status, data: { user: 'secret', token: 'jwt' } },
          config: { url: 'https://secret.untis.com' },
        }).message,
      ).toBe(message);
    },
  );

  it.each([
    ['Request failed with status code 401', 'unauthorized'],
    ['Request failed with status code 403', 'forbidden'],
    ['403 Forbidden', 'forbidden'],
    ['401 Unauthorized', 'unauthorized'],
  ])(
    'extracts 401/403 status from error message string: "%s"',
    (rawMessage, expected) => {
      const error = safeError(new Error(rawMessage));
      expect(error.message).toBe(expected);
    },
  );

  it('maps 500 or unknown errors to generic message without leaking internals', () => {
    const err = safeError({
      message: 'Request failed with status code 500',
      response: { status: 500, data: 'SQL Syntax error near SECRET' },
    });
    expect(err.message).toBe('WebUntis request failed');
  });

  it('preserves timeout errors safely', () => {
    expect(safeError(new Error('timeout of 15000ms exceeded')).message).toBe(
      'timeout',
    );
    expect(safeError(new Error('connection timed out')).message).toBe(
      'timed out',
    );
  });
});
