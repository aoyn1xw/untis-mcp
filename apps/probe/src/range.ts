import { z } from 'zod';
import type { ProbeDateRange } from '@untis-mcp/untis-client';

export const MAX_RANGE_DAYS = 31;

export function dateRange(startText: string, endText: string): ProbeDateRange {
  const date = z.iso.date();
  const start = new Date(`${date.parse(startText)}T00:00:00`);
  const end = new Date(`${date.parse(endText)}T23:59:59`);
  const days = (end.getTime() - start.getTime()) / 86_400_000;
  if (days < 0 || days >= MAX_RANGE_DAYS)
    throw new Error(`Date range must be 1-${MAX_RANGE_DAYS} days`);
  return { start, end };
}
