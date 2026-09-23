import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TimetableService, validateTimetableRange } from '@untis-mcp/timetable';
import type { WebUntisDomainApi } from '@untis-mcp/untis-client';

const lessonSchema = z.object({
  date: z.iso.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  subjects: z.array(z.string()),
  rooms: z.array(z.string()),
  status: z.enum(['scheduled', 'cancelled', 'irregular', 'unknown']),
});
const outputSchema = {
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  count: z.number().int().nonnegative(),
  lessons: z.array(lessonSchema),
};

const entitySchema = z.object({
  id: z.number().int().optional(),
  name: z.string(),
  longName: z.string().optional(),
});
const timetableEntrySchema = z.object({
  id: z.number().int(),
  lessonId: z.number().int().optional(),
  date: z.iso.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  subjects: z.array(entitySchema),
  rooms: z.array(entitySchema),
  teachers: z.array(entitySchema),
  status: z.enum(['scheduled', 'cancelled', 'irregular', 'unknown']),
});
const homeworkOutputSchema = {
  records: z.array(
    z.object({
      homeworkId: z.number().int(),
      teacherId: z.number().int(),
      elementIds: z.array(z.number().int()),
    }),
  ),
  homeworks: z.array(
    z.object({
      id: z.number().int(),
      lessonId: z.number().int(),
      date: z.iso.date(),
      dueDate: z.iso.date(),
      text: z.string(),
      remark: z.string(),
      completed: z.boolean(),
      attachments: z.array(
        z.object({ metadata: z.record(z.string(), z.unknown()) }),
      ),
    }),
  ),
  teachers: z.array(entitySchema),
  lessons: z.array(
    z.object({
      id: z.number().int(),
      subject: entitySchema,
      lessonType: z.string(),
    }),
  ),
};

const rangeInput = z
  .object({
    start_date: z.iso.date().optional(),
    end_date: z.iso.date().optional(),
  })
  .strict();

function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'WebUntis request failed';
  if (
    [
      'Invalid WebUntis response',
      'Unsupported WebUntis feature',
      'Authentication failed',
      'Permission denied',
      'WebUntis request timed out',
      'Unsupported timetable response',
    ].includes(error.message)
  )
    return error.message;
  if (/unauthorized|authentication/i.test(error.message))
    return 'Authentication failed';
  if (/forbidden|permission denied/i.test(error.message))
    return 'Permission denied';
  if (/timeout|timed out/i.test(error.message))
    return 'WebUntis request timed out';
  return 'WebUntis request failed';
}

function success(structuredContent: Record<string, unknown>) {
  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(structuredContent) },
    ],
    structuredContent,
  };
}

function failure(error: unknown) {
  return {
    content: [{ type: 'text' as const, text: errorMessage(error) }],
    isError: true as const,
  };
}

export function createMcpServer(
  client: WebUntisDomainApi,
  options?: { now?: () => Date; timeoutMs?: number },
): McpServer {
  const server = new McpServer({ name: 'untis-mcp', version: '0.2.0' });
  const service = new TimetableService(
    client,
    options?.timeoutMs,
    options?.now,
  );
  server.registerTool(
    'get_timetable',
    {
      title: 'Get own timetable',
      description:
        "Read-only: returns the authenticated student's own timetable for today or a bounded range of local school/calendar dates.",
      inputSchema: rangeInput,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (input) => {
      try {
        const result = await service.getTimetable(input);
        return success({ ...result });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'get_weekly_timetable',
    {
      title: 'Get own weekly timetable',
      description:
        'Read-only: returns the authenticated student timetable with lessonId correlation keys.',
      inputSchema: z.object({ date: z.iso.date().optional() }).strict(),
      outputSchema: { entries: z.array(timetableEntrySchema) },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ date }) => {
      try {
        const range = validateTimetableRange(
          { start_date: date, end_date: date },
          options?.now?.() ?? new Date(),
        );
        const entries = await client.getWeeklyTimetable(
          range.adapterRange.start,
          { timeoutMs: options?.timeoutMs },
        );
        return success({ entries });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'get_homework',
    {
      title: 'Get homework',
      description:
        'Read-only: returns normalized homework, lesson correlation IDs, and attachment metadata without downloading files.',
      inputSchema: rangeInput,
      outputSchema: homeworkOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (input) => {
      try {
        const range = validateTimetableRange(
          input,
          options?.now?.() ?? new Date(),
        );
        const result = await client.getHomework(range.adapterRange, {
          timeoutMs: options?.timeoutMs,
        });
        return success({ ...result });
      } catch (error) {
        return failure(error);
      }
    },
  );
  return server;
}
