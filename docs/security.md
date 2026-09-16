# Security model

## Trust boundaries

The operator's terminal, memory of the local Node process, `.local/probe/raw.json`, and WebUntis are inside the credential/data boundary. Git, reports, logs, shell history, issue trackers, MCP clients, and every unrelated service are outside it. The probe sends requests only to the configured WebUntis server and never uploads QR screenshots or reports.

A QR profile is a **reusable credential**, not merely configuration: its `key` can generate login TOTP values. The screenshot, URI, key, password, cookies, JWT/access tokens, authorization headers, session identifiers, usernames, and emails must never occur in logs, URLs, errors, fixtures, or reports. Secret prompts are hidden on a TTY and no secret is accepted as a CLI argument.

## Probe data

Raw results can contain names, attendance, messages, exams, and free text. They remain under git-ignored `.local/`, use restrictive directory/file modes (`0700`/`0600`) where supported, and should be deleted promptly. The final terminal summary contains only capability names and classifications.

The shareable sanitizer is deny-by-default. It recursively records only field names, scalar types, nulls, array lengths, at most three sanitized examples, and salted pseudonymous identifier relationships. String, boolean, numeric, status, state, code, and all other scalar values are omitted; internal identifiers become local pseudonyms. This is structural evidence, not permission to publish without inspection.

Object keys use an explicit deny-by-default strategy: known-safe structural API schema keys (such as `lessons`, `teachers`, `subjects`, `rooms`, `absences`, `incomingMessages`, and standard envelope metadata) are preserved verbatim so reports reveal what schema fields the school's server exposes. Dynamic, unrecognized, or user-controlled dictionary keys (such as filenames, email addresses, display names, numeric IDs, tokens, or prototype keys) are replaced with letter-only salted pseudonyms (`ref_[a-p]{12}`) using a per-report random salt. This trade-off balances structural discoverability against the risk of dynamic map keys leaking sensitive student data.

## Future design

Stored Untis credentials will eventually use encrypted SQLite with AES-256-GCM, a unique nonce per value, authenticated metadata, and a deployment key outside the database. MCP OAuth will authenticate an MCP client separately from WebUntis authentication. Downstream tokens will never be passed through to Untis or vice versa. Least privilege, single-account deployments, output minimization, and a read-only policy remain mandatory.

## Local MCP server

The stdio server reads credentials from the JSON file named by `UNTIS_MCP_CREDENTIALS_FILE`; it accepts no secret CLI arguments or interactive stdin. The variable contains a path, not credential material. Keep the file under ignored `.local/` with mode `0600`. Group/world permission bits cause startup refusal on POSIX, while Windows does not depend on POSIX modes. File contents, paths, usernames, school names, raw failures, and server responses are never logged.

Credentials exist only in process memory. Every tool call validates its date range before network access, serializes use of the single legacy session, logs in, fetches once, and attempts logout in `finally`, including failures and timeouts. There is no persistence, cache, or background polling.

MCP output is an explicit allowlist. It contains only dates, times, subject display strings, room display strings, and a small status enum. Raw objects, IDs, teachers, students, classes/groups, free text, substitutions/messages, tokens, cookies, attachments, and unknown fields cannot pass through. Unsupported data and upstream failures become stable generic errors without response values or stack traces. The connected MCP client is still outside the credential boundary but receives timetable data; operators must trust it with those minimized records.
