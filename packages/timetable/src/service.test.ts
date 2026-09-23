import { describe, expect, it } from 'vitest';
import type { WebUntisDomainApi } from '@untis-mcp/untis-client';
import { TimetableService } from './service.js';

function fake(
  overrides: Partial<Pick<WebUntisDomainApi, 'getTimetable'>> = {},
) {
  const events: string[] = [];
  const client: Pick<WebUntisDomainApi, 'getTimetable'> = {
    getTimetable: () => {
      events.push('fetch');
      return Promise.resolve([]);
    },
    ...overrides,
  };
  return { client, events };
}
describe('TimetableService', () => {
  it('delegates one typed domain fetch', async () => {
    const x = fake();
    await new TimetableService(x.client).getTimetable({
      start_date: '2026-09-16',
    });
    expect(x.events).toEqual(['fetch']);
  });
  it('hides upstream failures', async () => {
    const x = fake({
      getTimetable: () => {
        x.events.push('fetch');
        return Promise.reject(new Error('token=seeded SECRET response body'));
      },
    });
    await expect(
      new TimetableService(x.client).getTimetable({
        start_date: '2026-09-16',
      }),
    ).rejects.toThrow('WebUntis request failed');
    expect(x.events).toEqual(['fetch']);
  });
  it.each([
    ['unauthorized upstream detail', 'Authentication failed'],
    ['forbidden upstream detail', 'Permission denied'],
  ])('maps safe upstream category %s', async (upstream, expected) => {
    const x = fake({
      getTimetable: () => Promise.reject(new Error(upstream)),
    });
    await expect(
      new TimetableService(x.client).getTimetable({
        start_date: '2026-09-16',
      }),
    ).rejects.toThrow(expected);
  });
  it('preserves only the generic unsupported-response category', async () => {
    const x = fake({
      getTimetable: () => Promise.resolve({ secret: 'x' } as never),
    });
    await expect(
      new TimetableService(x.client).getTimetable({
        start_date: '2026-09-16',
      }),
    ).rejects.toThrow('Unsupported timetable response');
  });
  it.each(['2026-09-15', '2026-09-17'])(
    'rejects an upstream lesson outside the requested range: %s',
    async (date) => {
      const x = fake({
        getTimetable: () => {
          x.events.push('fetch');
          return Promise.resolve([
            {
              id: 1,
              date,
              startTime: '08:15',
              endTime: '09:45',
              subjects: [{ name: 'Example Subject' }],
              rooms: [{ name: 'Example Room' }],
              teachers: [],
              status: 'scheduled' as const,
            },
          ]);
        },
      });
      await expect(
        new TimetableService(x.client).getTimetable({
          start_date: '2026-09-16',
        }),
      ).rejects.toThrow('Unsupported timetable response');
      expect(x.events).toEqual(['fetch']);
    },
  );
  it('propagates a safe timeout', async () => {
    const x = fake({ getTimetable: () => new Promise(() => undefined) });
    await expect(
      new TimetableService(x.client, 5).getTimetable({
        start_date: '2026-09-16',
      }),
    ).rejects.toThrow('WebUntis request timed out');
    expect(x.events).toEqual([]);
  });
  it('serializes concurrent sessions', async () => {
    let active = 0,
      max = 0;
    const x = fake({
      getTimetable: async () => {
        active++;
        max = Math.max(max, active);
        await new Promise((r) => setTimeout(r, 5));
        active--;
        return [];
      },
    });
    const service = new TimetableService(x.client);
    await Promise.all([
      service.getTimetable({ start_date: '2026-09-16' }),
      service.getTimetable({ start_date: '2026-09-17' }),
    ]);
    expect(max).toBe(1);
  });
});
