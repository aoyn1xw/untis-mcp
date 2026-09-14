import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import {
  LegacyJsonRpcAdapter,
  parseQrProfile,
  type Credentials,
} from '@untis-mcp/untis-client';
import { decodeQrFile } from './image.js';
import { dateRange } from './range.js';
import { runProbe } from './probe.js';
import { writeReports } from './report.js';

const rl = createInterface({ input: stdin, output: stdout });
async function ask(prompt: string): Promise<string> {
  return (await rl.question(prompt)).trim();
}
async function secret(prompt: string): Promise<string> {
  if (!stdin.isTTY) return ask(prompt);
  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve) => {
    let value = '';
    const onData = (buffer: Buffer) => {
      const char = buffer.toString();
      if (char === '\r' || char === '\n') {
        stdin.off('data', onData);
        stdin.setRawMode(false);
        stdout.write('\n');
        resolve(value);
      } else if (char === '\u0003') process.exit(130);
      else if (char === '\u007f') value = value.slice(0, -1);
      else value += char;
    };
    stdin.on('data', onData);
  });
}

async function credentials(): Promise<Credentials> {
  const method =
    (await ask(
      'Authentication: [1] QR image, [2] pasted QR profile, [3] password: ',
    )) || '1';
  if (method === '1' || method === '2') {
    const profile =
      method === '1'
        ? await decodeQrFile(await ask('Local QR screenshot path: '))
        : await secret('Paste QR profile (hidden): ');
    parseQrProfile(profile);
    return { method: 'qr', profile };
  }
  return {
    method: 'password',
    server: await ask('WebUntis server URL: '),
    school: await ask('School: '),
    username: await ask('Username: '),
    password: await secret('Password (hidden): '),
  };
}

async function main(): Promise<void> {
  stdout.write(
    'Local-only WebUntis evidence probe. Secrets and records are never printed.\n',
  );
  try {
    const auth = await credentials();
    const today = new Date();
    const defaultStart = today.toISOString().slice(0, 10);
    const later = new Date(today);
    later.setDate(later.getDate() + 6);
    const start =
      (await ask(`Range start [${defaultStart}]: `)) || defaultStart;
    const endDefault = later.toISOString().slice(0, 10);
    const end = (await ask(`Range end [${endDefault}]: `)) || endDefault;
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
    const message =
      error instanceof Error &&
      /^(Invalid WebUntis QR profile|No QR code found|Date range)/.test(
        error.message,
      )
        ? error.message
        : 'Probe failed safely';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}
void main();
