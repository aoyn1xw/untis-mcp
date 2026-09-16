import { describe, expect, it } from 'vitest';
import { sanitize, SAFE_SCHEMA_KEYS, isSafeSchemaKey } from './index.js';

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
        students: [{ name: secrets[2], email: secrets[3] }],
        items: [{ authorization: secrets[4], unknownNewField: secrets[5] }],
      }),
    );
    for (const secret of secrets) expect(output).not.toContain(secret);
    expect(output).not.toContain('sid=x');
  });

  it('preserves shape, nullability, length and stable relationships', () => {
    const output = sanitize({
      status: 'cancelled',
      lessons: [null, { id: 42 }, { id: 42 }],
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

  it('preserves known safe schema keys in report structures', () => {
    const safeKeys = [
      'lessons',
      'teachers',
      'subjects',
      'rooms',
      'assignedStudents',
      'absences',
      'incomingMessages',
      'startTime',
      'endTime',
      'date',
    ];
    const input: Record<string, unknown> = {};
    for (const k of safeKeys) input[k] = 'val';
    const output = JSON.stringify(sanitize(input));
    for (const k of safeKeys) {
      expect(output).toContain(`"${k}"`);
    }
  });

  it('preserves the structural type of Date values without their value', () => {
    const output = sanitize({ startDate: new Date('2026-01-01T00:00:00Z') });
    expect(output).toEqual({
      type: 'object',
      fields: {
        type: 'fields',
        startDate: { type: 'date' },
      },
    });
    expect(JSON.stringify(output)).not.toContain('2026-01-01');
  });

  it('pseudonymizes dynamic, sensitive, numeric, and prototype keys', () => {
    const adversarialKeys = [
      'ada@example.test',
      'private_notes.pdf',
      'John Doe',
      '12345',
      'bearer_token',
      '__proto__',
      'constructor',
      'prototype',
    ];
    const input: Record<string, unknown> = {};
    for (const key of adversarialKeys) {
      input[key] = { value: 'private' };
    }
    const output = JSON.stringify(sanitize(input));
    for (const key of adversarialKeys) {
      expect(output).not.toContain(`"${key}"`);
    }
    // All generated pseudonyms must use only letter characters (a-p)
    const matches = output.match(/ref_[a-p]{12}/g) ?? [];
    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) {
      expect(match).toMatch(/^ref_[a-p]{12}$/);
      expect(match).not.toMatch(/[0-9]/);
    }
  });

  it('isSafeSchemaKey strictly denies prototype keys and arbitrary strings', () => {
    expect(isSafeSchemaKey('__proto__')).toBe(false);
    expect(isSafeSchemaKey('constructor')).toBe(false);
    expect(isSafeSchemaKey('prototype')).toBe(false);
    expect(isSafeSchemaKey('lessons')).toBe(true);
    expect(isSafeSchemaKey('teachers')).toBe(true);
    expect(isSafeSchemaKey('some_random_key')).toBe(false);
    expect(SAFE_SCHEMA_KEYS.size).toBeGreaterThan(50);
  });
});
