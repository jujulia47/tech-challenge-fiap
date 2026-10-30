# Phase 4: domain and application model (Steps 1.1 to 1.3)

**Date:** 2026-10-30

`@bytebank/core` (`packages/core`) holds the domain and application layers of the Clean Architecture refactor. It is pure TypeScript with no runtime dependencies: no React, no Next.js, no date library. **The apps do not use it yet.**

```text
packages/core/src/
  index.ts                         public exports
  domain/
    errors/DomainError.ts
    value-objects/Money.ts
    value-objects/CalendarDate.ts
    transaction/TransactionType.ts
    transaction/Transaction.ts
    transaction/aggregations.ts
  application/
    TransactionDTO.ts
    errors/ApplicationError.ts
    ports/                         TransactionRepository, Clock, IdGenerator
    use-cases/                     List, Create, Update, Delete, GetBalance, GetStatement, GetChartData
  testing/                         test doubles, not exported by index.ts
```

Each file has a test file next to it. Decisions are recorded in [docs/adr](../adr).

## Model

### DomainError

`Error` subclass with a typed `code`:

| Code | Raised by | When |
|---|---|---|
| `MONEY_INVALID_CENTS` | `Money` | Not a safe integer (fractions, `NaN`, `Infinity`, or an arithmetic result out of range) |
| `CALENDAR_DATE_INVALID_FORMAT` | `CalendarDate.fromISO` | Not `YYYY-MM-DD` |
| `CALENDAR_DATE_INVALID_VALUE` | `CalendarDate` | The date does not exist, or the year is outside 1 to 9999 |
| `TRANSACTION_INVALID_ID` | `Transaction` | `id` is empty or blank |
| `TRANSACTION_INVALID_USER_ID` | `Transaction` | `userId` is empty or blank |
| `TRANSACTION_INVALID_TYPE` | `Transaction` | `type` is not a `TransactionType` |
| `TRANSACTION_INVALID_AMOUNT` | `Transaction` | `amount` is not greater than zero |

### Money

Immutable value object holding integer cents ([ADR 0001](../adr/0001-money-in-integer-cents.md)).

- Private constructor. The factories are `Money.fromCents(cents)` and `Money.zero()`.
- `toCents`, `add`, `subtract`, `negate`, `isZero`, `isNegative`, `isPositive`, `equals`, `compare`.
- Invariants: always a safe integer, and `-0` never exists. `add` and `subtract` go through `fromCents`, so overflow throws instead of losing precision.
- It does not format to a currency string. That is presentation.

### CalendarDate

Immutable value object for a calendar day with no time and no timezone ([ADR 0002](../adr/0002-calendar-dates-without-timezone.md)).

- `CalendarDate.fromISO('2022-11-18')` and `CalendarDate.fromParts(year, month, day)`.
- `toISO`, `year`, `month` (1 to 12), `day`, `monthKey` (`'2022-11'`), `subtractMonths`, `isAfter`, `isBefore`, `equals`, `compare`.
- Invariants: the date exists (leap years and month lengths included) and the year is within 1 to 9999, which keeps `YYYY` at four digits.
- It never uses `Date`.

### TransactionType

Seven English codes ([ADR 0003](../adr/0003-english-transaction-type-codes.md)), the `isTransactionType` type guard, and `transactionDirection(type)`.

| Current label | Code | Direction | Assumption |
|---|---|---|---|
| Depósito | `deposit` | income | Obvious |
| Empréstimo e Financiamento | `loan` | income | **Amount received**, not an installment paid |
| Saque | `withdrawal` | expense | Obvious |
| Pagamento | `payment` | expense | Obvious |
| Transferência | `transfer` | expense | **Transfer sent** |
| DOC/TED | `doc_ted` | expense | **Transfer sent** |
| Câmbio de Moeda | `currency_exchange` | expense | **Purchase of foreign currency**, because only a BRL account exists |

There are no Portuguese labels in the core. Mapping codes to labels belongs to the presentation layer.

### Transaction

Entity with `id`, `userId`, `type`, `amount` (`Money`, always the positive magnitude), `date` (`CalendarDate`, the day the transaction happened) and optional `attachment`.

