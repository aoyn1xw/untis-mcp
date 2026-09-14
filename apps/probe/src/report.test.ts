import { mkdir, mkdtemp, readFile, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import type { CapabilityName } from '@untis-mcp/untis-client';
import { CAPABILITIES, type CapabilityResult } from './probe.js';
import { writeReports } from './report.js';

it('writes private raw data and a secret-free structural report', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'untis-probe-'));
  const entries = CAPABILITIES.map((name) => [
    name,
    { status: 'available_empty', data: [] } satisfies CapabilityResult,
  ]);
  const results = Object.fromEntries(entries) as Record<
    CapabilityName,
    CapabilityResult
  >;
  results.exams = {
    status: 'available_with_data',
    data: [
      {
        assignedStudents: [{ id: 99, displayName: 'Fictional Alice' }],
        token: 'SUPERSECRET',
      },
    ],
  };
  await writeReports(results, directory);
  const report = await readFile(join(directory, 'report.json'), 'utf8');
  expect(report).not.toContain('Fictional Alice');
  expect(report).not.toContain('SUPERSECRET');
  expect(report).not.toContain('99');
  expect((await stat(join(directory, 'raw.json'))).mode & 0o777).toBe(0o600);
  expect((await stat(join(directory, 'report.json'))).mode & 0o777).toBe(0o600);
});

it('cleans up its exclusive temporary file when atomic rename fails', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'untis-probe-failure-'));
  await mkdir(join(directory, 'raw.json'));
  const results = Object.fromEntries(
    CAPABILITIES.map((name) => [
      name,
      { status: 'available_empty', data: [] } satisfies CapabilityResult,
    ]),
  ) as Record<CapabilityName, CapabilityResult>;

  await expect(writeReports(results, directory)).rejects.toThrow();
  expect(
    (await readdir(directory)).filter((name) => name.endsWith('.tmp')),
  ).toEqual([]);
});
