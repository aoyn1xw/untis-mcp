export type LessonStatus = 'scheduled' | 'cancelled' | 'irregular' | 'unknown';

export interface Teacher {
  id?: number | undefined;
  name: string;
  longName?: string | undefined;
}

export interface Subject {
  id?: number | undefined;
  name: string;
  longName?: string | undefined;
}

export interface Room {
  id?: number | undefined;
  name: string;
  longName?: string | undefined;
}

export interface TimetableEntry {
  id: number;
  /** Correlation key only; multiple periods may share one lessonId. */
  lessonId?: number | undefined;
  date: string;
  startTime: string;
  endTime: string;
  subjects: Subject[];
  rooms: Room[];
  teachers: Teacher[];
  status: LessonStatus;
}

export interface HomeworkAttachment {
  /**
   * Attachment fields are not yet fully understood. Metadata is preserved as
   * validated JSON, but downloading is intentionally unsupported.
   */
  metadata: Readonly<Record<string, JsonValue>>;
}

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface Homework {
  id: number;
  lessonId: number;
  date: string;
  dueDate: string;
  text: string;
  remark: string;
  completed: boolean;
  attachments: HomeworkAttachment[];
}

export interface HomeworkRecord {
  homeworkId: number;
  teacherId: number;
  elementIds: number[];
}

export interface Lesson {
  id: number;
  subject: Subject;
  lessonType: string;
}

export interface HomeworkResult {
  records: HomeworkRecord[];
  homeworks: Homework[];
  teachers: Teacher[];
  lessons: Lesson[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface RequestOptions {
  timeoutMs?: number | undefined;
}

export interface WebUntisDomainApi {
  getTimetable(
    range: DateRange,
    options?: RequestOptions,
  ): Promise<TimetableEntry[]>;
  getWeeklyTimetable(
    date: Date,
    options?: RequestOptions,
  ): Promise<TimetableEntry[]>;
  getHomework(
    range: DateRange,
    options?: RequestOptions,
  ): Promise<HomeworkResult>;
  close(options?: RequestOptions): Promise<void>;
}
