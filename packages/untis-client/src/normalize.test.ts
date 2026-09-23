import { describe, expect, it } from 'vitest';
import { InvalidResponseError } from './errors.js';
import { normalizeHomework, normalizeTimetable } from './normalize.js';

const homeworkFixture = {
  records: [{ homeworkId: 41, teacherId: 7, elementIds: [3] }],
  homeworks: [
    {
      id: 41,
      lessonId: 73,
      date: 20260921,
      dueDate: 20260923,
      text: 'Synthetic assignment',
      remark: '',
      completed: false,
      attachments: [
        { id: 9, fileName: 'synthetic.pdf', nested: { available: true } },
      ],
    },
  ],
  teachers: [{ id: 7, name: 'Teacher A' }],
  lessons: [{ id: 73, subject: 'Example Subject', lessonType: 'lesson' }],
};

describe('domain normalization', () => {
  it('normalizes the complete observed homework envelope', () => {
    expect(normalizeHomework(homeworkFixture)).toEqual({
      records: [{ homeworkId: 41, teacherId: 7, elementIds: [3] }],
      homeworks: [
        {
          id: 41,
          lessonId: 73,
          date: '2026-09-21',
          dueDate: '2026-09-23',
          text: 'Synthetic assignment',
          remark: '',
          completed: false,
          attachments: [
            {
              metadata: {
                id: 9,
                fileName: 'synthetic.pdf',
                nested: { available: true },
              },
            },
          ],
        },
      ],
      teachers: [{ id: 7, name: 'Teacher A' }],
      lessons: [
        {
          id: 73,
          subject: { name: 'Example Subject' },
          lessonType: 'lesson',
        },
      ],
    });
  });

  it.each([
    {},
    { ...homeworkFixture, records: null },
    {
      ...homeworkFixture,
      homeworks: [{ ...homeworkFixture.homeworks[0], id: '41' }],
    },
    {
      ...homeworkFixture,
      homeworks: [{ ...homeworkFixture.homeworks[0], completed: 0 }],
    },
    {
      ...homeworkFixture,
      homeworks: [
        { ...homeworkFixture.homeworks[0], attachments: [undefined] },
      ],
    },
  ])('rejects malformed homework without echoing data', (raw) => {
    expect(() => normalizeHomework(raw)).toThrow(InvalidResponseError);
    try {
      normalizeHomework(raw);
    } catch (error) {
      expect((error as Error).message).toBe('Invalid WebUntis response');
    }
  });

  it('preserves lessonId correlation across multiple weekly periods', () => {
    const weekly = normalizeTimetable([
      {
        id: 501,
        lessonId: 73,
        date: 20260923,
        startTime: 800,
        endTime: 845,
        subjects: [{ id: 3, name: 'EX', longName: 'Example Subject' }],
        rooms: [{ id: 4, name: 'R1' }],
        teachers: [{ id: 7, name: 'Teacher A' }],
      },
      {
        id: 502,
        lessonId: 73,
        date: 20260923,
        startTime: 845,
        endTime: 930,
        subjects: [{ id: 3, name: 'EX' }],
        rooms: [{ id: 4, name: 'R1' }],
        teachers: [{ id: 7, name: 'Teacher A' }],
      },
    ]);
    const homework = normalizeHomework(homeworkFixture).homeworks[0];
    expect(
      weekly.filter((entry) => entry.lessonId === homework?.lessonId),
    ).toHaveLength(2);
    expect(weekly.map((entry) => entry.id)).not.toContain(homework?.id);
  });

  it('normalizes the legacy timetable without exposing raw fields', () => {
    const result = normalizeTimetable([
      {
        id: 501,
        date: 20260923,
        startTime: 800,
        endTime: 845,
        su: [{ id: 3, name: 'EX', longname: 'Example Subject' }],
        ro: [{ id: 4, name: 'R1' }],
        te: [{ id: 7, name: 'Teacher A' }],
        secret: 'not copied',
      },
    ]);
    expect(result).toEqual([
      {
        id: 501,
        date: '2026-09-23',
        startTime: '08:00',
        endTime: '08:45',
        subjects: [{ id: 3, name: 'EX', longName: 'Example Subject' }],
        rooms: [{ id: 4, name: 'R1' }],
        teachers: [{ id: 7, name: 'Teacher A' }],
        status: 'scheduled',
      },
    ]);
    expect(JSON.stringify(result)).not.toContain('not copied');
  });
});