- Private constructor. `Transaction.create(props)` validates the invariants: `id` and `userId` not empty, `type` valid, `amount > 0`.
- Read-only getters. The instance and its props are frozen.
- `monthKey()` delegates to the date.
- `signedAmount()` returns a positive `Money` for income and a negative one for expense.
- `update(changes)` returns a new instance with `type`, `amount`, `date` and/or `attachment` changed, revalidated through `create`. `id` and `userId` never change. `attachment: undefined` removes the attachment, and leaving the key out keeps it.
- `toPrimitives()` returns `{ id, userId, type, amountInCents, date, attachment? }`, and `Transaction.fromPrimitives(...)` is the inverse, through `create`. It accepts `type` as a plain string, so raw storage data is validated rather than cast.

## Direction rule

**There was no direction rule in the code before this step**, so `transactionDirection` is a new business rule, not an extraction. Findings from reading the apps:

- `useBalance` (both zones) only toggles visibility. The balance is the hardcoded `balance="R$ 2.500,00"` in `DashboardWelcome.tsx` and does not reflect the data.
- `CardCharts` sums every amount as positive, including withdrawals and payments.
- `TransactionItem` shows the amount as stored, with the same styling for every type.
- No stored amount is negative: 0 of 7 records in `db.json`, and both forms write `R$ ${formatted}` from a digits-only input. The only `-R$` values are hardcoded sample bills in `apps/dashboard/src/app/cards/page.tsx`, which are not `Transaction`s.

The rule above was approved for Phase 4, with the assumptions listed in the table.

**Intended change to the displayed balance.** Moving from the fixed R$ 2.500,00 to a calculated balance is acceptable and intentional, because today the balance does not reflect the data. With the current `db.json` and this rule, the calculated balance is **R$ 1.150,00**:

| Type | Sum | Signed |
|---|---|---|
| `deposit` (4 records) | R$ 2.800,00 | +R$ 2.800,00 |
| `transfer` | R$ 100,00 | −R$ 100,00 |
| `payment` | R$ 350,00 | −R$ 350,00 |
| `currency_exchange` | R$ 1.200,00 | −R$ 1.200,00 |
| **Balance** | | **R$ 1.150,00** |

**Possible evolution:** the model does not distinguish a transfer sent from one received, because a type maps to a single direction. Supporting received transfers would need new types (for example `transfer_received`) or an explicit direction on the transaction. The same applies to `doc_ted`, `currency_exchange` (selling foreign currency) and `loan` (paying an installment).

## What stays out of the domain

The entity has no clock and no repository. These rules live outside it:

- **"The date cannot be in the future"** and the **balance**: implemented in the use cases (see below).
- **Category suggestion** (amount ≥ R$ 1.000 suggests deposit, otherwise payment): not implemented yet.
- **Attachment size and format** (100 KB, image or PDF). The entity treats `attachment` as an opaque string.
- **Search and pagination.**
- **Formatting and labels** (`R$ 150,00`, Portuguese type names, month names).

## Application layer

`packages/core/src/application` holds the use cases and the ports they depend on (step 1.2). See [ADR 0004](../adr/0004-use-cases-depend-on-ports.md).

### Ports

| Port | Methods | Implemented by |
|---|---|---|
| `TransactionRepository` | `findAllByUser(userId)`, `findById(id, userId)`, `create(transaction)`, `update(transaction)`, `delete(id, userId)`. `create` returns the stored transaction, because a backend may assign its own id, as json-server does. | `HttpTransactionRepository`; `InMemoryTransactionRepository` in tests |
| `Clock` | `today(): CalendarDate` | `SaoPauloClock`; `FixedClock` in tests |
| `IdGenerator` | `next(): string` | `CryptoIdGenerator`; `SequentialIdGenerator` in tests |

`packages/core/src/testing` is not exported by `index.ts`.

### Use cases

Classes with dependencies in the constructor and one `execute` method. Input and output are DTOs made of primitives (`amountInCents`, ISO `date`, `type` code). The presentation layer never receives or builds entities.

