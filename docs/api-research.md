# WebUntis API research

This document separates wrapper evidence from facts that must be measured locally. Availability varies by school, module licensing, server version, and account permissions.

## Online evidence

The installed [`webuntis` 2.2.1 package](https://www.npmjs.com/package/webuntis) and its [published TypeScript source](https://github.com/SchoolUtils/WebUntis) are the primary evidence for the adapter's current method names. The package declares password and QR/TOTP authentication plus methods for own/range/weekly timetables, exams, homework, absences, inbox, holidays, subjects, rooms, teachers, classes, school years, time grid, and session validation.

Its published types indicate that legacy `Lesson` values can contain date/time, classes, teachers, subjects, rooms, student groups, cancellation/irregular codes, and several free-text fields. `Exam.assignedStudents` can include display names and numeric IDs, so values must never pass automatically. Homework attachments are typed as unknown. The richer weekly method has element arrays and substitution state not present in the older lesson shape. These are wrapper declarations—not guarantees about any school.

The maintainer has reportedly warned that the legacy JSON-RPC API may be retired around **2027**. This is an unconfirmed possibility, not a shutdown date; it requires ongoing verification. The intended long-term integration is the official [Untis Platform](https://platform.untis.at/) API, with an `OfficialPlatformAdapter` added after access and authentication are researched. Untis also publishes its [WebUntis help center](https://help.untis.at/) as the primary product reference.

## Expected response categories

| Probe capability       | Wrapper method                                       | Expected category (not asserted shape) | Must verify locally                  |
| ---------------------- | ---------------------------------------------------- | -------------------------------------- | ------------------------------------ |
| Today / date range     | `getOwnTimetableForToday`, `getOwnTimetableForRange` | lesson arrays                          | element/text variants, permission    |
| Weekly timetable       | `getOwnTimetableForWeek`                             | richer timetable array                 | format and availability              |
| Exams                  | `getExamsForRange`                                   | exam array                             | assigned students, grades, scope     |
| Homework               | `getHomeWorksFor`                                    | homework array                         | attachment shape and access          |
| Absences               | `getAbsentLesson`                                    | object containing absences             | own-user filtering and permission    |
| Inbox                  | `getInbox`                                           | incoming-message object                | preview/free-text exposure           |
| Holidays / master data | corresponding getters                                | arrays                                 | fields, emptiness, school-year rules |
| Classes                | `getCurrentSchoolyear` then `getClasses`             | class array                            | student-account permission           |
| Session                | `validateSession`                                    | boolean-like                           | expiry behavior                      |

The adapter disables redundant per-call session validation after an explicit login to bound request volume. It probes each endpoint once (classes additionally needs the current school year), caps ranges at 31 days, applies a 15-second timeout to each capability, isolates failures and timeouts, and logs out in `finally`. Password-login server input is restricted to a bare hostname or origin-only HTTPS URL and normalized to its hostname.

## Local findings worksheet

Do not paste raw records here. Record only inspected, sanitized report facts.

| Date      | School/server pseudonym | Capability | Classification | Sanitized shape notes                           | Needs follow-up |
| --------- | ----------------------- | ---------- | -------------- | ----------------------------------------------- | --------------- |
| _not run_ | —                       | —          | —              | Clone and run locally with a consenting account | yes             |

Still requiring real-account verification: authentication compatibility, QR URL variations, exact error codes, every returned field/nullable variant, empty-result behavior, weekly endpoint availability, permissions, attachments, rate limits, and clean logout/session invalidation.
