const SAFE_MESSAGES = [
  'permission denied',
  'forbidden',
  'unauthorized',
  'not supported',
  'not implemented',
  'timeout',
  'timed out',
];

export class UnsupportedFeatureError extends Error {
  constructor(message = 'Unsupported WebUntis feature') {
    super(message);
    this.name = 'UnsupportedFeatureError';
  }
}

export class InvalidResponseError extends Error {
  constructor(message = 'Invalid WebUntis response') {
    super(message);
    this.name = 'InvalidResponseError';
  }
}

export class AuthenticationError extends Error {
  constructor() {
    super('unauthorized');
    this.name = 'AuthenticationError';
  }
}

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

  if (status === 401) return new AuthenticationError();
  if (status === 403) return new Error('forbidden');

  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (/status code 401\b/.test(message)) return new AuthenticationError();
  if (/status code 403\b/.test(message)) return new Error('forbidden');

  const safe = SAFE_MESSAGES.find((candidate) => message.includes(candidate));
  return new Error(safe ?? 'WebUntis request failed');
}
