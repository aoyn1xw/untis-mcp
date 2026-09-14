import { describe, expect, it } from 'vitest';
import { normalizeServerHost } from './server.js';

describe('normalizeServerHost', () => {
  it.each([
    ['school.webuntis.com', 'school.webuntis.com'],
    ['HTTPS://School.WebUntis.Com', 'school.webuntis.com'],
    ['  https://school.webuntis.com/  ', 'school.webuntis.com'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeServerHost(input)).toBe(expected);
  });

  it.each([
    '',
    'http://school.webuntis.com',
    'ftp://school.webuntis.com',
    'https://user:pass@school.webuntis.com',
    'https://school.webuntis.com/path',
    'https://school.webuntis.com?secret=x',
    'https://school.webuntis.com/#fragment',
    'https://school.webuntis.com:8443',
    'not a host',
  ])('rejects unsupported input without reflecting it: %s', (input) => {
    expect(() => normalizeServerHost(input)).toThrow('Invalid WebUntis server');
  });
});
