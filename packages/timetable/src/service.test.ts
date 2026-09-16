import { describe, expect, it } from 'vitest';
import type { TimetableAdapter } from '@untis-mcp/untis-client';
import { TimetableService } from './service.js';

function fake(overrides: Partial<TimetableAdapter> = {}) {
  const events: string[] = [];
  const adapter: TimetableAdapter = {
    login: () => {
      events.push('login');
      return Promise.resolve();
    },
    getOwnTimetable: () => {
      events.push('fetch');
      return Promise.resolve([]);
    },
    logout: () => {
      events.push('logout');
      return Promise.resolve();
    },
    ...overrides,
  };
  return { adapter, events };
}
describe('TimetableService', () => {
  it('orders login, fetch and logout', async () => {
    const x = fake();
    await new TimetableService(x.adapter).getTimetable({
      start_date: '2026-09-16',
    });
    expect(x.events).toEqual(['login', 'fetch', 'logout']);
  });
  it('logs out and hides upstream failures', async () => {
    const x = fake({
      getOwnTimetable: () => {
        x.events.push('fetch');
        return Promise.reject(new Error('token=seeded SECRET response body'));
      },
    });
    await expect(
      new TimetableService(x.adapter).getTimetable({
        start_date: '2026-09-16',
      }),
    ).rejects.toThrow('WebUntis request failed');
    expect(x.events).toEqual(['login', 'fetch', 'logout']);
  });
  it.each([
    ['unauthorized upstream detail', 'Authentication failed'],
    ['forbidden upstream detail', 'Permission denied'],
  ])('maps safe upstream category %s', async (upstream, expected) => {
    const x = fake({
      getOwnTimetable: () => Promise.reject(new Error(upstream)),
    });
    await expect(
      new TimetableService(x.adapter).getTimetable({
        start_date: '2026-09-16',
      }),
    ).rejects.toThrow(expected);
  });
  it('preserves only the generic unsupported-response category', async () => {
    const x = fake({ getOwnTimetable: () => Promise.resolve({ secret: 'x' }) });
    await expect(
      new TimetableService(x.adapter).getTimetable({
        start_date: '2026-09-16',
      }),
    ).rejects.toThrow('Unsupported timetable response');
  });
  it('propagates a safe timeout and logs out', async () => {
    const x = fake({ getOwnTimetable: () => new Promise(() => undefined) });
    await expect(
      new TimetableService(x.adapter, 5).getTimetable({
        start_date: '2026-09-16',
      }),
    ).rejects.toThrow('WebUntis request timed out');
    expect(x.events).toContain('logout');
  });
  it('serializes concurrent sessions', async () => {
    let active = 0,
      max = 0;
    const x = fake({
      getOwnTimetable: async () => {
        active++;
        max = Math.max(max, active);
        await new Promise((r) => setTimeout(r, 5));
        active--;
        return [];
      },
    });
    const service = new TimetableService(x.adapter);
    await Promise.all([
      service.getTimetable({ start_date: '2026-09-16' }),
      service.getTimetable({ start_date: '2026-09-17' }),
    ]);
    expect(max).toBe(1);
  });
});
