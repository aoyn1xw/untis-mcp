import { readFile, stat } from 'node:fs/promises';
import { platform } from 'node:os';
import { z } from 'zod';
import {
  normalizeServerHost,
  parseQrProfile,
  type Credentials,
} from '@untis-mcp/untis-client';

const qr = z
  .object({ method: z.literal('qr'), profile: z.string().min(1) })
  .strict();
const password = z
  .object({
    method: z.literal('password'),
    server: z.string().min(1),
    school: z.string().min(1),
    username: z.string().min(1),
    password: z.string().min(1),
  })
  .strict();
const schema = z.discriminatedUnion('method', [qr, password]);

const failure = () => new Error('Invalid or unreadable credential file');
export async function loadCredentialsFile(
  filePath: string,
  os = platform(),
): Promise<Credentials> {
  if (!filePath) throw failure();
  try {
    const metadata = await stat(filePath);
    if (!metadata.isFile()) throw failure();
    if (os !== 'win32' && (metadata.mode & 0o077) !== 0)
      throw new Error(
        'Credential file permissions are too permissive; use mode 0600',
      );
    const value: unknown = JSON.parse(await readFile(filePath, 'utf8'));
    const parsed = schema.parse(value);
    if (parsed.method === 'qr') {
      parseQrProfile(parsed.profile);
      return parsed;
    }
    return { ...parsed, server: normalizeServerHost(parsed.server) };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Credential file permissions')
    )
      throw error;
    throw failure();
  }
}

export async function loadCredentialsFromEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): Promise<Credentials> {
  return loadCredentialsFile(env.UNTIS_MCP_CREDENTIALS_FILE ?? '');
}
