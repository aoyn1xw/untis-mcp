import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { decodeQrFile, MAX_IMAGE_WIDTH, MAX_IMAGE_PIXELS } from './image.js';

describe('decodeQrFile', () => {
  it('rejects images exceeding max dimension limits before decoding', async () => {
    const spy = vi.spyOn(sharp.prototype, 'metadata').mockResolvedValueOnce({
      width: MAX_IMAGE_WIDTH + 1,
      height: 100,
    });

    await expect(decodeQrFile('fake.png')).rejects.toThrow(
      'Image is too large to decode safely',
    );
    spy.mockRestore();
  });

  it('rejects images exceeding pixel area limits', async () => {
    const spy = vi.spyOn(sharp.prototype, 'metadata').mockResolvedValueOnce({
      width: 4000,
      height: Math.ceil((MAX_IMAGE_PIXELS + 1) / 4000),
    });

    await expect(decodeQrFile('fake.png')).rejects.toThrow(
      'Image is too large to decode safely',
    );
    spy.mockRestore();
  });

  it('throws when no QR code is found in image', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'qr-test-'));
    const tempFile = join(tempDir, 'blank.png');
    try {
      const blankPng = await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();
      await writeFile(tempFile, blankPng);

      await expect(decodeQrFile(tempFile)).rejects.toThrow(
        'No QR code found in local image',
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('accepts a quoted local image path copied on Windows', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'qr path test-'));
    const tempFile = join(tempDir, 'blank image.png');
    try {
      const blankPng = await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();
      await writeFile(tempFile, blankPng);

      await expect(decodeQrFile(`"${tempFile}"`)).rejects.toThrow(
        'No QR code found in local image',
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('reports image read failures without reflecting the local path', async () => {
    const privatePath = join(tmpdir(), 'private school screenshot.png');
    const promise = decodeQrFile(privatePath);
    await expect(promise).rejects.toThrow('Could not read local QR image');
    await expect(promise).rejects.not.toThrow(privatePath);
  });
});
