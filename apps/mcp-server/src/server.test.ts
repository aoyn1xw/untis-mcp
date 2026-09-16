import { afterEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { TimetableAdapter } from '@untis-mcp/untis-client';
import { createMcpServer } from './server.js';

const raw = [
  {
    id: 777,
    date: 20260916,
    startTime: 815,
    endTime: 945,
    su: [{ name: 'Digital Design' }],
    ro: [{ name: 'K409' }],
    te: [{ name: 'Private Teacher' }],
    info: 'private note',
    token: 'fixture-secret',
  },
];
let close: (() => Promise<void>) | undefined;
async function connected() {
  const adapter: TimetableAdapter = {
    login: () => Promise.resolve(),
    logout: () => Promise.resolve(),
    getOwnTimetable: () => Promise.resolve(raw),
  };
  const server = createMcpServer(adapter, {
    now: () => new Date(2026, 8, 16, 12),
  });
  const client = new Client({ name: 'test', version: '1' });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  close = async () => {
    await client.close();
    await server.close();
  };
  return client;
}
afterEach(async () => close?.());
describe('MCP server', () => {
  it('discovers exactly the read-only timetable tool and no other feature', async () => {
    const client = await connected();
    const listed = await client.listTools();
    expect(listed.tools.map((x) => x.name)).toEqual(['get_timetable']);
    expect(listed.tools[0]?.inputSchema).toMatchObject({
      type: 'object',
      additionalProperties: false,
    });
    expect(listed.tools[0]?.annotations?.readOnlyHint).toBe(true);
    expect(client.getServerCapabilities()).toMatchObject({ tools: {} });
    expect(client.getServerCapabilities()).not.toHaveProperty('resources');
    expect(client.getServerCapabilities()).not.toHaveProperty('prompts');
  });
  it('calls with no arguments and returns structured and text output', async () => {
    const result = await (
      await connected()
    ).callTool({ name: 'get_timetable', arguments: {} });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      startDate: '2026-09-16',
      endDate: '2026-09-16',
      count: 1,
      lessons: [{ subjects: ['Digital Design'], rooms: ['K409'] }],
    });
    const serialized = JSON.stringify(result);
    for (const value of [
      '777',
      'Private Teacher',
      'private note',
      'fixture-secret',
    ])
      expect(serialized).not.toContain(value);
  });
  it('accepts an explicit date range', async () => {
    const result = await (
      await connected()
    ).callTool({
      name: 'get_timetable',
      arguments: { start_date: '2026-09-15', end_date: '2026-09-16' },
    });
    expect(result.structuredContent).toMatchObject({
      startDate: '2026-09-15',
      endDate: '2026-09-16',
    });
  });
  it('returns protocol errors for invalid and unknown input', async () => {
    const client = await connected();
    expect(
      (
        await client.callTool({
          name: 'get_timetable',
          arguments: { start_date: 'not-a-date' },
        })
      ).isError,
    ).toBe(true);
    expect(
      (
        await client.callTool({
          name: 'get_timetable',
          arguments: { surprise: true },
        })
      ).isError,
    ).toBe(true);
  });
});
