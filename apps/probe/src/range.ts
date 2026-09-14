import { z } from 'zod';
import type { ProbeDateRange } from '@untis-mcp/untis-client';

export const MAX_RANGE_DAYS = 31;

export function localDateText(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateRange(startText: string, endText: string): ProbeDateRange {
  const date = z.iso.date();
  const startIso = date.parse(startText);
  const endIso = date.parse(endText);
  const utcStart = Date.parse(`${startIso}T00:00:00Z`);
  const utcEnd = Date.parse(`${endIso}T00:00:00Z`);
  const calendarDays = Math.round((utcEnd - utcStart) / 86_400_000) + 1;
  if (calendarDays < 1 || calendarDays > MAX_RANGE_DAYS) {
    throw new Error(`Date range must be 1-${MAX_RANGE_DAYS} days`);
  }
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T23:59:59`);
  return { start, end };
}
