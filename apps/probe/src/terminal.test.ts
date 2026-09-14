import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { askQuestion, readHiddenSecret, type StreamLike } from './terminal.js';

class MockTTYInput extends EventEmitter implements StreamLike {
  isTTY = true;
  rawMode = false;
  resumed = false;
  paused = false;

  setRawMode(mode: boolean) {
    this.rawMode = mode;
  }
  resume() {
    this.resumed = true;
    this.paused = false;
  }
  pause() {
    this.paused = true;
    this.resumed = false;
  }
}

class MockWritable {
  output = '';
  write(chunk: string): boolean {
    this.output += chunk;
    return true;
  }
}

describe('askQuestion', () => {
  it('asks question and returns trimmed response', async () => {
    const input = new Readable({
      read() {
        this.push('hello \n');
        this.push(null);
      },
    });
    const output = new MockWritable();
    const answer = await askQuestion(
      'Name: ',
      input,
      output as unknown as NodeJS.WritableStream,
    );
    expect(answer).toBe('hello');
  });
});

describe('readHiddenSecret', () => {
  it('reads characters keystroke-by-keystroke and resolves on newline', async () => {
    const input = new MockTTYInput();
    const output = new MockWritable();

    const promise = readHiddenSecret('Password: ', input, output);
    expect(input.rawMode).toBe(true);
    expect(output.output).toBe('Password: ');

    input.emit('data', Buffer.from('s'));
    input.emit('data', Buffer.from('e'));
    input.emit('data', Buffer.from('c'));
    input.emit('data', Buffer.from('\r'));

    const secret = await promise;
    expect(secret).toBe('sec');
    expect(input.rawMode).toBe(false);
    expect(output.output).toBe('Password: \n');
    expect(input.listenerCount('data')).toBe(0);
  });

  it('handles pasted input delivered with newline in a single chunk', async () => {
    const input = new MockTTYInput();
    const output = new MockWritable();

    const promise = readHiddenSecret('QR Profile: ', input, output);
    input.emit('data', Buffer.from('pasted-secret-profile-data\r\n'));

    const secret = await promise;
    expect(secret).toBe('pasted-secret-profile-data');
    expect(input.rawMode).toBe(false);
    expect(input.listenerCount('data')).toBe(0);
  });

  it('handles backspace correctly', async () => {
    const input = new MockTTYInput();
    const output = new MockWritable();

    const promise = readHiddenSecret('Secret: ', input, output);
    input.emit('data', Buffer.from('abc'));
    input.emit('data', Buffer.from('\u007f')); // backspace
    input.emit('data', Buffer.from('d\n'));

    const secret = await promise;
    expect(secret).toBe('abd');
  });

  it('cleans up raw mode and listeners on Ctrl+C before exiting', () => {
    const input = new MockTTYInput();
    const output = new MockWritable();
    const exitMock = vi.fn();

    void readHiddenSecret('Secret: ', input, output, exitMock);
    expect(input.rawMode).toBe(true);

    input.emit('data', Buffer.from('\u0003')); // Ctrl+C
    expect(input.rawMode).toBe(false);
    expect(input.listenerCount('data')).toBe(0);
    expect(exitMock).toHaveBeenCalledWith(130);
  });

  it('handles pasted chunk containing Ctrl+C before newline with cleanup and exit', () => {
    const input = new MockTTYInput();
    const output = new MockWritable();
    const exitMock = vi.fn();

    void readHiddenSecret('Secret: ', input, output, exitMock);
    input.emit('data', Buffer.from('ab\u0003cd\n'));
    expect(input.rawMode).toBe(false);
    expect(input.listenerCount('data')).toBe(0);
    expect(exitMock).toHaveBeenCalledWith(130);
  });
});
