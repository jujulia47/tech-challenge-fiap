# ADR 0001: Money in integer cents

**Status:** Accepted (2026-10-30)

## Context

Amounts are stored today as formatted strings (`"R$ 2.500,00"`) and parsed back with string replacements in several places (`parseBRL` in `CardCharts`, the edit form). Arithmetic happens in floating point. The characterization tests in `docs/fase4/testing.md` recorded the consequences: `formatCents` silently rounds fractional cents, accepts `NaN` and `Infinity`, and can produce `-0,00`. Floating point also cannot represent most decimal values exactly.

## Decision

The domain represents money as the `Money` value object, which holds an integer number of cents.

- `Money.fromCents` accepts only safe integers (`Number.isSafeInteger`) and throws `DomainError` otherwise.
- `add` and `subtract` go through the same validation, so overflow throws instead of losing precision.
- `-0` is normalized to `0`.
- `Money` does not format. Currency strings are a presentation concern.
- The currency is implicitly BRL, because only one account currency exists.

## Consequences

- Arithmetic is exact, and invalid amounts fail at the boundary instead of reaching the UI as `NaN`.
- Storage must move from formatted strings to integer cents (`amountInCents`), which needs a data migration.
- Every layer that receives user input must convert to cents before calling the domain, and every view must format on the way out.
- The limit is `Number.MAX_SAFE_INTEGER` cents, about R$ 90 trillion, which is far above any realistic amount.
- Supporting more currencies later would require adding a currency to `Money`.
