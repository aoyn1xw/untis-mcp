const SAFE_MESSAGES = [
  'permission denied',
  'forbidden',
  'unauthorized',
  'not supported',
  'not implemented',
];

export function safeError(error: unknown): Error {
  const status =
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'status' in error.response
      ? error.response.status
      : undefined;
  if (status === 401) return new Error('unauthorized');
  if (status === 403) return new Error('forbidden');
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  const safe = SAFE_MESSAGES.find((candidate) => message.includes(candidate));
  return new Error(safe ?? 'WebUntis request failed');
}
