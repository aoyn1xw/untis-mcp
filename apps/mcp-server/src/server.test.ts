import { afterEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type {
  HomeworkResult,
  TimetableEntry,
  WebUntisDomainApi,
} from '@untis-mcp/untis-client';
import { createMcpServer } from './server.js';

const timetable = [
  {
    id: 777,
    date: '2026-09-16',
    startTime: '08:15',
    endTime: '09:45',
    subjects: [{ name: 'Digital Design' }],
    rooms: [{ name: 'K409' }],
    teachers: [{ name: 'Synthetic Teacher' }],
    status: 'scheduled' as const,
    info: 'private note',
    token: 'fixture-secret',
  },
];
const weekly: TimetableEntry[] = [
  { ...timetable[0]!, id: 801, lessonId: 44 },
  {
    ...timetable[0]!,
    id: 802,
    lessonId: 44,
    startTime: '09:45',
    endTime: '10:30',
  },
];
const homework: HomeworkResult = {
  records: [{ homeworkId: 91, teacherId: 8, elementIds: [5] }],
  homeworks: [
    {
      id: 91,
      lessonId: 44,
      date: '2026-09-16',
      dueDate: '2026-09-18',
      text: 'Synthetic assignment',
      remark: '',
      completed: false,
      attachments: [{ metadata: { fileName: 'example.pdf' } }],
    },
  ],
  teachers: [{ id: 8, name: 'Synthetic Teacher' }],
  lessons: [
    {
      id: 44,
      subject: { id: 5, name: 'Digital Design' },
      lessonType: 'lesson',
    },
  ],
};
let close: (() => Promise<void>) | undefined;
async function connected(
  timetableResponse: TimetableEntry[] = timetable,
  overrides: Partial<WebUntisDomainApi> = {},
) {
  const domain: WebUntisDomainApi = {
    getTimetable: () => Promise.resolve(timetableResponse),
    getWeeklyTimetable: () => Promise.resolve(weekly),
    getHomework: () => Promise.resolve(homework),
    close: () => Promise.resolve(),
    ...overrides,
  };
  const server = createMcpServer(domain, {
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
  it('discovers only the three read-only domain tools', async () => {
    const client = await connected();
    const listed = await client.listTools();
    expect(listed.tools.map((x) => x.name)).toEqual([
      'get_timetable',
      'get_weekly_timetable',
      'get_homework',
    ]);
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
      'Synthetic Teacher',
      'private note',
      'fixture-secret',
    ])
      expect(serialized).not.toContain(value);
  });
  it('returns normalized homework and preserves lesson correlation', async () => {
    const client = await connected();
    const homeworkResult = await client.callTool({
      name: 'get_homework',
      arguments: {
        start_date: '2026-09-16',
        end_date: '2026-09-18',
      },
    });
    const weeklyResult = await client.callTool({
      name: 'get_weekly_timetable',
      arguments: { date: '2026-09-16' },
    });
    expect(homeworkResult.structuredContent).toMatchObject({
      homeworks: [{ id: 91, lessonId: 44 }],
    });
    expect(weeklyResult.structuredContent).toMatchObject({
      entries: [{ lessonId: 44 }, { lessonId: 44 }],
    });
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
  it.each(['2026-09-15', '2026-09-17'])(
    'rejects an upstream lesson outside the requested range: %s',
    async (date) => {
      const result = await (
        await connected([
          {
            ...timetable[0]!,
            date,
          },
        ])
      ).callTool({
        name: 'get_timetable',
        arguments: { start_date: '2026-09-16' },
      });
      expect(result).toMatchObject({
        isError: true,
        content: [{ type: 'text', text: 'Unsupported timetable response' }],
      });
      expect(result).not.toHaveProperty('structuredContent');
    },
  );
});
