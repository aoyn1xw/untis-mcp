import type { TimetableEntry } from '@untis-mcp/untis-client';

export type LessonStatus = 'scheduled' | 'cancelled' | 'irregular' | 'unknown';
export interface TimetableLesson {
  date: string;
  startTime: string;
  endTime: string;
  subjects: string[];
  rooms: string[];
  status: LessonStatus;
}
export interface TimetableResult {
  startDate: string;
  endDate: string;
  count: number;
  lessons: TimetableLesson[];
}

const unsupported = () => new Error('Unsupported timetable response');
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw unsupported();
  return value as Record<string, unknown>;
}
function date(value: unknown): string {
  if (!Number.isInteger(value) || typeof value !== 'number')
    throw unsupported();
  const text = String(value);
  if (!/^\d{8}$/.test(text)) throw unsupported();
  const formatted = `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6)}`;
  const [y, m, d] = [
    Number(text.slice(0, 4)),
    Number(text.slice(4, 6)),
    Number(text.slice(6)),
  ];
  const checked = new Date(Date.UTC(y, m - 1, d));
  if (
    checked.getUTCFullYear() !== y ||
    checked.getUTCMonth() !== m - 1 ||
    checked.getUTCDate() !== d
  )
    throw unsupported();
  return formatted;
}
function time(value: unknown): string {
  if (
    !Number.isInteger(value) ||
    typeof value !== 'number' ||
    value < 0 ||
    value > 2359 ||
    value % 100 > 59
  )
    throw unsupported();
  return `${String(Math.floor(value / 100)).padStart(2, '0')}:${String(value % 100).padStart(2, '0')}`;
}
function displays(value: unknown): string[] {
  if (!Array.isArray(value)) throw unsupported();
  return value.map((item) => {
    const entity = record(item);
    const candidate =
      typeof entity.longname === 'string' && entity.longname.trim()
        ? entity.longname
        : entity.name;
    if (typeof candidate !== 'string' || !candidate.trim()) throw unsupported();
    return candidate.trim();
  });
}
function status(value: unknown): LessonStatus {
  if (value === undefined || value === null || value === '') return 'scheduled';
  if (value === 'cancelled' || value === 'irregular') return value;
  return 'unknown';
}
export function normalizeLegacyTimetable(
  raw: unknown,
  startDate: string,
  endDate: string,
): TimetableResult {
  if (!Array.isArray(raw)) throw unsupported();
  const lessons = raw
    .map((value): TimetableLesson => {
      const lesson = record(value);
      const lessonDate = date(lesson.date);
      if (lessonDate < startDate || lessonDate > endDate) throw unsupported();
      return {
        date: lessonDate,
        startTime: time(lesson.startTime),
        endTime: time(lesson.endTime),
        subjects: displays(lesson.su),
        rooms: displays(lesson.ro),
        status: status(lesson.code),
      };
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.startTime.localeCompare(b.startTime) ||
        a.endTime.localeCompare(b.endTime),
    );
  return { startDate, endDate, count: lessons.length, lessons };
}

function stableDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw unsupported();
  const [year, month, day] = value.split('-').map(Number);
  const checked = new Date(Date.UTC(year!, month! - 1, day));
  if (
    checked.getUTCFullYear() !== year ||
    checked.getUTCMonth() !== month! - 1 ||
    checked.getUTCDate() !== day
  )
    throw unsupported();
  return value;
}

function stableTime(value: string): string {
  if (!/^\d{2}:\d{2}$/.test(value)) throw unsupported();
  const [hour, minute] = value.split(':').map(Number);
  if (hour! > 23 || minute! > 59) throw unsupported();
  return value;
}

function entityNames(
  values: ReadonlyArray<{ name: string; longName?: string | undefined }>,
): string[] {
  return values.map((value) => (value.longName || value.name).trim());
}

export function normalizeTimetableEntries(
  entries: TimetableEntry[],
  startDate: string,
  endDate: string,
): TimetableResult {
  if (!Array.isArray(entries)) throw unsupported();
  const lessons = entries
    .map((entry): TimetableLesson => {
      const lessonDate = stableDate(entry.date);
      if (lessonDate < startDate || lessonDate > endDate) throw unsupported();
      return {
        date: lessonDate,
        startTime: stableTime(entry.startTime),
        endTime: stableTime(entry.endTime),
        subjects: entityNames(entry.subjects),
        rooms: entityNames(entry.rooms),
        status: entry.status,
      };
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.startTime.localeCompare(b.startTime) ||
        a.endTime.localeCompare(b.endTime),
    );
  return { startDate, endDate, count: lessons.length, lessons };
}