| Use case | Input | Output | Rules |
|---|---|---|---|
| `ListTransactions` | `userId` | `TransactionDTO[]` | Newest date first. Ties break on id, in descending plain string order, so the result is deterministic and does not depend on locale. |
| `CreateTransaction` | `{ userId, type, amountInCents, date, attachment? }` | `TransactionDTO` | Id comes from `IdGenerator`. A future date is rejected; today is allowed. Entity invariants still apply. Returns what the repository stored, so the id can differ from the generated one. |
| `UpdateTransaction` | `{ id, userId, changes }` | `TransactionDTO` | Looks up by owner first. The future-date check runs only if the date changed, so an old record can still be edited. In `changes`, `attachment: undefined` removes the attachment and an absent key keeps it. |
| `DeleteTransaction` | `{ id, userId }` | nothing | Looks up by owner first. |
| `GetBalance` | `userId` | `{ amountInCents }` | Sum of `signedAmount()`. It can be negative. |
| `GetStatement` | `userId` | `{ groups: [{ monthKey, transactions: TransactionDTO[] }] }` | Uses `groupByMonth`: newest month first, newest transaction first, years never mixed. |
| `GetChartData` | `{ userId, period }`, where `period` is `3`, `6` or `'all'` | `{ byMonth: [{ monthKey, amountInCents }], byType: [{ type, amountInCents }] }` | Uses `filterByPeriod` with `Clock`, then `totalsByMonth` and `totalsByType`. Magnitudes only. |

`ApplicationError` works like `DomainError`, with the codes `TRANSACTION_NOT_FOUND` and `TRANSACTION_DATE_IN_FUTURE`. A `DomainError` raised by the entity passes through the use cases unchanged.

### Not revealing transactions of other users

`findById` returns `null` both when a transaction does not exist and when it belongs to another user, and the use cases turn both into the same `TRANSACTION_NOT_FOUND`. A caller therefore cannot probe which ids exist. The ownership check also runs before the changes are validated, so a validation error cannot reveal existence either.

### Aggregations

Pure functions over `Transaction[]`, in `domain/transaction/aggregations.ts`. The presentation layer reaches them through `GetStatement` and `GetChartData`, which return DTOs:

| Function | Result |
|---|---|
| `sortNewestFirst(transactions)` | New array, newest date first, ties broken as in `ListTransactions` |
| `groupByMonth(transactions)` | `{ monthKey, transactions }[]`, newest month first, newest transaction first inside each group. Months of different years never mix, because the key includes the year. |
| `filterByPeriod(transactions, months, today)` | `months` is `3`, `6` or `'all'`. Keeps transactions from the start date on (inclusive), with no upper limit. |
| `totalsByMonth(transactions)` | `{ monthKey, amountInCents }[]` in chronological order |
| `totalsByType(transactions)` | `{ type, amountInCents }[]` in `TRANSACTION_TYPES` order, omitting types with no transactions |

**End-of-month rule in `filterByPeriod`.** The start date is the same day N months ago, **clamped to the last day of the target month** when that day does not exist. For example, May 31 minus 3 months is February 28 (February 29 in a leap year), and July 31 minus 3 months is April 30. This keeps the start date inside the target month instead of spilling into the next one. The calculation is `CalendarDate.subtractMonths`.

**Volume versus balance.** Charts use **magnitudes** (volume moved): `totalsByMonth` and `totalsByType` add `amount`, whatever the direction. The balance uses **signed amounts**: `GetBalance` adds `signedAmount()`. So a R$ 350,00 payment adds 350 to the chart and subtracts 350 from the balance. This matches what `CardCharts` shows today.

**Behavior changes compared with the apps, once they adopt these functions:**

- `groupByMonth` in `packages/utils` orders by array position and merges the same month of different years. The core version orders by date and keeps years apart.
- `CardCharts` lists months in the order they first appear and keys them by month name. `totalsByMonth` is chronological and keyed by year and month.
- `CardCharts` computes the 3 and 6 month cutoff with `new Date(year, month - N, day)`, which rolls over at month ends (May 31 minus 3 months becomes March 3). `filterByPeriod` clamps instead.

## Pending items

- **Data migration (step 1.5).** `db.json` still has the legacy format, with no `userId`, so `fromPrimitives` rejects today's records. `migrateTransactions` (step 1.3, see `infrastructure.md`) converts them and assigns the existing user's id (`"1"`). It runs on the real file in step 1.5.
- **Dead code in `ModalEditTransaction.tsx`** (both zones, line 30). `.replace('-R$ ', '')` never has any effect: the previous `.replace('R$ ', '')` already consumes that text, so a negative value would become `-1000` instead of `1000`. Remove it when the form is rewritten. It was not changed in this step.

## Tests and coverage

441 tests pass in total: 89 in `packages/utils`, 215 in `packages/core`, 131 in `packages/infrastructure` and 6 in `packages/design-system`. The core has 100% coverage. The per-file table is in `docs/fase4/testing.md`.
