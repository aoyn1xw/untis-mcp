import { expect, it } from 'vitest';
import type { CapabilityName, UntisAdapter } from './types.js';

it('adapter contract supports opaque synthetic response shapes', async () => {
  const fixture = { lessons: [{ id: 123, subject: { name: 'Astrobiology' } }] };
  const mock: UntisAdapter = {
    login: async () => {},
    logout: async () => {},
    call: (name: CapabilityName) => {
      void name;
      return Promise.resolve(fixture);
    },
  };
  await mock.login();
  expect(
    await mock.call('timetable_today', { start: new Date(), end: new Date() }),
  ).toEqual(fixture);
  await mock.logout();
});
