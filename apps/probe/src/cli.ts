#!/usr/bin/env node
import { stdout } from 'node:process';
import {
  LegacyJsonRpcAdapter,
  normalizeServerHost,
  parseQrProfile,
  type Credentials,
} from '@untis-mcp/untis-client';
import { decodeQrFile } from './image.js';
import { dateRange, localDateText } from './range.js';
import { runProbe } from './probe.js';
import { writeReports } from './report.js';
import {
  askQuestion,
  readHiddenSecret,
  safeCliErrorMessage,
} from './terminal.js';

async function credentials(): Promise<Credentials> {
  const method =
    (await askQuestion(
      'Authentication: [1] QR image, [2] pasted QR profile, [3] password: ',
    )) || '1';
  if (method === '1' || method === '2') {
    const profile =
      method === '1'
        ? await decodeQrFile(await askQuestion('Local QR screenshot path: '))
        : await readHiddenSecret('Paste QR profile (hidden): ');
    parseQrProfile(profile);
    return { method: 'qr', profile };
  }
  return {
    method: 'password',
    server: normalizeServerHost(
      await askQuestion('WebUntis server hostname or HTTPS URL: '),
    ),
    school: await askQuestion('School: '),
    username: await askQuestion('Username: '),
    password: await readHiddenSecret('Password (hidden): '),
  };
}

async function main(): Promise<void> {
  stdout.write(
    'Local-only WebUntis evidence probe. Secrets and records are never printed.\n',
  );
  try {
    const auth = await credentials();
    const today = new Date();
    const defaultStart = localDateText(today);
    const later = new Date(today);
    later.setDate(later.getDate() + 6);
    const start =
      (await askQuestion(`Range start [${defaultStart}]: `)) || defaultStart;
    const endDefault = localDateText(later);
    const end =
      (await askQuestion(`Range end [${endDefault}]: `)) || endDefault;
    const results = await runProbe(
      new LegacyJsonRpcAdapter(auth),
      dateRange(start, end),
    );
    await writeReports(results);
    for (const [name, result] of Object.entries(results))
      stdout.write(`${name}: ${result.status}\n`);
    stdout.write(
      'Private raw data: .local/probe/raw.json\nShareable structural report: .local/probe/report.json\n',
    );
  } catch (error) {
    process.stderr.write(`${safeCliErrorMessage(error)}\n`);
    process.exitCode = 1;
  }
}
void main();
