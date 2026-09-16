import type { TimetableAdapter } from '@untis-mcp/untis-client';
import { normalizeLegacyTimetable, type TimetableResult } from './normalize.js';
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
    private readonly adapter: TimetableAdapter,
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
      return await this.session(range);
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

  private async session(
    range: ReturnType<typeof validateTimetableRange>,
  ): Promise<TimetableResult> {
    const options = { timeoutMs: this.timeoutMs };
    try {
      await this.bounded(this.adapter.login(options));
      const raw = await this.bounded(
        this.adapter.getOwnTimetable(range.adapterRange, options),
      );
      return normalizeLegacyTimetable(raw, range.startDate, range.endDate);
    } finally {
      await this.bounded(this.adapter.logout(options));
    }
  }
}
