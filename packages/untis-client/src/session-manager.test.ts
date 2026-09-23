import { describe, expect, it } from 'vitest';
import { AuthenticationError } from './errors.js';
import { SessionManager, type SessionLifecycle } from './session-manager.js';

function fakeLifecycle() {
  let authenticated = false;
  const events: string[] = [];
  const lifecycle: SessionLifecycle = {
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
  };
  return { lifecycle, events };
}

describe('SessionManager', () => {
  it('authenticates lazily and reuses the session', async () => {
    const fake = fakeLifecycle();
    const manager = new SessionManager(fake.lifecycle);
    await manager.execute(() => {
      fake.events.push('first');
      return Promise.resolve();
    });
    await manager.execute(() => {
      fake.events.push('second');
      return Promise.resolve();
    });
    expect(fake.events).toEqual(['authenticate', 'first', 'second']);
  });

  it('reauthenticates once after an authentication rejection', async () => {
    const fake = fakeLifecycle();
    const manager = new SessionManager(fake.lifecycle);
    let attempts = 0;
    await expect(
      manager.execute(() => {
        fake.events.push(`operation-${++attempts}`);
        if (attempts === 1) return Promise.reject(new AuthenticationError());
        return Promise.resolve('ok');
      }),
    ).resolves.toBe('ok');
    expect(fake.events).toEqual([
      'authenticate',
      'operation-1',
      'invalidate',
      'authenticate',
      'operation-2',
    ]);
  });

  it('does not enter an infinite retry loop', async () => {
    const fake = fakeLifecycle();
    const manager = new SessionManager(fake.lifecycle);
    let attempts = 0;
    await expect(
      manager.execute(() => {
        attempts++;
        return Promise.reject(new AuthenticationError());
      }),
    ).rejects.toThrow(AuthenticationError);
    expect(attempts).toBe(2);
    expect(
      fake.events.filter((event) => event === 'authenticate'),
    ).toHaveLength(2);
    expect(fake.events.at(-1)).toBe('invalidate');
  });

  it('does not retry non-authentication failures', async () => {
    const fake = fakeLifecycle();
    const manager = new SessionManager(fake.lifecycle);
    let attempts = 0;
    await expect(
      manager.execute(() => {
        attempts++;
        return Promise.reject(new Error('network failure'));
      }),
    ).rejects.toThrow('network failure');
    expect(attempts).toBe(1);
  });

  it('serializes operations and closes the session once', async () => {
    const fake = fakeLifecycle();
    const manager = new SessionManager(fake.lifecycle);
    let active = 0;
    let maximum = 0;
    const operation = () =>
      manager.execute(async () => {
        active++;
        maximum = Math.max(maximum, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
      });
    await Promise.all([operation(), operation()]);
    await manager.close();
    await manager.close();
    expect(maximum).toBe(1);
    expect(fake.events.filter((event) => event === 'close')).toHaveLength(1);
    await expect(manager.execute(() => Promise.resolve())).rejects.toThrow(
      'WebUntis client closed',
    );
  });
});
