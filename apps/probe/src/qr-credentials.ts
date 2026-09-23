import { chmod, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseQrProfile } from '@untis-mcp/untis-client';
import { decodeQrFile } from './image.js';

export function resolveInvocationPath(
  path: string,
  invocationDirectory = process.env.INIT_CWD ?? process.cwd(),
): string {
  return resolve(invocationDirectory, path);
}

export async function writeQrCredentials(
  imagePath: string,
  outputPath: string,
  decode: (path: string) => Promise<string> = decodeQrFile,
): Promise<void> {
  const profile = await decode(imagePath);
  parseQrProfile(profile);
  await writeFile(
    outputPath,
    `${JSON.stringify({ method: 'qr', profile }, null, 2)}\n`,
    { encoding: 'utf8', mode: 0o600 },
  );
  await chmod(outputPath, 0o600);
}
