import { describe, expect, it } from 'vitest';
import { UnsupportedFeatureError } from './errors.js';
import { assertReadOnlyRequest } from './read-only-guard.js';

describe('read-only transport guard', () => {
  it.each([
    ['GET', '/WebUntis/api/homeworks/lessons', undefined],
    ['GET', '/WebUntis/api/public/timetable/weekly/data', undefined],
    ['POST', '/WebUntis/jsonrpc_intern.do', { method: 'getUserData2017' }],
    ['POST', '/WebUntis/jsonrpc.do', { method: 'authenticate' }],
    ['POST', '/WebUntis/jsonrpc.do', { method: 'getTimetable' }],
    ['POST', '/WebUntis/jsonrpc.do', { method: 'logout' }],
  ])('allows %s %s', (method, url, data) => {
    expect(() => assertReadOnlyRequest({ method, url, data })).not.toThrow();
  });

  it.each([
    ['GET', '/WebUntis/api/unknown', undefined],
    ['POST', '/WebUntis/jsonrpc.do', { method: 'saveHomework' }],
    ['POST', '/WebUntis/jsonrpc_intern.do', { method: 'deleteSomething' }],
    ['PUT', '/WebUntis/api/homeworks/lessons', undefined],
    ['DELETE', '/WebUntis/api/homeworks/lessons', undefined],
  ])('rejects %s %s', (method, url, data) => {
    expect(() => assertReadOnlyRequest({ method, url, data })).toThrow(
      UnsupportedFeatureError,
    );
  });

  it('rejects malformed JSON-RPC payloads', () => {
    expect(() =>
      assertReadOnlyRequest({
        method: 'POST',
        url: '/WebUntis/jsonrpc.do',
        data: { params: {} },
      }),
    ).toThrow(UnsupportedFeatureError);
  });
});
