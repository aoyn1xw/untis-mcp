import { createHash } from 'node:crypto';

export type Sanitized =
  null | boolean | { type: string; [key: string]: Sanitized | number | string };

const IDENTIFIER_FIELDS = /^(id|.*Id|.*Ids|key|orgid|orgId|schoolNumber)$/i;

function pseudonym(value: string | number, salt: string): string {
  const digest = createHash('sha256')
    .update(`${salt}:${String(value)}`)
    .digest('hex')
    .slice(0, 12);
  // Letter-only output cannot accidentally reproduce a sensitive numeric ID.
  return `ref_${[...digest]
    .map((character) =>
      String.fromCharCode('a'.charCodeAt(0) + Number.parseInt(character, 16)),
    )
    .join('')}`;
}

/** Produces structural metadata. Values are denied by default, not copied. */
export function sanitize(
  value: unknown,
  salt = 'local-report',
  field = '',
): Sanitized {
  if (value === null) return null;
  if (Array.isArray(value)) {
    const examples = value
      .slice(0, 3)
      .map((item) => sanitize(item, salt, field));
    return {
      type: 'array',
      length: value.length,
      examples: {
        type: 'examples',
        ...Object.fromEntries(examples.map((item, i) => [String(i), item])),
      },
    };
  }
  if (typeof value === 'object') {
    const fields: Record<string, Sanitized> = {};
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      // Dictionary keys can themselves contain names, addresses, or filenames.
      fields[pseudonym(key, salt)] = sanitize(child, salt, key);
    }
    return { type: 'object', fields: { type: 'fields', ...fields } };
  }
  if (
    IDENTIFIER_FIELDS.test(field) &&
    (typeof value === 'number' || typeof value === 'string')
  ) {
    return { type: typeof value, relationship: pseudonym(value, salt) };
  }
  if (typeof value === 'string') {
    return { type: 'string', redacted: true };
  }
  if (typeof value === 'number') return { type: 'number' };
  if (typeof value === 'boolean') return { type: 'boolean' };
  return { type: typeof value };
}
