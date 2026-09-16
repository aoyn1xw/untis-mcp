export type CapabilityName =
  | 'timetable_today'
  | 'timetable_range'
  | 'timetable_week'
  | 'exams'
  | 'homework'
  | 'absences'
  | 'inbox'
  | 'holidays'
  | 'subjects'
  | 'rooms'
  | 'teachers'
  | 'classes'
  | 'school_years'
  | 'time_grid'
  | 'session_validation';

export interface ProbeDateRange {
  start: Date;
  end: Date;
}

export interface CapabilityCallOptions {
  /** Transport-level timeout; the adapter must cancel the request on expiry. */
  timeoutMs: number;
}

/** Boundary used by the probe; return values intentionally remain unknown. */
export interface UntisAdapter {
  login(options?: CapabilityCallOptions): Promise<void>;
  logout(options?: CapabilityCallOptions): Promise<void>;
  call(
    capability: CapabilityName,
    range: ProbeDateRange,
    options?: CapabilityCallOptions,
  ): Promise<unknown>;
}

/** Narrow authenticated boundary used by the timetable application service. */
export interface TimetableAdapter {
  login(options?: CapabilityCallOptions): Promise<void>;
  getOwnTimetable(
    range: ProbeDateRange,
    options?: CapabilityCallOptions,
  ): Promise<unknown>;
  logout(options?: CapabilityCallOptions): Promise<void>;
}

export interface PasswordCredentials {
  method: 'password';
  server: string;
  school: string;
  username: string;
  password: string;
}

export interface QrCredentials {
  method: 'qr';
  profile: string;
}
export type Credentials = PasswordCredentials | QrCredentials;
