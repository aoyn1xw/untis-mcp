#!/usr/bin/env node
import { stderr, stdout } from 'node:process';
import { resolveInvocationPath, writeQrCredentials } from './qr-credentials.js';
import { safeCliErrorMessage } from './terminal.js';

async function main(): Promise<void> {
  const [imagePath, outputPath, ...extra] = process.argv.slice(2);
  if (!imagePath || !outputPath || extra.length > 0) {
    stderr.write('Usage: untis-import-qr <QR image> <credential file>\n');
    process.exitCode = 2;
    return;
  }
  await writeQrCredentials(
    resolveInvocationPath(imagePath),
    resolveInvocationPath(outputPath),
  );
  stdout.write(
    'WebUntis QR credentials saved locally. Secret not displayed.\n',
  );
}

void main().catch((error: unknown) => {
  stderr.write(`${safeCliErrorMessage(error)}\n`);
  process.exitCode = 1;
});
