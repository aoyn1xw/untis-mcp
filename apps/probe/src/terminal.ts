import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

export interface StreamLike {
  isTTY?: boolean;
  setRawMode?(mode: boolean): void;
  resume?(): void;
  pause?(): void;
  on(event: 'data', listener: (chunk: Buffer) => void): this;
  off(event: 'data', listener: (chunk: Buffer) => void): this;
}

export interface WritableLike {
  write(chunk: string): boolean;
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

  return new Promise<string>((resolve) => {
    let value = '';

    const cleanup = () => {
      input.off('data', onData);
      input.setRawMode?.(false);
      input.pause?.();
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
        resolve(value);
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
  });
}
