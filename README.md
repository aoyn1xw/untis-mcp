# untis-mcp

> **Experimental, unofficial software. This project is not affiliated with or endorsed by Untis GmbH.**

Milestone 2 provides a local, tools-only MCP server over stdio. It exposes exactly one read-only tool, `get_timetable`, for the authenticated student's own timetable. The original evidence probe remains available for local API research.

## Local MCP server

Prerequisites: Node.js 22+, Corepack, and a local WebUntis account. Install and build with:

```sh
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm build
```

Create an ignored credential file such as `.local/credentials.json`, and restrict it on POSIX systems:

```json
{
  "method": "password",
  "server": "https://example.invalid",
  "school": "SCHOOL_PLACEHOLDER",
  "username": "USERNAME_PLACEHOLDER",
  "password": "PASSWORD_PLACEHOLDER"
}
```

Alternatively, use a WebUntis QR profile (the complete profile is a reusable secret):

```json
{
  "method": "qr",
  "profile": "PASTE_QR_PROFILE_HERE"
}
```

```sh
chmod 600 .local/credentials.json
UNTIS_MCP_CREDENTIALS_FILE="$PWD/.local/credentials.json" corepack pnpm mcp
```

The path environment variable is not itself a secret. Never put credential values in environment variables, command arguments, source control, logs, or client configuration. The server refuses group/world-accessible credential files on POSIX; Windows does not require POSIX mode bits. Stdio is reserved for MCP messages and generic startup diagnostics use stderr.

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

For a local smoke test, connect an MCP inspector/client to that stdio command, list tools, and call `get_timetable` with `{}`. This logs in, fetches today's local school/calendar date, and logs out. No real-account validation was performed in Codex Cloud; wrapper and school compatibility still requires this local test.

## `get_timetable` contract

Input fields are optional strict `YYYY-MM-DD` calendar dates:

- no fields: today;
- only `start_date` or only `end_date`: that one date;
- both fields: an inclusive range of at most 31 calendar dates.

The result contains only `startDate`, `endDate`, `count`, and `lessons`. Every lesson contains `date`, `startTime`, `endTime`, `subjects`, `rooms`, and `status` (`scheduled`, `cancelled`, `irregular`, or `unknown`). Lessons are ordered by date and time. Empty timetables return `count: 0` and `lessons: []`. Teacher/student/class data, identifiers, free text, messages, and raw upstream fields are never returned.

## Evidence probe

Run the separate interactive research probe with `corepack pnpm probe`. It can inspect broader read-only capability shapes and writes private raw results under `.local/probe/`; it is not part of the MCP public contract. Treat QR images/profiles and raw results as private, and delete probe output promptly.

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
