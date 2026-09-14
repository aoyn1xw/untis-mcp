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

async function loadImage(path: string) {
  const image = sharp(path);
  return { image, metadata: await image.metadata() };
}

export async function decodeQrFile(path: string): Promise<string> {
  const trimmedPath = path.trim();
  const first = trimmedPath[0];
  const normalizedPath =
    trimmedPath.length >= 2 &&
    (first === '"' || first === "'") &&
    trimmedPath.at(-1) === first
      ? trimmedPath.slice(1, -1)
      : trimmedPath;

  const { image, metadata } = await loadImage(normalizedPath).catch(() => {
    throw new Error('Could not read local QR image');
  });

  if (
    metadata.width &&
    metadata.height &&
    (metadata.width > MAX_IMAGE_WIDTH ||
      metadata.height > MAX_IMAGE_HEIGHT ||
      metadata.width * metadata.height > MAX_IMAGE_PIXELS)
  ) {
    throw new Error('Image is too large to decode safely');
  }

  const decodedImage = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .catch(() => {
      throw new Error('Could not read local QR image');
    });
  const { data, info } = decodedImage;
  const decoded = decode(new Uint8ClampedArray(data), info.width, info.height);
  if (!decoded) throw new Error('No QR code found in local image');
  return decoded.data;
}
