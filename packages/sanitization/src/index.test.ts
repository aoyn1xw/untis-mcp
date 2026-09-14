import { describe, expect, it } from 'vitest';
import { sanitize } from './index.js';

describe('sanitize', () => {
  it('never emits secrets or personal values, including nested arrays', () => {
    const secrets = [
      'hunter2',
      'TOTPSECRET',
      'Ada Lovelace',
      'ada@example.test',
      'jwt.payload.sig',
      'free text',
    ];
    const output = JSON.stringify(
      sanitize({
        password: secrets[0],
        key: secrets[1],
        cookie: 'sid=x',
        student: { name: secrets[2], email: secrets[3] },
        items: [{ authorization: secrets[4], unknownNewField: secrets[5] }],
      }),
    );
    for (const secret of secrets) expect(output).not.toContain(secret);
    expect(output).not.toContain('sid=x');
  });
  it('preserves shape, nullability, length, safe status and stable relationships', () => {
    const output = sanitize({
      status: 'cancelled',
      values: [null, { id: 42 }, { id: 42 }],
      mystery: 'private',
    });
    const text = JSON.stringify(output);
    expect(text).toContain('cancelled');
    expect(text).toContain('"length":3');
    expect(text.match(/ref_[a-f0-9]{12}/g)?.[0]).toBe(
      text.match(/ref_[a-f0-9]{12}/g)?.[1],
    );
    expect(text).not.toContain('private');
    expect(text).not.toContain('42');
  });
});
