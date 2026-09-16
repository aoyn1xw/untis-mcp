import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { stripVTControlCharacters } from 'node:util';

export interface StreamLike {
  isTTY?: boolean;
  setRawMode?(mode: boolean): void;
  resume?(): void;
  pause?(): void;
  on(event: 'data', listener: (chunk: Buffer) => void): this;
  on(event: 'end', listener: () => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  off(event: 'data', listener: (chunk: Buffer) => void): this;
  off(event: 'end', listener: () => void): this;
  off(event: 'error', listener: (error: Error) => void): this;
}

export interface WritableLike {
  write(chunk: string): boolean;
}

const SAFE_INPUT_ERROR =
  /^(Invalid WebUntis QR profile|Invalid WebUntis server|Could not read local QR image|No QR code found|Image is too large|Date range)/;

export function safeCliErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Probe failed safely';
  if (SAFE_INPUT_ERROR.test(error.message)) return error.message;
  if (error.message === 'unauthorized' || error.message === 'forbidden')
    return 'WebUntis login rejected';
  if (error.message === 'timeout' || error.message === 'timed out')
    return 'WebUntis login timed out';
  if (error.message === 'WebUntis request failed')
    return 'WebUntis login request failed';
  return 'Probe failed safely';
}

/**
 * Ask a visible question with a dedicated readline interface.
 * Closes the readline interface immediately so stdin is never held open.
 */
export async function askQuestion(
  prompt: string,
  input: NodeJS.ReadableStream = stdin,
  output: NodeJS.WritableStream = stdout,
): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    return (await rl.question(prompt)).trim();
  } finally {
    rl.close();
  }
}

/**
 * Read a hidden secret from a TTY stream without software echoing.
 * Ensures exclusive stream access, correctly parses chunks with embedded newlines,
 * restores raw mode on completion or abort, and never echoes or persists the secret.
 */
export async function readHiddenSecret(
  prompt: string,
  input: StreamLike = stdin,
  output: WritableLike = stdout,
  exitFn: (code: number) => void = (code) => process.exit(code),
): Promise<string> {
  if (!input.isTTY) {
    return askQuestion(
      prompt,
      input as NodeJS.ReadableStream,
      output as NodeJS.WritableStream,
    );
  }

  output.write(prompt);
  input.setRawMode?.(true);
  input.resume?.();

  return new Promise<string>((resolve, reject) => {
    let value = '';

    const cleanup = () => {
      input.off('data', onData);
      input.off('end', onEnd);
      input.off('error', onError);
      input.setRawMode?.(false);
      input.pause?.();
    };

    const onEnd = () => {
      cleanup();
      reject(new Error('Secret input closed'));
    };

    const onError = () => {
      cleanup();
      reject(new Error('Secret input failed'));
    };

    const onData = (buffer: Buffer) => {
      const chunk = buffer.toString();

      // Check if chunk contains a newline (e.g. pasted input with trailing CR/LF)
      const newlineIndex = chunk.search(/[\r\n]/);
      if (newlineIndex !== -1) {
        // Accumulate only characters up to the newline
        const preNewline = chunk.slice(0, newlineIndex);
        for (const char of preNewline) {
          if (char === '\u0003') {
            cleanup();
            exitFn(130);
            return;
          }
          if (char === '\u007f' || char === '\b') {
            value = value.slice(0, -1);
          } else {
            value += char;
          }
        }
        cleanup();
        output.write('\n');
        resolve(stripVTControlCharacters(value));
        return;
      }

      // Process characters in the chunk without newline
      for (const char of chunk) {
        if (char === '\u0003') {
          cleanup();
          exitFn(130);
          return;
        }
        if (char === '\u007f' || char === '\b') {
          value = value.slice(0, -1);
        } else {
          value += char;
        }
      }
    };

    input.on('data', onData);
    input.on('end', onEnd);
    input.on('error', onError);
  });
}
