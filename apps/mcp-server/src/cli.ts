export type CliMode = 'serve' | 'check' | 'help';

const HELP = `untis-mcp - local, read-only WebUntis MCP server

Usage:
  untis-mcp             Start the MCP server over stdio
  untis-mcp --check     Validate the local credential file without connecting
  untis-mcp --help      Show this help

Environment:
  UNTIS_MCP_CREDENTIALS_FILE  Absolute path to the local JSON credential file

Human-readable server diagnostics use stderr. Stdout is reserved for MCP.
`;

export function helpText(): string {
  return HELP;
}

export function parseCliMode(args: readonly string[]): CliMode {
  if (args.length === 0) return 'serve';
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h'))
    return 'help';
  if (args.length === 1 && args[0] === '--check') return 'check';
  throw new Error('Unknown command-line option. Run untis-mcp --help.');
}

export function safeCliErrorMessage(
  args: readonly string[],
  error: unknown,
): string {
  if (
    error instanceof Error &&
    error.message.startsWith('Unknown command-line')
  )
    return error.message;
  if (args.length === 1 && args[0] === '--check')
    return 'Untis MCP configuration check failed. Verify UNTIS_MCP_CREDENTIALS_FILE.';
  return 'Untis MCP server failed safely. Check local configuration.';
}
