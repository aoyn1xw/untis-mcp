import { describe, expect, it, vi } from 'vitest';
import type { CapabilityName, UntisAdapter } from '@untis-mcp/untis-client';
import {
  CAPABILITIES,
  classifyError,
  classifySuccess,
  runProbe,
} from './probe.js';

describe('classification', () => {
  it('distinguishes populated and empty data', () => {
    expect(classifySuccess([]).status).toBe('available_empty');
    expect(classifySuccess([{ id: 1 }]).status).toBe('available_with_data');
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
