/** Normalize the narrowly supported WebUntis password-login server input. */
export function normalizeServerHost(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Invalid WebUntis server');

  let parsed: URL;
  try {
    parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error('Invalid WebUntis server');
  }

  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash ||
    parsed.port ||
    !parsed.hostname
  ) {
    throw new Error('Invalid WebUntis server');
  }

  return parsed.hostname.toLowerCase();
}
