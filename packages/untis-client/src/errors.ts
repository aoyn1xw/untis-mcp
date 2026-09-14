const SAFE_MESSAGES = [
  'permission denied',
  'forbidden',
  'unauthorized',
  'not supported',
  'not implemented',
  'timeout',
  'timed out',
];

export function safeError(error: unknown): Error {
  const status =
    typeof error === 'object' && error !== null
      ? ((
          error as {
            response?: { status?: unknown };
            status?: unknown;
            statusCode?: unknown;
          }
        ).response?.status ??
        (error as { status?: unknown }).status ??
        (error as { statusCode?: unknown }).statusCode)
      : undefined;

  if (status === 401) return new Error('unauthorized');
  if (status === 403) return new Error('forbidden');

  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (/status code 401\b/.test(message)) return new Error('unauthorized');
  if (/status code 403\b/.test(message)) return new Error('forbidden');

  const safe = SAFE_MESSAGES.find((candidate) => message.includes(candidate));
  return new Error(safe ?? 'WebUntis request failed');
}
