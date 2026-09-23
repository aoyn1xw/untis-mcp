import { describe, expect, it } from 'vitest';
import { AuthenticationError, UnsupportedFeatureError } from './errors.js';
import { ReadOnlyWebUntisTransport } from './transport.js';

const credentials = {
  method: 'qr' as const,
  profile: 'synthetic-qr-profile-without-credential',
};

function fakeClient() {
  let guard: ((request: unknown) => unknown) | undefined;
  const client = {
    sessionInformation: {} as { sessionId?: string },
    axios: {
      defaults: {} as { timeout?: number },
      interceptors: {
        request: {
          use: (handler: (request: unknown) => unknown) => {
            guard = handler;
          },
        },
      },
    },
    login: () => {
      guard?.({
        method: 'POST',
        url: '/WebUntis/jsonrpc_intern.do',
        data: { method: 'getUserData2017' },
      });
      client.sessionInformation = { sessionId: 'synthetic-session' };
      return Promise.resolve();
    },
    logout: () => {
      guard?.({
        method: 'POST',
        url: '/WebUntis/jsonrpc.do',
        data: { method: 'logout' },
      });
      return Promise.resolve();
    },
    getOwnTimetableForRange: () => Promise.resolve([]),
    getOwnTimetableForWeek: () => Promise.resolve([]),
    getHomeWorksFor: () =>
      Promise.resolve({
        records: [],
        homeworks: [],
        teachers: [],
        lessons: [],
      }),
  };
  return {
    client,
    request: (value: unknown): unknown => guard?.(value),
  };
}

describe('ReadOnlyWebUntisTransport', () => {
  it('keeps the session only in memory and clears it on close', async () => {
    const fake = fakeClient();
    const transport = new ReadOnlyWebUntisTransport(
      credentials,
      () => fake.client as never,
    );
    await transport.authenticate({ timeoutMs: 25 });
    expect(transport.hasAuthentication()).toBe(true);
    expect(fake.client.axios.defaults.timeout).toBeUndefined();
    await transport.close();
    expect(transport.hasAuthentication()).toBe(false);
    expect(fake.client.sessionInformation).toEqual({});
  });

  it('rejects an unknown request before the HTTP boundary', () => {
    const fake = fakeClient();
    new ReadOnlyWebUntisTransport(credentials, () => fake.client as never);
    expect(() =>
      fake.request({
        method: 'POST',
        url: '/WebUntis/jsonrpc.do',
        data: { method: 'saveHomework' },
      }),
    ).toThrow(UnsupportedFeatureError);
  });

  it('classifies an expired session for one controlled retry', async () => {
    const fake = fakeClient();
    fake.client.getHomeWorksFor = () =>
      Promise.reject(new Error('Current Session is not valid'));
    const transport = new ReadOnlyWebUntisTransport(
      credentials,
      () => fake.client as never,
    );
    await transport.authenticate();
    await expect(
      transport.getHomework({ start: new Date(), end: new Date() }),
    ).rejects.toThrow(AuthenticationError);
  });
});
