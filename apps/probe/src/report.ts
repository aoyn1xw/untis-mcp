import { mkdir, open, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { sanitize } from '@untis-mcp/sanitization';
import type { CapabilityName } from '@untis-mcp/untis-client';
import type { CapabilityResult } from './probe.js';

async function privateWrite(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temp = `${path}.tmp`;
  const handle = await open(temp, 'w', 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`);
  } finally {
    await handle.close();
  }
  await rename(temp, path);
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
