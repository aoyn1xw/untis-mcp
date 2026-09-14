import jsQrModule from 'jsqr';
import sharp from 'sharp';

const decode = jsQrModule as unknown as (
  data: Uint8ClampedArray,
  width: number,
  height: number,
) => { data: string } | null;

export async function decodeQrFile(path: string): Promise<string> {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const decoded = decode(new Uint8ClampedArray(data), info.width, info.height);
  if (!decoded) throw new Error('No QR code found in local image');
  return decoded.data;
}
