# Architecture

## Milestone 2 boundary

The local server is a tools-only MCP vertical slice over stdio. `apps/mcp-server` owns protocol registration, structured output, stdio startup, and credential-file loading. `packages/timetable` owns calendar-range validation, the stable public timetable model, legacy allowlist normalization, serialized session lifecycle, timeouts, and safe application errors. `packages/untis-client` remains the replaceable WebUntis edge.

`LegacyJsonRpcAdapter` implements both boundaries:

- the deliberately opaque `UntisAdapter.call()` used by the evidence probe; and
- the narrow typed timetable capability (`login`, `getOwnTimetable`, `logout`) used by the application service.

The typed method still returns `unknown` because unofficial wrapper/server data is untrusted until normalized. MCP schemas never import `webuntis` declarations. The normalizer recognizes the legacy `Lesson[]` shape declared by `webuntis` 2.2.1 and constructs every public property explicitly; it never spreads or falls back to serializing upstream records.

## Request lifecycle

The MCP factory accepts an injected adapter so protocol tests use fictional data. It registers only `get_timetable`. Each validated request enters a per-service promise queue, logs in, fetches the student's own range, normalizes it, and logs out in `finally`. Operations use a 15-second default bound. Validation happens before the queue or adapter is contacted. Successful calls include both MCP structured content and a compact JSON text block.

The stdio entry point loads one local credential file from `UNTIS_MCP_CREDENTIALS_FILE`, constructs the legacy adapter, and connects the official TypeScript MCP SDK stdio transport. Stdout belongs exclusively to MCP framing; there is no interactive input.

## Deferred system

A future `OfficialPlatformAdapter` may implement the same narrow domain boundary after official API access is researched. Streamable HTTP, OAuth, databases, encrypted persistence, multi-user support, deployment definitions, caching, resources, prompts, other data domains, and every write operation remain out of scope. No compatibility claim is made for every school/server response shape.
