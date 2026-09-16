import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadCredentialsFile } from './config.js';
let directory = '';
afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
  directory = '';
});
async function fixture(value: string, mode = 0o600) {
  directory = await mkdtemp(join(tmpdir(), 'untis-mcp-'));
  const path = join(directory, 'credentials.json');
  await writeFile(path, value, { mode });
  return path;
}
const qrSecret =
  'untis://setschool?url=https%3A%2F%2Fexample.invalid&school=Fictional&user=student-placeholder&key=NOT_A_REAL_SECRET';
describe('credential file', () => {
  it('loads and validates a QR profile', async () =>
    expect(
      await loadCredentialsFile(
        await fixture(JSON.stringify({ method: 'qr', profile: qrSecret })),
      ),
    ).toEqual({ method: 'qr', profile: qrSecret }));
  it('loads password credentials and normalizes the host', async () =>
    expect(
      await loadCredentialsFile(
        await fixture(
          JSON.stringify({
            method: 'password',
            server: 'https://EXAMPLE.invalid',
            school: 'Placeholder School',
            username: 'placeholder-user',
            password: 'NOT_A_REAL_PASSWORD',
          }),
        ),
      ),
    ).toMatchObject({ method: 'password', server: 'example.invalid' }));
  it.each([
    '{}',
    '{ broken',
    JSON.stringify({ method: 'password', password: 'fixture-secret' }),
  ])('rejects invalid config without leaking it', async (value) => {
    await expect(loadCredentialsFile(await fixture(value))).rejects.not.toThrow(
      /fixture-secret|broken/,
    );
  });
  it('rejects a missing file generically', async () => {
    directory = await mkdtemp(join(tmpdir(), 'untis-mcp-'));
    await expect(
      loadCredentialsFile(join(directory, 'missing-secret-name')),
    ).rejects.toThrow('Invalid or unreadable credential file');
  });
  it.runIf(process.platform !== 'win32')(
    'refuses permissive POSIX permissions',
    async () => {
      const path = await fixture(
        JSON.stringify({ method: 'qr', profile: qrSecret }),
      );
      await chmod(path, 0o644);
      await expect(loadCredentialsFile(path)).rejects.toThrow(
        'permissions are too permissive',
      );
    },
  );
  it('does not enforce POSIX permission bits on Windows', async () => {
    const path = await fixture(
      JSON.stringify({ method: 'qr', profile: qrSecret }),
      0o644,
    );
    await expect(loadCredentialsFile(path, 'win32')).resolves.toMatchObject({
      method: 'qr',
    });
  });
});
