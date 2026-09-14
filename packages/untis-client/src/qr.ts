import { z } from 'zod';

export const qrProfileSchema = z.object({
  url: z.string().min(1),
  school: z.string().min(1),
  user: z.string().min(1),
  key: z.string().min(1),
  schoolNumber: z.string().optional(),
});

export type QrProfile = z.infer<typeof qrProfileSchema>;

export function parseQrProfile(value: string): QrProfile {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Invalid WebUntis QR profile');
  }
  if (url.protocol !== 'untis:' || url.hostname !== 'setschool') {
    throw new Error('Invalid WebUntis QR profile');
  }
  const parsed = qrProfileSchema.safeParse(
    Object.fromEntries(url.searchParams),
  );
  if (!parsed.success) throw new Error('Invalid WebUntis QR profile');
  return parsed.data;
}
