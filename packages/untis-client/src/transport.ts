import { URL } from 'node:url';
import { authenticator } from 'otplib';
import { WebUntis, WebUntisQR } from 'webuntis';
import type { DateRange, RequestOptions } from './domain.js';
import {
  AuthenticationError,
  InvalidResponseError,
  UnsupportedFeatureError,
  safeError,
} from './errors.js';
import { assertReadOnlyRequest } from './read-only-guard.js';
import type { SessionLifecycle } from './session-manager.js';
import type { Credentials } from './types.js';

type UpstreamClient =
  InstanceType<typeof WebUntis> | InstanceType<typeof WebUntisQR>;
type ClientFactory = (credentials: Credentials) => UpstreamClient;

export interface RawWebUntisTransport extends SessionLifecycle {
  getTimetable(range: DateRange, options?: RequestOptions): Promise<unknown>;
  getWeeklyTimetable(date: Date, options?: RequestOptions): Promise<unknown>;
  getHomework(range: DateRange, options?: RequestOptions): Promise<unknown>;
}

function defaultClient(credentials: Credentials): UpstreamClient {
  return credentials.method === 'qr'
    ? new WebUntisQR(credentials.profile, 'untis-mcp', authenticator, URL)
    : new WebUntis(
        credentials.school,
        credentials.username,
        credentials.password,
        credentials.server,
        'untis-mcp',
      );
}

function responseStatus(error: unknown): unknown {
  if (typeof error !== 'object' || error === null) return undefined;
  return (error as { response?: { status?: unknown } }).response?.status;
}

function transportError(error: unknown): Error {
  if (
    error instanceof UnsupportedFeatureError ||
    error instanceof InvalidResponseError ||
    error instanceof AuthenticationError
  )
    return error;
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  const status = responseStatus(error);
  if (
    status === 401 ||
    status === 302 ||
    message.includes('current session is not valid') ||
    message.includes('session is not valid')
  )
    return new AuthenticationError();
  if (
    message.includes('invalid response') ||
    message.includes('invalid data') ||
    message.includes("doesn't contains")
  )
    return new InvalidResponseError();
  return safeError(error);
}

export class ReadOnlyWebUntisTransport implements RawWebUntisTransport {
  private readonly client: UpstreamClient;
  private authenticated = false;

  constructor(
    credentials: Credentials,
    factory: ClientFactory = defaultClient,
  ) {
    this.client = factory(credentials);
    this.client.axios.interceptors.request.use((request) => {
      assertReadOnlyRequest(request);
      return request;
    });
  }

  hasAuthentication(): boolean {
    return this.authenticated;
  }

  invalidateAuthentication(): void {
    this.authenticated = false;
    this.client.sessionInformation = {};
  }

  isAuthenticationRejection(error: unknown): boolean {
    return error instanceof AuthenticationError;
  }

  async authenticate(options?: RequestOptions): Promise<void> {
    try {
      await this.withTimeout(options, () => this.client.login());
      if (typeof this.client.sessionInformation?.sessionId !== 'string')
        throw new InvalidResponseError();
      this.authenticated = true;
    } catch (error) {
      this.invalidateAuthentication();
      throw transportError(error);
    }
  }

  async getTimetable(
    range: DateRange,
    options?: RequestOptions,
  ): Promise<unknown> {
    return this.read(options, () =>
      this.client.getOwnTimetableForRange(range.start, range.end, true),
    );
  }

  async getWeeklyTimetable(
    date: Date,
    options?: RequestOptions,
  ): Promise<unknown> {
    return this.read(options, () =>
      this.client.getOwnTimetableForWeek(date, undefined, true),
    );
  }

  async getHomework(
    range: DateRange,
    options?: RequestOptions,
  ): Promise<unknown> {
    return this.read(options, () =>
      this.client.getHomeWorksFor(range.start, range.end, true),
    );
  }

  async close(options?: RequestOptions): Promise<void> {
    try {
      if (this.authenticated)
        await this.withTimeout(options, () => this.client.logout());
    } catch {
      // Cleanup is best effort and must never expose session details.
    } finally {
      this.invalidateAuthentication();
    }
  }

  private async read<T>(
    options: RequestOptions | undefined,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await this.withTimeout(options, operation);
    } catch (error) {
      throw transportError(error);
    }
  }

  private async withTimeout<T>(
    options: RequestOptions | undefined,
    operation: () => Promise<T>,
  ): Promise<T> {
    const previous = this.client.axios.defaults.timeout;
    if (options?.timeoutMs !== undefined)
      this.client.axios.defaults.timeout = options.timeoutMs;
    try {
      return await operation();
    } finally {
      if (previous === undefined) delete this.client.axios.defaults.timeout;
      else this.client.axios.defaults.timeout = previous;
    }
  }
}
