import { chmod, mkdir, open, rename, unlink } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { sanitize } from '@untis-mcp/sanitization';
import type { CapabilityName } from '@untis-mcp/untis-client';
import type { CapabilityResult } from './probe.js';

async function privateWrite(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await chmod(dirname(path), 0o700);
  const temp = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  const handle = await open(temp, 'wx', 0o600);
  let renamed = false;
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`);
    await handle.close();
    await rename(temp, path);
    renamed = true;
  } finally {
    await handle.close().catch(() => undefined);
    if (!renamed) await unlink(temp).catch(() => undefined);
  }
}

export async function writeReports(
  results: Record<CapabilityName, CapabilityResult>,
  directory = '.local/probe',
): Promise<void> {
  await privateWrite(`${directory}/raw.json`, {
    generatedAt: new Date().toISOString(),
    capabilities: results,
  });
  const salt = randomBytes(32).toString('hex');
  const report = Object.fromEntries(
    Object.entries(results).map(([name, result]) => [
      name,
      {
        status: result.status,
        ...(result.error ? { error: result.error } : {}),
        ...(Object.hasOwn(result, 'data')
          ? { structure: sanitize(result.data, salt) }
          : {}),
      },
    ]),
  );
  await privateWrite(`${directory}/report.json`, {
    formatVersion: 1,
    capabilities: report,
  });
}
