# ADR 0006: Clock in the São Paulo timezone

**Status:** Accepted (2026-10-30)

## Context

"The date cannot be in the future" depends on what "today" means, and `filterByPeriod` starts from it too. ADR 0002 keeps time zones out of the domain, so the `Clock` adapter has to decide. The local time of the machine is not a reliable answer: Vercel runs in UTC, the Docker images have no timezone configured, and only the browser is in the user's zone. At 22:00 in São Paulo it is already tomorrow in UTC, and a server using UTC would accept a date that is still in the future for the user, or read "today" as the wrong day.

## Decision

`SaoPauloClock` always returns the calendar day in `America/Sao_Paulo`, using `Intl.DateTimeFormat` with an explicit `timeZone`. It does not depend on the timezone of the process.

The current instant comes from a function injected in the constructor, with `new Date()` as the default, so tests can fix it.

## Consequences

- Client and server agree on "today", wherever they run.
- `Intl` handles daylight saving rules, so no offset is hardcoded.
- Tests cover the day change around 03:00 UTC, plus the turn of the month and of the year.
- All users share one reference timezone. This fits a single-country bank, but a user in another timezone would see São Paulo's date. Supporting that would need a user timezone and another `Clock`.
- The runtime needs timezone data. Node 20 and modern browsers ship it.
