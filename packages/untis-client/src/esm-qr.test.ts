import { expect, it } from 'vitest';
import { LegacyJsonRpcAdapter } from './legacy-adapter.js';

it('constructs the real WebUntisQR client in an ESM module', () => {
  expect(
    () =>
      new LegacyJsonRpcAdapter({
        method: 'qr',
        profile:
          'untis://setschool?url=fictional.webuntis.invalid&school=Example&user=student&key=JBSWY3DPEHPK3PXP',
      }),
  ).not.toThrow();
});
