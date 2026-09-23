import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveInvocationPath, writeQrCredentials } from './qr-credentials.js';

let directory = '';
afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
  directory = '';
});

const profile =
  'untis://setschool?url=https%3A%2F%2Fexample.invalid&school=Fictional&user=student-placeholder&key=NOT_A_REAL_SECRET';

describe('QR credential import', () => {
  it('resolves CLI paths from the original invocation directory', () => {
    expect(resolveInvocationPath('.local/qr.png', 'C:\\repo')).toBe(
      join('C:\\repo', '.local', 'qr.png'),
    );
  });

  it('writes a validated QR profile without logging or transforming it', async () => {
    directory = await mkdtemp(join(tmpdir(), 'untis-qr-import-'));
    const output = join(directory, 'credentials.json');

    await writeQrCredentials('fixture.png', output, () =>
      Promise.resolve(profile),
    );

    expect(JSON.parse(await readFile(output, 'utf8'))).toEqual({
      method: 'qr',
      profile,
    });
  });

  it('does not write a credential file for an invalid QR payload', async () => {
    directory = await mkdtemp(join(tmpdir(), 'untis-qr-import-'));
    const output = join(directory, 'credentials.json');

    await expect(
      writeQrCredentials('fixture.png', output, () =>
        Promise.resolve('not-an-untis-qr'),
      ),
    ).rejects.toThrow('Invalid WebUntis QR profile');
    await expect(readFile(output, 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });
});
