import type { WebUntisDomainApi } from '@untis-mcp/untis-client';
import {
  normalizeTimetableEntries,
  type TimetableResult,
} from './normalize.js';
import { validateTimetableRange } from './range.js';

export const DEFAULT_TIMETABLE_TIMEOUT_MS = 15_000;
export type TimetableInput = {
  start_date?: string | undefined;
  end_date?: string | undefined;
};

function safeServiceError(error: unknown): Error {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('unsupported timetable response'))
    return new Error('Unsupported timetable response');
  if (message.includes('invalid webuntis response'))
    return new Error('Invalid WebUntis response');
  if (/unauthorized|authentication/.test(message))
    return new Error('Authentication failed');
  if (/forbidden|permission denied/.test(message))
    return new Error('Permission denied');
  if (/timeout|timed out/.test(message))
    return new Error('WebUntis request timed out');
  return new Error('WebUntis request failed');
}

export class TimetableService {
  private tail: Promise<void> = Promise.resolve();
  constructor(
    private readonly client: Pick<WebUntisDomainApi, 'getTimetable'>,
    private readonly timeoutMs = DEFAULT_TIMETABLE_TIMEOUT_MS,
    private readonly now: () => Date = () => new Date(),
  ) {}

  getTimetable(input: TimetableInput): Promise<TimetableResult> {
    const range = validateTimetableRange(input, this.now());
    const operation = this.tail.then(() => this.run(range));
    this.tail = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  private async run(
    range: ReturnType<typeof validateTimetableRange>,
  ): Promise<TimetableResult> {
    try {
      const entries = await this.bounded(
        this.client.getTimetable(range.adapterRange, {
          timeoutMs: this.timeoutMs,
        }),
      );
      return normalizeTimetableEntries(entries, range.startDate, range.endDate);
    } catch (error) {
      throw safeServiceError(error);
    }
  }

  private async bounded<T>(operation: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('timeout')),
            this.timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
