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
  it('preserves shape, nullability, length and stable relationships', () => {
    const output = sanitize({
      status: 'cancelled',
      values: [null, { id: 42 }, { id: 42 }],
      mystery: 'private',
    });
    const text = JSON.stringify(output);
    expect(text).not.toContain('cancelled');
    expect(text).toContain('"length":3');
    const relationships = [
      ...text.matchAll(/"relationship":"(ref_[a-p]{12})"/g),
    ];
    expect(relationships[0]?.[1]).toBe(relationships[1]?.[1]);
    expect(text).not.toContain('private');
    expect(text).not.toContain('42');
  });

  it('never copies unknown scalar values or sensitive-looking classifications', () => {
    expect(sanitize(true)).toEqual({ type: 'boolean' });
    expect(sanitize(false)).toEqual({ type: 'boolean' });
    const output = JSON.stringify(
      sanitize({
        unknownBoolean: true,
        unknownNumber: 8675309,
        unknownString: 'PRIVATE_VALUE',
        status: 'student-needs-counselling',
        state: 'ABSENT_WITH_PRIVATE_REASON',
        code: 'SECRET_DISCIPLINE_CODE',
      }),
    );
    for (const value of [
      '8675309',
      'PRIVATE_VALUE',
      'student-needs-counselling',
      'ABSENT_WITH_PRIVATE_REASON',
      'SECRET_DISCIPLINE_CODE',
    ]) {
      expect(output).not.toContain(value);
    }
  });

  it('pseudonymizes dynamic object keys while preserving relationships', () => {
    const output = JSON.stringify(
      sanitize({
        'ada@example.test': { filename: 'private.pdf' },
        nested: { 'ada@example.test': true },
      }),
    );
    for (const key of ['ada@example.test', 'nested', 'filename'])
      expect(output).not.toContain(key);
    const references = output.match(/ref_[a-p]{12}/g) ?? [];
    expect(
      references.filter((reference) => reference === references[0]),
    ).toHaveLength(2);
  });
});
