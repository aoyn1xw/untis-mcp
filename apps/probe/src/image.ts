import jsQrModule from 'jsqr';
import sharp from 'sharp';

const decode = jsQrModule as unknown as (
  data: Uint8ClampedArray,
  width: number,
  height: number,
) => { data: string } | null;

export const MAX_IMAGE_WIDTH = 4096;
export const MAX_IMAGE_HEIGHT = 4096;
export const MAX_IMAGE_PIXELS = 16_000_000;

export async function decodeQrFile(path: string): Promise<string> {
  const image = sharp(path);
  const metadata = await image.metadata();

  if (
    metadata.width &&
    metadata.height &&
    (metadata.width > MAX_IMAGE_WIDTH ||
      metadata.height > MAX_IMAGE_HEIGHT ||
      metadata.width * metadata.height > MAX_IMAGE_PIXELS)
  ) {
    throw new Error('Image is too large to decode safely');
  }

  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const decoded = decode(new Uint8ClampedArray(data), info.width, info.height);
  if (!decoded) throw new Error('No QR code found in local image');
  return decoded.data;
}
