# Architecture

## Read-only client boundary

The integration is split into four layers:

1. `SessionManager` owns lazy authentication, in-memory session reuse, invalidation, and one bounded reauthentication attempt.
2. `ReadOnlyWebUntisTransport` owns HTTP, cookies, JSON serialization, protocol errors, and the fail-closed endpoint/method allowlist.
3. `WebUntisClient` exposes stable domain operations and normalizes untrusted responses into `Homework`, `Lesson`, `TimetableEntry`, `Teacher`, `Subject`, and `Room` values.
4. `apps/mcp-server` validates tool inputs and calls only domain operations. It contains no endpoint paths, cookie names, OTP logic, or JSON-RPC method names.

The existing `LegacyJsonRpcAdapter` remains for the bounded evidence probe. It uses the same read-only request guard, but it is not the MCP application's domain boundary.

## Request lifecycle

The stdio entry point loads one local credential file from `UNTIS_MCP_CREDENTIALS_FILE` and creates one `WebUntisClient` for the process. Authentication is lazy. A valid QR-authenticated WebUntis session is reused across MCP calls and is never persisted. If an operation is rejected as unauthenticated, the session is invalidated, authentication is performed once, and the read is retried once. A second rejection is returned as an error; there is no retry loop.

The transport accepts only exact approved GET paths, approved read-only JSON-RPC methods, and the narrowly required authentication/session-control methods. Unknown paths, methods, HTTP verbs, and write operations fail closed before an HTTP request is sent. The domain layer validates and normalizes every response instead of exposing wrapper or server objects.

The MCP server currently registers `get_timetable`, `get_weekly_timetable`, and `get_homework`. The compact timetable tool preserves its established output. The richer weekly tool preserves `lessonId`; homework keeps its own `id` and separate `lessonId`. Their relationship is correlation only: one lesson can occupy multiple timetable periods.

## Unofficial protocol status

QR enrollment is an official Untis feature, but this client uses unofficial, reverse-engineered interfaces and is not an official SDK. The underlying JSON-RPC and REST-like endpoints may change without notice. Callers should handle `UnsupportedFeatureError` and `InvalidResponseError` gracefully.

An official platform adapter can later implement the same domain boundary if suitable access and authentication become available. Browser-cookie extraction, Chrome dependencies, session persistence, Streamable HTTP, databases, multi-user deployments, uploads, deletes, and all other write operations remain out of scope.
