# untis-mcp

> **Experimental, unofficial software. This project is not affiliated with or endorsed by Untis GmbH.**

This repository provides a local, tools-only MCP server over stdio. It exposes three read-only tools for the authenticated user's timetable and homework. The original evidence probe remains available for local API research.

QR enrollment is an official Untis Mobile feature. The protocol client in this repository is unofficial and reverse-engineered; it is not an official SDK, and undocumented WebUntis interfaces may change without notice.

## Local MCP server

Prerequisites: Node.js 22+, Corepack, and a local WebUntis account. Install and build with:

```sh
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm build
```

Create an ignored credential file such as `.local/credentials.json`. QR authentication is the recommended mode for SSO accounts:

```json
{
  "method": "qr",
  "profile": "PASTE_QR_PROFILE_HERE"
}
```

Password authentication remains available for compatibility with existing non-SSO installations:

```json
{
  "method": "password",
  "server": "https://example.invalid",
  "school": "SCHOOL_PLACEHOLDER",
  "username": "USERNAME_PLACEHOLDER",
  "password": "PASSWORD_PLACEHOLDER"
}
```

```sh
chmod 600 .local/credentials.json
UNTIS_MCP_CREDENTIALS_FILE="$PWD/.local/credentials.json" corepack pnpm mcp
```

The path environment variable is not itself a secret. Never put credential values in environment variables, command arguments, source control, logs, or client configuration. The server refuses group/world-accessible credential files on POSIX; Windows does not require POSIX mode bits. Stdio is reserved for MCP messages and generic startup diagnostics use stderr.

To inspect the CLI or validate the credential file without contacting
WebUntis:

```sh
corepack pnpm mcp --help
UNTIS_MCP_CREDENTIALS_FILE="$PWD/.local/credentials.json" corepack pnpm mcp --check
```

The normal server command prints a short readiness diagnostic to stderr after
the stdio transport connects. Its stdout remains exclusively MCP protocol data.

A generic MCP client configuration (adjust the command and absolute repository path for the client) is:

```json
{
  "mcpServers": {
    "untis": {
      "command": "corepack",
      "args": ["pnpm", "--dir", "/absolute/path/to/untis-mcp", "mcp"],
      "env": {
        "UNTIS_MCP_CREDENTIALS_FILE": "/absolute/path/to/untis-mcp/.local/credentials.json"
      }
    }
  }
}
```

For a local smoke test, connect an MCP inspector/client to that stdio command, list tools, and call `get_timetable` with `{}`. Authentication is lazy: the first call creates an in-memory session, later calls reuse it, and one rejected expired session causes one reauthentication and retry. Sessions are never persisted.

The available tools are:

- `get_timetable` — minimized timetable output compatible with the original MCP contract;
- `get_weekly_timetable` — richer normalized entries retaining `lessonId`;
- `get_homework` — homework, related lesson/teacher records, and attachment metadata.

## `get_timetable` contract

Input fields are optional strict `YYYY-MM-DD` calendar dates:

- no fields: today;
- only `start_date` or only `end_date`: that one date;
- both fields: an inclusive range of at most 31 calendar dates.

The result contains only `startDate`, `endDate`, `count`, and `lessons`. Every lesson contains `date`, `startTime`, `endTime`, `subjects`, `rooms`, and `status` (`scheduled`, `cancelled`, `irregular`, or `unknown`). Lessons are ordered by date and time. Empty timetables return `count: 0` and `lessons: []`. Teacher/student/class data, identifiers, free text, messages, and raw upstream fields are never returned by this minimized tool.

## Homework and weekly timetable

`get_homework` accepts the same optional `start_date` and `end_date` fields. Homework `id` is its identity; `lessonId` is a separate correlation key. It must not be compared with timetable entry `id`.

`get_weekly_timetable` accepts an optional `date`. Its normalized entries retain `lessonId`, and several periods may share the same value. Applications can correlate `homework.lessonId` with `timetable.lessonId`, but must treat this as a many-to-one-capable relationship.

Attachment metadata is preserved as validated JSON. Attachment downloading is not implemented. Clients should handle `UnsupportedFeatureError` and `InvalidResponseError` gracefully because tenant capabilities and undocumented response shapes vary.

## Unofficial WebUntis client API

The reusable client entry point is `WebUntisClient` from `@untis-mcp/untis-client`. MCP code depends only on this domain API:

```ts
client.getTimetable({ start, end });
client.getWeeklyTimetable(date);
client.getHomework({ start, end });
client.close();
```

These methods return normalized `TimetableEntry`, `Homework`, `Lesson`, `Teacher`, `Subject`, and `Room` models rather than raw WebUntis responses. The current transport maps them to the following observed interfaces:

| Domain operation     | WebUntis interface                                      | Important response behavior                                                                        |
| -------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `getTimetable`       | `POST /WebUntis/jsonrpc.do`, read method `getTimetable` | legacy lesson elements are normalized into stable subject, room, and teacher arrays                |
| `getWeeklyTimetable` | `GET /WebUntis/api/public/timetable/weekly/data`        | the richer weekly response retains timetable `id` and `lessonId` separately                        |
| `getHomework`        | `GET /WebUntis/api/homeworks/lessons`                   | runtime data is validated as the complete `records`, `homeworks`, `teachers`, and `lessons` object |

QR login uses `POST /WebUntis/jsonrpc_intern.do` with the WebUntis mobile/OTP login method. The generated OTP and resulting session identifier remain in process memory. The transport owns cookies and protocol payloads; callers and MCP tools never construct them. A fail-closed allowlist permits only required authentication/session-control operations, explicitly approved JSON-RPC reads, and exact approved GET paths.

The endpoint paths and response formats above are undocumented implementation details and can change independently of this package. They are documented here for maintainers, not as a claim of official Untis API compatibility.

## Evidence probe

Run the separate interactive research probe with `corepack pnpm probe`. It can inspect broader read-only capability shapes and writes private raw results under `.local/probe/`; it is not part of the MCP public contract. Treat QR images/profiles and raw results as private, and delete probe output promptly.

To import a locally saved WebUntis QR screenshot into the ignored MCP credential
file without displaying its secret payload, run
`corepack pnpm import-qr .local/webuntis-qr.png .local/credentials.json`.

## Development

```sh
corepack pnpm test
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm format:check
corepack pnpm build
```

All committed tests and fixtures are fictional and require no network or WebUntis account. See [architecture](docs/architecture.md), [API research](docs/api-research.md), and [security](docs/security.md).

MIT licensed.
