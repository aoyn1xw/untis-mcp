import { describe, expect, it } from 'vitest';
import { normalizeLegacyTimetable } from './normalize.js';
const lesson = {
  id: 991,
  date: 20260916,
  startTime: 815,
  endTime: 945,
  su: [{ id: 3, name: 'MD', longname: 'Digital Design' }],
  ro: [{ id: 4, name: 'R4', longname: 'Room Four' }],
  te: [{ name: 'Seeded Teacher' }],
  kl: [{ name: 'Private Class' }],
  lstext: 'private free text',
  token: 'seeded-token',
  student: { name: 'Seeded Student' },
};
describe('normalizeLegacyTimetable', () => {
  it('allowlists, converts, and omits sensitive fields', () => {
    const output = normalizeLegacyTimetable(
      [lesson],
      '2026-09-16',
      '2026-09-16',
    );
    expect(output).toEqual({
      startDate: '2026-09-16',
      endDate: '2026-09-16',
      count: 1,
      lessons: [
        {
          date: '2026-09-16',
          startTime: '08:15',
          endTime: '09:45',
          subjects: ['Digital Design'],
          rooms: ['Room Four'],
          status: 'scheduled',
        },
      ],
    });
    const serialized = JSON.stringify(output);
    for (const secret of [
      '991',
      'Seeded Teacher',
      'Private Class',
      'private free text',
      'seeded-token',
      'Seeded Student',
    ])
      expect(serialized).not.toContain(secret);
  });
  it('handles multiple and missing subject/room elements', () => {
    const output = normalizeLegacyTimetable(
      [
        { ...lesson, su: [], ro: [] },
        {
          ...lesson,
          su: [{ name: 'One' }, { name: 'Two' }],
          ro: [{ name: 'A' }, { name: 'B' }],
        },
      ],
      '2026-09-16',
      '2026-09-16',
    );
    expect(output.lessons[0]?.subjects).toEqual([]);
    expect(output.lessons[1]?.rooms).toEqual(['A', 'B']);
  });
  it.each([
    ['cancelled', 'cancelled'],
    ['irregular', 'irregular'],
    ['school-specific', 'unknown'],
  ] as const)('maps %s', (code, status) =>
    expect(
      normalizeLegacyTimetable(
        [{ ...lesson, code }],
        '2026-09-01',
        '2026-09-30',
      ).lessons[0]?.status,
    ).toBe(status),
  );
  it('sorts stably and supports empty data', () => {
    const early = { ...lesson, date: 20260915, startTime: 700, endTime: 745 };
    expect(
      normalizeLegacyTimetable(
        [lesson, early],
        '2026-09-01',
        '2026-09-30',
      ).lessons.map((x) => x.date),
    ).toEqual(['2026-09-15', '2026-09-16']);
    expect(
      normalizeLegacyTimetable([], '2026-09-01', '2026-09-30'),
    ).toMatchObject({ count: 0, lessons: [] });
  });
  it.each([
    {},
    [null],
    [{ ...lesson, date: 20260230 }],
    [{ ...lesson, startTime: 1260 }],
    [{ ...lesson, su: [{ id: 4 }] }],
  ])('rejects unsupported data without leaking it', (raw) => {
    let message = '';
    try {
      normalizeLegacyTimetable(raw, '2026-09-01', '2026-09-30');
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toBe('Unsupported timetable response');
    expect(message).not.toContain('seeded');
  });
  it.each([20260915, 20260917])(
    'rejects a lesson outside the requested range: %i',
    (date) => {
      expect(() =>
        normalizeLegacyTimetable(
          [{ ...lesson, date }],
          '2026-09-16',
          '2026-09-16',
        ),
      ).toThrow('Unsupported timetable response');
    },
  );
});
