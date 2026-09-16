#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { LegacyJsonRpcAdapter } from '@untis-mcp/untis-client';
import { loadCredentialsFromEnvironment } from './config.js';
import { createMcpServer } from './server.js';

async function main(): Promise<void> {
  const credentials = await loadCredentialsFromEnvironment();
  const server = createMcpServer(new LegacyJsonRpcAdapter(credentials));
  await server.connect(new StdioServerTransport());
}

main().catch(() => {
  process.stderr.write(
    'Untis MCP server failed safely. Check local configuration.\n',
  );
  process.exitCode = 1;
});
