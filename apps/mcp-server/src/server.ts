import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TimetableService } from '@untis-mcp/timetable';
import type { TimetableAdapter } from '@untis-mcp/untis-client';

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

export function createMcpServer(
  adapter: TimetableAdapter,
  options?: { now?: () => Date; timeoutMs?: number },
): McpServer {
  const server = new McpServer({ name: 'untis-mcp', version: '0.2.0' });
  const service = new TimetableService(
    adapter,
    options?.timeoutMs,
    options?.now,
  );
  server.registerTool(
    'get_timetable',
    {
      title: 'Get own timetable',
      description:
        "Read-only: returns the authenticated student's own timetable for today or a bounded range of local school/calendar dates.",
      inputSchema: z
        .object({
          start_date: z.iso.date().optional(),
          end_date: z.iso.date().optional(),
        })
        .strict(),
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
        const structuredContent = { ...result };
        return {
          content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
          structuredContent,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'WebUntis request failed';
        return { content: [{ type: 'text', text: message }], isError: true };
      }
    },
  );
  return server;
}
