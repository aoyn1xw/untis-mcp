import { describe, expect, it } from 'vitest';
import type { DateRange } from './domain.js';
import { AuthenticationError, InvalidResponseError } from './errors.js';
import { WebUntisClient } from './client.js';
import type { RawWebUntisTransport } from './transport.js';

const credentials = {
  method: 'qr' as const,
  profile: 'synthetic-qr-profile-without-credential',
};
const range: DateRange = {
  start: new Date(2026, 8, 21),
  end: new Date(2026, 8, 27),
};

function fakeTransport(overrides: Partial<RawWebUntisTransport> = {}) {
  let authenticated = false;
  const events: string[] = [];
  const transport: RawWebUntisTransport = {
    authenticate: () => {
      events.push('authenticate');
      authenticated = true;
      return Promise.resolve();
    },
    hasAuthentication: () => authenticated,
    invalidateAuthentication: () => {
      events.push('invalidate');
      authenticated = false;
    },
    isAuthenticationRejection: (error) => error instanceof AuthenticationError,
    close: () => {
      events.push('close');
      authenticated = false;
      return Promise.resolve();
    },
    getTimetable: () => Promise.resolve([]),
    getWeeklyTimetable: () => Promise.resolve([]),
    getHomework: () =>
      Promise.resolve({
        records: [],
        homeworks: [],
        teachers: [],
        lessons: [],
      }),
    ...overrides,
  };
  return { transport, events };
}

describe('WebUntisClient', () => {
  it('reuses one authentication across domain calls', async () => {
    const fake = fakeTransport();
    const client = new WebUntisClient(credentials, fake.transport);
    await client.getTimetable(range);
    await client.getWeeklyTimetable(range.start);
    await client.getHomework(range);
    expect(fake.events).toEqual(['authenticate']);
    await client.close();
    expect(fake.events).toEqual(['authenticate', 'close']);
  });

  it('retries one rejected read with a fresh authentication', async () => {
    let calls = 0;
    const fake = fakeTransport({
      getHomework: () => {
        calls++;
        if (calls === 1) return Promise.reject(new AuthenticationError());
        return Promise.resolve({
          records: [],
          homeworks: [],
          teachers: [],
          lessons: [],
        });
      },
    });
    const client = new WebUntisClient(credentials, fake.transport);
    await expect(client.getHomework(range)).resolves.toMatchObject({
      homeworks: [],
    });
    expect(calls).toBe(2);
    expect(fake.events).toEqual(['authenticate', 'invalidate', 'authenticate']);
  });

  it('surfaces stable invalid-response errors', async () => {
    const fake = fakeTransport({ getHomework: () => Promise.resolve({}) });
    const client = new WebUntisClient(credentials, fake.transport);
    await expect(client.getHomework(range)).rejects.toThrow(
      InvalidResponseError,
    );
  });
});
