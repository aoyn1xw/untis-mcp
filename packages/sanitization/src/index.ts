import { createHash } from 'node:crypto';

export type Sanitized =
  null | boolean | { type: string; [key: string]: Sanitized | number | string };

const IDENTIFIER_FIELDS = /^(id|.*Id|.*Ids|key|orgid|orgId|schoolNumber)$/i;

const FORBIDDEN_OBJECT_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

/**
 * Allowlist of known-safe WebUntis schema properties and envelope metadata.
 *
 * Tradeoff:
 * Known structural field names are preserved so the probe report reveals which API
 * fields and collections the connected school supports. Unrecognized, user-controlled,
 * or dynamic dictionary keys (e.g. emails, filenames, display names, IDs, tokens)
 * are denied by default and pseudonymized with a letter-only digest to prevent leakage.
 */
export const SAFE_SCHEMA_KEYS: ReadonlySet<string> = new Set([
  // Core timetable & lesson fields
  'id',
  'date',
  'startTime',
  'endTime',
  'kl',
  'te',
  'su',
  'ro',
  'lstext',
  'lsnumber',
  'activityType',
  'code',
  'info',
  'substText',
  'statflags',
  'sg',
  'bkRemark',
  'bkText',
  'classes',
  'teachers',
  'subjects',
  'rooms',
  'students',
  'elements',
  'lessonId',
  'lessonNumber',
  'lessonCode',
  'lessonText',
  'periodText',
  'hasPeriodText',
  'periodInfo',
  'periodAttachments',
  'studentGroup',
  'hasInfo',
  'cellState',
  'priority',
  'is',
  'roomCapacity',
  'studentCount',
  'roomSubstitution',
  'substitution',
  'standard',
  'event',
  'lessons',

  // Master data & element descriptors
  'name',
  'longName',
  'longname',
  'orgname',
  'orgid',
  'orgId',
  'displayname',
  'alternatename',
  'alternateName',
  'canViewTimetable',
  'externalKey',
  'type',
  'missing',
  'state',
  'gender',
  'foreName',
  'foreColor',
  'backColor',
  'active',
  'did',
  'teacher1',
  'teacher2',

  // Exams
  'exams',
  'examType',
  'studentClass',
  'assignedStudents',
  'klasse',
  'examDate',
  'grade',
  'text',

  // Homework
  'homework',
  'attachments',
  'completed',
  'dueDate',
  'remark',

  // Absences
  'absences',
  'absenceReasons',
  'excuseStatuses',
  'showAbsenceReasonChange',
  'showCreateAbsence',
  'startDate',
  'endDate',
  'createDate',
  'lastUpdate',
  'createdUser',
  'updatedUser',
  'reasonId',
  'reason',
  'interruptions',
  'canEdit',
  'studentName',
  'excuseStatus',
  'isExcused',
  'excuse',
  'excuseDate',
  'userId',
  'username',

  // Inbox & communications
  'inbox',
  'incomingMessages',
  'allowMessageDeletion',
  'contentPreview',
  'hasAttachments',
  'isMessageRead',
  'isReply',
  'isReplyAllowed',
  'sender',
  'sentDateTime',
  'subject',
  'displayName',
  'imageUrl',
  'className',

  // Holidays, time grid & school years
  'holidays',
  'schoolYears',
  'schoolyears',
  'timegrid',
  'timeUnits',
  'day',
  'messagesOfDay',
  'isExpanded',
  'systemMessage',
  'rssUrl',

  // Generic envelope / fixture metadata
  'count',
  'total',
  'items',
  'records',
  'data',
  'result',
  'error',
  'status',
  'success',
  'message',
  'structure',
  'lessonFields',
]);

export function isSafeSchemaKey(key: string): boolean {
  if (FORBIDDEN_OBJECT_KEYS.has(key)) return false;
  return SAFE_SCHEMA_KEYS.has(key);
}

export function pseudonym(value: string | number, salt: string): string {
  const digest = createHash('sha256')
    .update(`${salt}:${String(value)}`)
    .digest('hex')
    .slice(0, 12);
  // Letter-only output (disjoint alphabet a-p) cannot accidentally reproduce a sensitive numeric ID.
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
      // Allowlist safe schema property names; pseudonymize dynamic or unrecognized keys.
      const sanitizedKey = isSafeSchemaKey(key) ? key : pseudonym(key, salt);
      fields[sanitizedKey] = sanitize(child, salt, key);
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
