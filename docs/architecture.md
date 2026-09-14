# Architecture

## Milestone boundary

The probe application orchestrates calls through `UntisAdapter`; it does not expose HTTP or MCP. Sanitization is a separate package and sees adapter-independent `unknown` values. This separation prevents future MCP tool contracts from inheriting unofficial wrapper response types.

`LegacyJsonRpcAdapter` is a replaceable compatibility edge around `webuntis`. It owns login, method mapping, and safe error translation. School-specific behavior is measured rather than asserted. A future `OfficialPlatformAdapter` should implement the same narrow domain boundary using the official Untis Platform API, without changing MCP tools.

## Intended system

The first MCP release will be **tools-only MCP v1**; resources may be considered after stable schemas exist. It will expose explicitly read-only operations—no attendance changes, messages, bookings, or other writes. Each self-hosted deployment connects exactly one Untis account.

Two transports are planned: local stdio for desktop clients and remote Streamable HTTP. Node.js on Render is the initial deployment target. A later Cloudflare-specific adapter may replace Node persistence/networking pieces; this milestone adds none of that infrastructure.

The eventual layers are:

1. MCP tools with stable, minimal schemas and authorization.
2. account-independent read-only application services.
3. replaceable Untis adapters (`LegacyJsonRpcAdapter`, later `OfficialPlatformAdapter`).
4. allowlist-based output minimization and encrypted persistence.

Production MCP, OAuth, HTTP/Hono, databases, deployment definitions, official authentication, and multi-user support remain out of scope.
