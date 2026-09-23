# WebUntis API research

This project uses unofficial, reverse-engineered WebUntis interfaces. QR enrollment is an official Untis feature, but this protocol implementation is not affiliated with or endorsed by Untis and must not be described as an official SDK. Availability varies by tenant, module licensing, server version, and account permission.

## Current protocol evidence

The installed `webuntis` wrapper provides QR/TOTP authentication and maintains the resulting WebUntis session in memory. The client currently needs these read-only protocol families:

| Domain operation | Observed interface                               | Normalization rule                                                                         |
| ---------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Timetable range  | legacy JSON-RPC timetable method                 | convert legacy `su`, `ro`, and `te` elements into stable subject, room, and teacher models |
| Weekly timetable | `GET /WebUntis/api/public/timetable/weekly/data` | preserve the richer `lessonId` and element arrays                                          |
| Homework         | `GET /WebUntis/api/homeworks/lessons`            | validate the complete `records`, `homeworks`, `teachers`, and `lessons` envelope           |

The runtime homework response is deliberately treated as more authoritative than the wrapper's TypeScript declaration. `homework.id` is its identity; `homework.lessonId` is stored separately and can correlate with weekly timetable entries. This is not assumed to be one-to-one because one lesson can span multiple timetable periods.

Homework attachment metadata is retained as validated JSON-compatible data, but its detailed schema is not yet considered stable and downloading is not implemented.

## Safety constraints

All HTTP access passes through an exact allowlist. Approved JSON-RPC read and authentication/session-control methods and approved GET paths are enumerated in code; everything else fails closed. The session manager performs at most one automatic reauthentication attempt after an authentication rejection. QR secrets, OTPs, cookies, and session identifiers are never placed in fixtures or logs.

## Remaining unknowns

- Endpoint and response differences across other schools and WebUntis releases.
- The complete attachment metadata variants and any supported read-only download mechanism.
- Exact expiration behavior and status codes across tenants.
- Long-term availability of the legacy JSON-RPC and undocumented REST-like interfaces.
- Whether a suitable official Untis Platform API can replace these interfaces for this account type.

Applications should treat `UnsupportedFeatureError` and `InvalidResponseError` as expected compatibility failures and degrade gracefully. The existing sanitized evidence probe remains available for investigating a tenant mismatch without widening the MCP output or storing credentials in the repository.
