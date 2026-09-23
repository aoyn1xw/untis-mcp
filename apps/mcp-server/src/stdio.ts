#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { LegacyJsonRpcAdapter } from '@untis-mcp/untis-client';
import { helpText, parseCliMode, safeCliErrorMessage } from './cli.js';
import { loadCredentialsFromEnvironment } from './config.js';
import { createMcpServer } from './server.js';

async function main(): Promise<void> {
  const mode = parseCliMode(process.argv.slice(2));
  if (mode === 'help') {
    process.stdout.write(helpText());
    return;
  }
  const credentials = await loadCredentialsFromEnvironment();
  if (mode === 'check') {
    process.stdout.write(
      'Untis MCP configuration is valid. No network request was made.\n',
    );
    return;
  }
  const server = createMcpServer(new LegacyJsonRpcAdapter(credentials));
  await server.connect(new StdioServerTransport());
  process.stderr.write(
    'Untis MCP server ready on stdio (tool: get_timetable).\n',
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${safeCliErrorMessage(process.argv.slice(2), error)}\n`,
  );
  process.exitCode = 1;
});
