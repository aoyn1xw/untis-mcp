import { InvalidResponseError } from './errors.js';
import type {
  HomeworkAttachment,
  HomeworkResult,
  JsonValue,
  LessonStatus,
  Room,
  Subject,
  Teacher,
  TimetableEntry,
} from './domain.js';

const invalid = () => new InvalidResponseError();

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw invalid();
  return value as Record<string, unknown>;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw invalid();
  return value;
}

function integer(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) throw invalid();
  return value;
}

function text(value: unknown): string {
  if (typeof value !== 'string') throw invalid();
  return value;
}

function untisDate(value: unknown): string {
  const number = integer(value);
  const raw = String(number);
  if (!/^\d{8}$/.test(raw)) throw invalid();
  const [year, month, day] = [
    Number(raw.slice(0, 4)),
    Number(raw.slice(4, 6)),
    Number(raw.slice(6)),
  ];
  const checked = new Date(Date.UTC(year, month - 1, day));
  if (
    checked.getUTCFullYear() !== year ||
    checked.getUTCMonth() !== month - 1 ||
    checked.getUTCDate() !== day
  )
    throw invalid();
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6)}`;
}

function untisTime(value: unknown): string {
  const number = integer(value);
  if (number < 0 || number > 2359 || number % 100 > 59) throw invalid();
  return `${String(Math.floor(number / 100)).padStart(2, '0')}:${String(number % 100).padStart(2, '0')}`;
}

function entitySource(value: unknown): Record<string, unknown> {
  const outer = record(value);
  if (
    typeof outer.element === 'object' &&
    outer.element !== null &&
    !Array.isArray(outer.element)
  )
    return { ...outer, ...(outer.element as Record<string, unknown>) };
  return outer;
}

function entity(value: unknown): Teacher | Subject | Room {
  const source = entitySource(value);
  const name = source.name;
  const longName = source.longName ?? source.longname;
  if (typeof name !== 'string' || !name.trim()) throw invalid();
  if (longName !== undefined && typeof longName !== 'string') throw invalid();
  const id = source.id;
  if (id !== undefined && (typeof id !== 'number' || !Number.isInteger(id)))
    throw invalid();
  return {
    ...(id === undefined ? {} : { id }),
    name: name.trim(),
    ...(typeof longName === 'string' && longName.trim()
      ? { longName: longName.trim() }
      : {}),
  };
}

function entities<T extends Teacher | Subject | Room>(value: unknown): T[] {
  return array(value).map((item) => entity(item) as T);
}

function status(value: unknown): LessonStatus {
  if (value === undefined || value === null || value === '') return 'scheduled';
  if (value === 'cancelled' || value === 'irregular') return value;
  return 'unknown';
}

function json(value: unknown): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(json);
  const source = record(value);
  return Object.fromEntries(
    Object.entries(source).map(([key, child]) => [key, json(child)]),
  );
}

function attachment(value: unknown): HomeworkAttachment {
  return { metadata: json(record(value)) as Record<string, JsonValue> };
}

function normalizeTimetableEntry(value: unknown): TimetableEntry {
  const item = record(value);
  const id = integer(item.id);
  const lessonId = item.lessonId;
  if (
    lessonId !== undefined &&
    (typeof lessonId !== 'number' || !Number.isInteger(lessonId))
  )
    throw invalid();
  return {
    id,
    ...(lessonId === undefined ? {} : { lessonId }),
    date: untisDate(item.date),
    startTime: untisTime(item.startTime),
    endTime: untisTime(item.endTime),
    subjects: entities<Subject>(item.subjects ?? item.su ?? []),
    rooms: entities<Room>(item.rooms ?? item.ro ?? []),
    teachers: entities<Teacher>(item.teachers ?? item.te ?? []),
    status: status(item.lessonCode ?? item.code),
  };
}

export function normalizeTimetable(raw: unknown): TimetableEntry[] {
  return array(raw).map(normalizeTimetableEntry);
}

export function normalizeHomework(raw: unknown): HomeworkResult {
  const root = record(raw);
  return {
    records: array(root.records).map((value) => {
      const item = record(value);
      return {
        homeworkId: integer(item.homeworkId),
        teacherId: integer(item.teacherId),
        elementIds: array(item.elementIds).map(integer),
      };
    }),
    homeworks: array(root.homeworks).map((value) => {
      const item = record(value);
      if (typeof item.completed !== 'boolean') throw invalid();
      return {
        id: integer(item.id),
        lessonId: integer(item.lessonId),
        date: untisDate(item.date),
        dueDate: untisDate(item.dueDate),
        text: text(item.text),
        remark: text(item.remark),
        completed: item.completed,
        attachments: array(item.attachments).map(attachment),
      };
    }),
    teachers: array(root.teachers).map(entity),
    lessons: array(root.lessons).map((value) => {
      const item = record(value);
      return {
        id: integer(item.id),
        subject: { name: text(item.subject) },
        lessonType: text(item.lessonType),
      };
    }),
  };
}
