import { describe, expect, it, vi } from 'vitest';
import type { CapabilityName, UntisAdapter } from '@untis-mcp/untis-client';
import {
  CAPABILITIES,
  classifyCapabilitySuccess,
  classifyError,
  classifySuccess,
  runProbe,
} from './probe.js';

describe('classification', () => {
  it('distinguishes populated and empty data', () => {
    expect(classifySuccess([]).status).toBe('available_empty');
    expect(classifySuccess([{ id: 1 }]).status).toBe('available_with_data');
  });

  it('correctly classifies response envelopes with metadata', () => {
    expect(classifySuccess({ items: [], count: 0, success: true }).status).toBe(
      'available_empty',
    );
    expect(
      classifySuccess({ items: [{ id: 1 }], count: 1, success: true }).status,
    ).toBe('available_with_data');
  });

  it('correctly classifies absences envelopes', () => {
    expect(
      classifyCapabilitySuccess('absences', {
        absences: [],
        excuseStatuses: true,
        showAbsenceReasonChange: false,
      }).status,
    ).toBe('available_empty');
    expect(
      classifyCapabilitySuccess('absences', {
        absences: [{ id: 1 }],
        excuseStatuses: true,
      }).status,
    ).toBe('available_with_data');
  });

  it('correctly classifies inbox envelopes', () => {
    expect(
      classifyCapabilitySuccess('inbox', {
        incomingMessages: [],
      }).status,
    ).toBe('available_empty');
    expect(
      classifyCapabilitySuccess('inbox', {
        incomingMessages: [{ id: 1 }],
      }).status,
    ).toBe('available_with_data');
  });

  it('distinguishes safe errors without reflecting details', () => {
    expect(classifyError(new Error('403 Forbidden token=secret'))).toEqual({
      status: 'permission_denied',
      error: 'Permission denied',
    });
    expect(classifyError(new Error('Not implemented')).status).toBe(
      'unsupported',
    );
    expect(
      JSON.stringify(classifyError(new Error('secret exploded'))),
    ).not.toContain('secret');
  });
});

it('continues after an endpoint failure and logs out', async () => {
  const called: CapabilityName[] = [];
  const logout = vi.fn();
  const adapter: UntisAdapter = {
    login: vi.fn(),
    logout,
    call: vi.fn((name: CapabilityName) => {
      called.push(name);
      return name === 'exams'
        ? Promise.reject(new Error('boom'))
        : Promise.resolve([]);
    }),
  };
  const results = await runProbe(adapter, {
    start: new Date('2026-01-01'),
    end: new Date('2026-01-07'),
  });
  expect(called).toEqual(CAPABILITIES);
  expect(results.exams.status).toBe('failed');
  expect(results.homework.status).toBe('available_empty');
  expect(logout).toHaveBeenCalledOnce();
});

it('passes a transport timeout to login, logout, and each endpoint and continues probing', async () => {
  const options: unknown[] = [];
  const loginOptions: unknown[] = [];
  const logoutOptions: unknown[] = [];
  const adapter: UntisAdapter = {
    login: vi.fn((opt) => {
      loginOptions.push(opt);
      return Promise.resolve();
    }),
    logout: vi.fn((opt) => {
      logoutOptions.push(opt);
      return Promise.resolve();
    }),
    call: (name, _range, callOptions) => {
      options.push(callOptions);
      return name === 'timetable_today'
        ? Promise.reject(new Error('timeout'))
        : Promise.resolve(name === 'session_validation');
    },
  };
  const results = await runProbe(
    adapter,
    { start: new Date('2026-01-01'), end: new Date('2026-01-07') },
    5,
  );
  expect(results.timetable_today).toEqual({
    status: 'failed',
    error: 'Request failed',
  });
  expect(results.timetable_range.status).toBe('available_empty');
  expect(results.session_validation.status).toBe('available_with_data');
  expect(options).toEqual(CAPABILITIES.map(() => ({ timeoutMs: 5 })));
  expect(loginOptions).toEqual([{ timeoutMs: 5 }]);
  expect(logoutOptions).toEqual([{ timeoutMs: 5 }]);
});

it('classifies a false session validation result as failed', async () => {
  const adapter: UntisAdapter = {
    login: vi.fn(),
    logout: vi.fn(),
    call: () => Promise.resolve(false),
  };
  const results = await runProbe(adapter, {
    start: new Date('2026-01-01'),
    end: new Date('2026-01-07'),
  });
  expect(results.session_validation).toEqual({
    status: 'failed',
    error: 'Session validation failed',
  });
});
