const SAFE_MESSAGES = [
  'permission denied',
  'forbidden',
  'unauthorized',
  'not supported',
  'not implemented',
];

export function safeError(error: unknown): Error {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  const safe = SAFE_MESSAGES.find((candidate) => message.includes(candidate));
  return new Error(safe ?? 'WebUntis request failed');
}
