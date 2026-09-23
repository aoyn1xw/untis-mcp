# Security model

## Trust boundaries

The operator's terminal, the local Node process, the configured credential file, and WebUntis are inside the credential/data boundary. Git, reports, logs, shell history, issue trackers, MCP clients, and unrelated services are outside it.

A QR profile is a reusable credential: its key can generate login OTP values. QR keys, passwords, OTPs, cookies, session identifiers, access tokens, authorization headers, usernames, emails, and personal school data must never occur in logs, URLs, errors, fixtures, reports, or committed files. The credential environment variable contains a file path, not credential material.

## Authentication and session handling

QR/mobile authentication is the recommended mode. The QR key is read from the ignored local credential file and is never logged. Generated OTPs exist only transiently in process memory. The resulting `JSESSIONID` and any other cookie state remain in the HTTP client's in-memory cookie jar and are never persisted.

One client and session manager are shared by all MCP calls. Authentication is lazy and valid sessions are reused. An authentication rejection invalidates the in-memory session and permits exactly one authentication-and-read retry. A second rejection fails, preventing loops. Shutdown clears the client-side session state; no browser profile or browser cookie extraction is used.

## Read-only enforcement

The transport boundary has a fail-closed allowlist for exact GET endpoint paths, explicitly approved JSON-RPC read methods, and the narrowly required login/logout methods. It rejects unknown endpoints, unknown methods, malformed URLs, non-GET REST requests, and domain write operations before network access. Domain and MCP code cannot manually construct cookie headers or JSON-RPC payloads.

No code path implements homework changes, completion toggles, timetable changes, uploads, deletes, or account changes. The legacy research probe is protected by the same transport guard.

## Data minimization and validation

All server and wrapper responses are untrusted. Runtime normalizers create explicit internal models and reject malformed structures with `InvalidResponseError`; raw responses never become MCP structured output. The compact timetable tool remains deliberately minimized. The weekly and homework tools expose the fields required for read-only use, which may include lesson, teacher, subject, room, homework text, remarks, and attachment metadata. Attachment download is not implemented, and attachment structures remain only partially understood.

MCP clients receive the normalized school data returned by the selected tools and must therefore be trusted with it. Test fixtures use fictional identifiers and text only. Stable generic errors avoid leaking response bodies, cookies, credentials, or stack traces.

## Research probe data

The optional evidence probe can write sensitive raw results beneath git-ignored `.local/`. Those files should use restrictive permissions where supported and be deleted promptly. Its shareable sanitizer is deny-by-default and reports structures rather than personal values. Sanitized reports still require inspection before publication.
