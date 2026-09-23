import { UnsupportedFeatureError } from './errors.js';

const GET_ENDPOINTS = new Set([
  '/WebUntis/api/app/config',
  '/WebUntis/api/classreg/absences/students',
  '/WebUntis/api/daytimetable/config',
  '/WebUntis/api/exams',
  '/WebUntis/api/homeworks/lessons',
  '/WebUntis/api/public/news/newsWidgetData',
  '/WebUntis/api/public/timetable/weekly/data',
  '/WebUntis/api/rest/view/v1/messages',
  '/WebUntis/api/token/new',
]);

const JSON_RPC_METHODS = new Map<string, ReadonlySet<string>>([
  ['/WebUntis/jsonrpc_intern.do', new Set(['getUserData2017'])],
  [
    '/WebUntis/jsonrpc.do',
    new Set([
      'authenticate',
      'getCurrentSchoolyear',
      'getDepartments',
      'getHolidays',
      'getKlassen',
      'getLatestImportTime',
      'getRooms',
      'getSchoolyears',
      'getStatusData',
      'getStudents',
      'getSubjects',
      'getTeachers',
      'getTimegridUnits',
      'getTimetable',
      'logout',
    ]),
  ],
]);

export interface TransportRequestShape {
  method?: string | undefined;
  url?: string | undefined;
  data?: unknown;
}

function requestPath(url: string | undefined): string {
  if (!url) throw new UnsupportedFeatureError();
  return new URL(url, 'https://webuntis.invalid').pathname;
}

function rpcMethod(data: unknown): string {
  if (typeof data !== 'object' || data === null || Array.isArray(data))
    throw new UnsupportedFeatureError();
  const method = (data as Record<string, unknown>).method;
  if (typeof method !== 'string') throw new UnsupportedFeatureError();
  return method;
}

/** Fail-closed boundary for every request emitted by the unofficial client. */
export function assertReadOnlyRequest(request: TransportRequestShape): void {
  const method = (request.method ?? 'GET').toUpperCase();
  const path = requestPath(request.url);

  if (method === 'GET' && GET_ENDPOINTS.has(path)) return;
  if (method === 'POST') {
    const allowed = JSON_RPC_METHODS.get(path);
    if (allowed?.has(rpcMethod(request.data))) return;
  }
  throw new UnsupportedFeatureError();
}
