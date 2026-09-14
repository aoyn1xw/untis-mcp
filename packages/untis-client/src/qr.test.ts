import { describe, expect, it } from 'vitest';
import { parseQrProfile } from './qr.js';

describe('parseQrProfile', () => {
  it('parses and decodes a valid profile', () => {
    expect(
      parseQrProfile(
        'untis://setschool?url=school.example&school=Demo%20School&user=ada&key=ABC&schoolNumber=7',
      ),
    ).toEqual({
      url: 'school.example',
      school: 'Demo School',
      user: 'ada',
      key: 'ABC',
      schoolNumber: '7',
    });
  });
  it.each([
    '',
    'https://example.test',
    'untis://setschool?school=x',
    'untis://other?url=x&school=x&user=x&key=x',
  ])('rejects malformed input without reflecting it: %s', (input) => {
    expect(() => parseQrProfile(input)).toThrow('Invalid WebUntis QR profile');
  });
});
