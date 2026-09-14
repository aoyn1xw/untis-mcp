import type {
  CapabilityName,
  ProbeDateRange,
  UntisAdapter,
} from '@untis-mcp/untis-client';

export type CapabilityStatus =
  | 'available_with_data'
  | 'available_empty'
  | 'permission_denied'
  | 'unsupported'
  | 'failed';
export interface CapabilityResult {
  status: CapabilityStatus;
  data?: unknown;
  error?: string;
}

export const CAPABILITIES: CapabilityName[] = [
  'timetable_today',
  'timetable_range',
  'timetable_week',
  'exams',
  'homework',
  'absences',
  'inbox',
  'holidays',
  'subjects',
  'rooms',
  'teachers',
  'classes',
  'school_years',
  'time_grid',
  'session_validation',
];
export const DEFAULT_CAPABILITY_TIMEOUT_MS = 15_000;

function isEnvelopeMetadata(key: string): boolean {
  return /^(count|total|totalCount|length|size|status|statusCode|success|ok|error|page|pageSize|offset|limit)$/i.test(
    key,
  );
}

export function hasData(value: unknown): boolean {
  if (
    value === null ||
    value === undefined ||
    value === false ||
    value === ''
  ) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(hasData);
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return false;

    // Inspect array collections first
    const arrayEntries = entries.filter(([, val]) => Array.isArray(val));
    if (arrayEntries.length > 0) {
      const nonMetadataArrays = arrayEntries.filter(
        ([key]) => !isEnvelopeMetadata(key),
      );
      const collectionsToCheck =
        nonMetadataArrays.length > 0 ? nonMetadataArrays : arrayEntries;
      return collectionsToCheck.some(([, arr]) =>
        (arr as unknown[]).some(hasData),
      );
    }

    // If no collections, check non-metadata fields
    const contentEntries = entries.filter(([key]) => !isEnvelopeMetadata(key));
    if (contentEntries.length === 0) return false;
    return contentEntries.some(([, child]) => hasData(child));
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return true;
}

export function classifySuccess(data: unknown): CapabilityResult {
  return {
    status: hasData(data) ? 'available_with_data' : 'available_empty',
    data,
  };
}

export function classifyCapabilitySuccess(
  capability: CapabilityName,
  data: unknown,
): CapabilityResult {
  if (capability === 'session_validation' && data === false) {
    return { status: 'failed', error: 'Session validation failed' };
  }
  if (
    capability === 'absences' &&
    typeof data === 'object' &&
    data !== null &&
    'absences' in data
  ) {
    const absences = (data as { absences?: unknown }).absences;
    if (Array.isArray(absences)) {
      return {
        status: absences.length > 0 ? 'available_with_data' : 'available_empty',
        data,
      };
    }
  }
  if (
    capability === 'inbox' &&
    typeof data === 'object' &&
    data !== null &&
    'incomingMessages' in data
  ) {
    const incomingMessages = (data as { incomingMessages?: unknown })
      .incomingMessages;
    if (Array.isArray(incomingMessages)) {
      return {
        status:
          incomingMessages.length > 0
            ? 'available_with_data'
            : 'available_empty',
        data,
      };
    }
  }
  return classifySuccess(data);
}

export function classifyError(error: unknown): CapabilityResult {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (/permission denied|forbidden|unauthorized/.test(message))
    return { status: 'permission_denied', error: 'Permission denied' };
  if (/not supported|not implemented|unsupported/.test(message))
    return { status: 'unsupported', error: 'Unsupported' };
  return { status: 'failed', error: 'Request failed' };
}

export async function runProbe(
  adapter: UntisAdapter,
  range: ProbeDateRange,
  timeoutMs = DEFAULT_CAPABILITY_TIMEOUT_MS,
): Promise<Record<CapabilityName, CapabilityResult>> {
  const results = {} as Record<CapabilityName, CapabilityResult>;
  await adapter.login({ timeoutMs });
  try {
    for (const capability of CAPABILITIES) {
      try {
        results[capability] = classifyCapabilitySuccess(
          capability,
          await adapter.call(capability, range, { timeoutMs }),
        );
      } catch (error) {
        results[capability] = classifyError(error);
      }
    }
  } finally {
    await adapter.logout({ timeoutMs });
  }
  return results;
}
