import { describe, expect, it } from 'vitest';
import { helpText, parseCliMode, safeCliErrorMessage } from './cli.js';

describe('MCP command line', () => {
  it('defaults to stdio server mode', () => {
    expect(parseCliMode([])).toBe('serve');
  });

  it.each([['--help'], ['-h']])('supports help via %s', (option) => {
    expect(parseCliMode([option])).toBe('help');
    expect(helpText()).toContain('Stdout is reserved for MCP');
  });

  it('supports a local configuration check', () => {
    expect(parseCliMode(['--check'])).toBe('check');
  });

  it('rejects unknown or combined options', () => {
    expect(() => parseCliMode(['--wat'])).toThrow('untis-mcp --help');
    expect(() => parseCliMode(['--help', '--check'])).toThrow(
      'untis-mcp --help',
    );
  });

  it('reports actionable errors without reflecting sensitive details', () => {
    const sensitive = new Error('bad secret at a private path');
    expect(safeCliErrorMessage(['--check'], sensitive)).toBe(
      'Untis MCP configuration check failed. Verify UNTIS_MCP_CREDENTIALS_FILE.',
    );
    expect(safeCliErrorMessage([], sensitive)).not.toContain(sensitive.message);
  });
});
