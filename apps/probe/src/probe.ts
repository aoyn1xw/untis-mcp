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

function hasData(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object')
    return Object.values(value).some(hasData);
  return (
    value !== null && value !== undefined && value !== false && value !== ''
  );
}

export function classifySuccess(data: unknown): CapabilityResult {
  return {
    status: hasData(data) ? 'available_with_data' : 'available_empty',
    data,
  };
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
): Promise<Record<CapabilityName, CapabilityResult>> {
  const results = {} as Record<CapabilityName, CapabilityResult>;
  await adapter.login();
  try {
    for (const capability of CAPABILITIES) {
      try {
        results[capability] = classifySuccess(
          await adapter.call(capability, range),
        );
      } catch (error) {
        results[capability] = classifyError(error);
      }
    }
  } finally {
    await adapter.logout();
  }
  return results;
}
