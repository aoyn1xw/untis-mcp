# Security model

## Trust boundaries

The operator's terminal, memory of the local Node process, `.local/probe/raw.json`, and WebUntis are inside the credential/data boundary. Git, reports, logs, shell history, issue trackers, MCP clients, and every unrelated service are outside it. The probe sends requests only to the configured WebUntis server and never uploads QR screenshots or reports.

A QR profile is a **reusable credential**, not merely configuration: its `key` can generate login TOTP values. The screenshot, URI, key, password, cookies, JWT/access tokens, authorization headers, session identifiers, usernames, and emails must never occur in logs, URLs, errors, fixtures, or reports. Secret prompts are hidden on a TTY and no secret is accepted as a CLI argument.

## Probe data

Raw results can contain names, attendance, messages, exams, and free text. They remain under git-ignored `.local/`, use restrictive directory/file modes (`0700`/`0600`) where supported, and should be deleted promptly. The final terminal summary contains only capability names and classifications.

The shareable sanitizer is allowlist-oriented and deny-by-default. It recursively records field names, types, nulls, array lengths, booleans, a small allowlist of enum-like values, and salted pseudonymous identifier relationships. All ordinary and unknown strings are replaced; numeric values are reduced to their types; internal identifiers become local pseudonyms. Only three array examples are retained. This is structural evidence, not permission to publish without inspection.

## Future design

Stored Untis credentials will eventually use encrypted SQLite with AES-256-GCM, a unique nonce per value, authenticated metadata, and a deployment key outside the database. MCP OAuth will authenticate an MCP client separately from WebUntis authentication. Downstream tokens will never be passed through to Untis or vice versa. Least privilege, single-account deployments, output minimization, and a read-only policy remain mandatory.
