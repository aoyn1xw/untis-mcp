import type {
  DateRange,
  HomeworkResult,
  RequestOptions,
  TimetableEntry,
  WebUntisDomainApi,
} from './domain.js';
import { normalizeHomework, normalizeTimetable } from './normalize.js';
import { SessionManager } from './session-manager.js';
import {
  ReadOnlyWebUntisTransport,
  type RawWebUntisTransport,
} from './transport.js';
import type { Credentials } from './types.js';

export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

export class WebUntisClient implements WebUntisDomainApi {
  private readonly transport: RawWebUntisTransport;
  private readonly sessions: SessionManager;

  constructor(
    credentials: Credentials,
    transport: RawWebUntisTransport = new ReadOnlyWebUntisTransport(
      credentials,
    ),
    private readonly defaultTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  ) {
    this.transport = transport;
    this.sessions = new SessionManager(transport);
  }

  getTimetable(
    range: DateRange,
    options?: RequestOptions,
  ): Promise<TimetableEntry[]> {
    const request = this.options(options);
    return this.sessions.execute(async () => {
      const raw = await this.transport.getTimetable(range, request);
      return normalizeTimetable(raw);
    }, request);
  }

  getWeeklyTimetable(
    date: Date,
    options?: RequestOptions,
  ): Promise<TimetableEntry[]> {
    const request = this.options(options);
    return this.sessions.execute(async () => {
      const raw = await this.transport.getWeeklyTimetable(date, request);
      return normalizeTimetable(raw);
    }, request);
  }

  getHomework(
    range: DateRange,
    options?: RequestOptions,
  ): Promise<HomeworkResult> {
    const request = this.options(options);
    return this.sessions.execute(async () => {
      const raw = await this.transport.getHomework(range, request);
      return normalizeHomework(raw);
    }, request);
  }

  close(options?: RequestOptions): Promise<void> {
    return this.sessions.close(this.options(options));
  }

  private options(options?: RequestOptions): RequestOptions {
    return { timeoutMs: options?.timeoutMs ?? this.defaultTimeoutMs };
  }
}
