# ADR 0002: Calendar dates without timezone

**Status:** Accepted (2026-10-30)

## Context

A transaction happens on a calendar day. It has no meaningful time of day. JavaScript's `Date` is an instant, and `new Date('2022-11-18')` parses an ISO date as UTC midnight. In Brazil (UTC−3) that instant is still November 17, so the day silently changes when it is read in local time. The current forms avoid this with workarounds such as appending `'T00:00:00'`, and dates are stored as `dd/mm/yyyy` strings.

## Decision

The domain represents dates as the `CalendarDate` value object: year, month and day as plain integers, with no time and no timezone.

- `fromISO` validates the `YYYY-MM-DD` format with a regular expression and parses the numbers manually. `fromParts` validates that the date exists (leap years and month lengths).
- The domain never uses `new Date(string)` or `Date.parse`. `CalendarDate` does not use `Date` at all.
- Years are limited to 1 to 9999, so `toISO` always has four year digits and zero-padded ISO strings sort chronologically. `compare` relies on this.
- `monthKey()` (`'2022-11'`) includes the year, unlike the current `month` field, which merges the same month of different years.

## Consequences

- A date reads the same in any timezone. A test runs under several `TZ` values to document this.
- Storage must move from `dd/mm/yyyy` to `YYYY-MM-DD`, which needs a data migration.
- "Today" is not available in the domain. Rules that depend on the clock, such as "the date cannot be in the future", belong to the use cases, which must decide the reference timezone (`America/Sao_Paulo`) when building a `CalendarDate` for today.
- If a time of day is ever needed, for example to order transactions within a day, it must be a separate field.
