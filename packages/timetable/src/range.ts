import { z } from 'zod';
import type { ProbeDateRange } from '@untis-mcp/untis-client';

export const MAX_RANGE_DATES = 31;
const strictDate = z.iso.date();

export interface TimetableRange {
  startDate: string;
  endDate: string;
  adapterRange: ProbeDateRange;
}

function localDate(text: string, end: boolean): Date {
  const [year, month, day] = text.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(
    year,
    month - 1,
    day,
    end ? 23 : 0,
    end ? 59 : 0,
    end ? 59 : 0,
    end ? 999 : 0,
  );
}

export function localDateText(date: Date): string {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function validateTimetableRange(
  input: {
    start_date?: string | undefined;
    end_date?: string | undefined;
  },
  now: Date = new Date(),
): TimetableRange {
  const fallback = localDateText(now);
  const startDate = strictDate.parse(
    input.start_date ?? input.end_date ?? fallback,
  );
  const endDate = strictDate.parse(
    input.end_date ?? input.start_date ?? fallback,
  );
  const [sy, sm, sd] = startDate.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  const [ey, em, ed] = endDate.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  const days =
    Math.round(
      (Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86_400_000,
    ) + 1;
  if (days < 1 || days > MAX_RANGE_DATES)
    throw new Error(
      `Date range must contain 1-${MAX_RANGE_DATES} calendar dates`,
    );
  return {
    startDate,
    endDate,
    adapterRange: {
      start: localDate(startDate, false),
      end: localDate(endDate, true),
    },
  };
}
