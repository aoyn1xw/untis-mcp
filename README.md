# untis-mcp

> **Experimental, unofficial software. This project is not affiliated with or endorsed by Untis GmbH.**

This first milestone is a local evidence probe for discovering which read-only WebUntis data a particular student account and school expose. It is deliberately **not an MCP server** yet.

## Credential warning

A WebUntis QR profile contains a reusable TOTP secret. Treat the profile string and its screenshot like a password. Never paste either into an issue, commit, chat, URL, or shared report. The probe decodes image files locally, makes only WebUntis requests, and writes private raw results under ignored `.local/`.

## Run the local probe

Prerequisites: Node.js 22+ and Corepack.

```sh
corepack enable
pnpm install
pnpm probe
```

Choose a local QR screenshot, hidden pasted profile, or username/password login. Password login accepts a hostname or origin-only HTTPS URL. Do not pass secrets as command-line arguments. The date interval is capped at 31 days and each capability has a 15-second timeout. After every capability is attempted, the probe logs out and creates:

- `.local/probe/raw.json` — private school data; never share it.
- `.local/probe/report.json` — deny-by-default sanitized structural evidence intended for inspection and sharing.

Image pixels and pasted credentials stay in memory and are not persisted by the probe. Output files are created with mode `0600` where supported. Delete `.local/probe/` when finished.

## Development

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

All committed tests and fixtures are fictional; CI needs no WebUntis account. See [architecture](docs/architecture.md), [API research](docs/api-research.md), and [security](docs/security.md).

MIT licensed.
