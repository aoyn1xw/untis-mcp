import { describe, expect, it, vi } from 'vitest';
import type { CapabilityName, UntisAdapter } from './types.js';
import { LegacyJsonRpcAdapter } from './legacy-adapter.js';

describe('UntisAdapter contract', () => {
  it('adapter contract supports opaque synthetic response shapes', async () => {
    const fixture = {
      lessons: [{ id: 123, subject: { name: 'Astrobiology' } }],
    };
    const mock: UntisAdapter = {
      login: () => Promise.resolve(),
      logout: () => Promise.resolve(),
      call: (name: CapabilityName) => {
        void name;
        return Promise.resolve(fixture);
      },
    };
    await mock.login();
    expect(
      await mock.call('timetable_today', {
        start: new Date(),
        end: new Date(),
      }),
    ).toEqual(fixture);
    await mock.logout();
  });

  it('LegacyJsonRpcAdapter propagates transport timeout to axios configuration and restores it', async () => {
    const adapter = new LegacyJsonRpcAdapter({
      method: 'password',
      server: 'untis.example.com',
      school: 'test-school',
      username: 'user',
      password: 'pwd',
    });
    const client = (
      adapter as unknown as {
        client: {
          axios: { defaults: { timeout?: number } };
          getOwnTimetableForToday: () => Promise<unknown>;
          login: () => Promise<unknown>;
          logout: () => Promise<unknown>;
        };
      }
    ).client;
    client.axios = { defaults: { timeout: 100 } };
    client.getOwnTimetableForToday = vi.fn(() => {
      expect(client.axios.defaults.timeout).toBe(5000);
      return Promise.resolve([]);
    });
    client.login = vi.fn(() => {
      expect(client.axios.defaults.timeout).toBe(3000);
      return Promise.resolve();
    });
    client.logout = vi.fn(() => {
      expect(client.axios.defaults.timeout).toBe(2000);
      return Promise.resolve();
    });

    await adapter.login({ timeoutMs: 3000 });
    expect(client.axios.defaults.timeout).toBe(100);

    await adapter.call(
      'timetable_today',
      { start: new Date(), end: new Date() },
      { timeoutMs: 5000 },
    );
    expect(client.axios.defaults.timeout).toBe(100);

    await adapter.logout({ timeoutMs: 2000 });
    expect(client.axios.defaults.timeout).toBe(100);
  });

  it('restores previous timeout even if call throws an error', async () => {
    const adapter = new LegacyJsonRpcAdapter({
      method: 'password',
      server: 'untis.example.com',
      school: 'test-school',
      username: 'user',
      password: 'pwd',
    });
    const client = (
      adapter as unknown as {
        client: {
          axios: { defaults: { timeout?: number } };
          getOwnTimetableForToday: () => Promise<unknown>;
        };
      }
    ).client;
    client.axios = { defaults: { timeout: 250 } };
    client.getOwnTimetableForToday = vi.fn(() => {
      expect(client.axios.defaults.timeout).toBe(999);
      return Promise.reject(new Error('boom'));
    });

    await expect(
      adapter.call(
        'timetable_today',
        { start: new Date(), end: new Date() },
        { timeoutMs: 999 },
      ),
    ).rejects.toThrow('WebUntis request failed');
    expect(client.axios.defaults.timeout).toBe(250);
  });
});
