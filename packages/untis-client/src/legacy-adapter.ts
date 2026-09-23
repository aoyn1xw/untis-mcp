import { authenticator } from 'otplib';
import { WebUntis, WebUntisQR } from 'webuntis';
import { URL } from 'node:url';
import { safeError } from './errors.js';
import { assertReadOnlyRequest } from './read-only-guard.js';
import type {
  CapabilityName,
  CapabilityCallOptions,
  Credentials,
  ProbeDateRange,
  UntisAdapter,
  TimetableAdapter,
} from './types.js';

type Client = InstanceType<typeof WebUntis> | InstanceType<typeof WebUntisQR>;

export class LegacyJsonRpcAdapter implements UntisAdapter, TimetableAdapter {
  private readonly client: Client;

  constructor(credentials: Credentials) {
    this.client =
      credentials.method === 'qr'
        ? new WebUntisQR(
            credentials.profile,
            'untis-mcp-probe',
            authenticator,
            URL,
          )
        : new WebUntis(
            credentials.school,
            credentials.username,
            credentials.password,
            credentials.server,
            'untis-mcp-probe',
          );
    this.client.axios.interceptors.request.use((request) => {
      assertReadOnlyRequest(request);
      return request;
    });
  }

  async login(options?: CapabilityCallOptions): Promise<void> {
    const previousTimeout = this.client.axios.defaults.timeout;
    if (options) this.client.axios.defaults.timeout = options.timeoutMs;
    try {
      await this.client.login();
    } catch (error) {
      throw safeError(error);
    } finally {
      if (previousTimeout === undefined)
        delete this.client.axios.defaults.timeout;
      else this.client.axios.defaults.timeout = previousTimeout;
    }
  }

  async logout(options?: CapabilityCallOptions): Promise<void> {
    const previousTimeout = this.client.axios.defaults.timeout;
    if (options) this.client.axios.defaults.timeout = options.timeoutMs;
    try {
      await this.client.logout();
    } catch {
      /* best effort; never expose session errors */
    } finally {
      if (previousTimeout === undefined)
        delete this.client.axios.defaults.timeout;
      else this.client.axios.defaults.timeout = previousTimeout;
    }
  }

  async call(
    capability: CapabilityName,
    range: ProbeDateRange,
    options?: CapabilityCallOptions,
  ): Promise<unknown> {
    const previousTimeout = this.client.axios.defaults.timeout;
    if (options) this.client.axios.defaults.timeout = options.timeoutMs;
    try {
      const calls: Record<CapabilityName, () => Promise<unknown>> = {
        timetable_today: () => this.client.getOwnTimetableForToday(false),
        timetable_range: () =>
          this.client.getOwnTimetableForRange(range.start, range.end, false),
        timetable_week: () =>
          this.client.getOwnTimetableForWeek(range.start, undefined, false),
        exams: () =>
          this.client.getExamsForRange(
            range.start,
            range.end,
            undefined,
            false,
            false,
          ),
        homework: () =>
          this.client.getHomeWorksFor(range.start, range.end, false),
        absences: () =>
          this.client.getAbsentLesson(range.start, range.end, undefined, false),
        inbox: () => this.client.getInbox(false),
        holidays: () => this.client.getHolidays(false),
        subjects: () => this.client.getSubjects(false),
        rooms: () => this.client.getRooms(false),
        teachers: () => this.client.getTeachers(false),
        classes: async () => {
          const year = await this.client.getCurrentSchoolyear(false);
          return this.client.getClasses(false, year.id);
        },
        school_years: () => this.client.getSchoolyears(false),
        time_grid: () => this.client.getTimegrid(false),
        session_validation: () => this.client.validateSession(),
      };
      return await calls[capability]();
    } catch (error) {
      throw safeError(error);
    } finally {
      if (previousTimeout === undefined)
        delete this.client.axios.defaults.timeout;
      else this.client.axios.defaults.timeout = previousTimeout;
    }
  }

  async getOwnTimetable(
    range: ProbeDateRange,
    options?: CapabilityCallOptions,
  ): Promise<unknown> {
    return this.call('timetable_range', range, options);
  }
}
