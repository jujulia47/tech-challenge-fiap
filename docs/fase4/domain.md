# Domain and use cases

Requirement: Clean Architecture. `@bytebank/core` (`packages/core`) holds the domain and the application layers. It is pure TypeScript with no runtime dependency: no React, no Next.js, no date library, no `node:crypto`. Everything else depends on it, and it depends on nothing; the ESLint layer rules enforce this ([conventions.md](../conventions.md#layers)). The zones reach it through the bff.

| Decision | ADR |
|---|---|
| Money as integer cents | [0001](../adr/0001-money-in-integer-cents.md) |
| Calendar dates without timezone | [0002](../adr/0002-calendar-dates-without-timezone.md) |
| English type codes, each with a direction | [0003](../adr/0003-english-transaction-type-codes.md) |
| Use cases depend on ports | [0004](../adr/0004-use-cases-depend-on-ports.md) |

```text
packages/core/src/
  index.ts                 public exports
  domain/
    errors/                DomainError
    value-objects/         Money, CalendarDate, bankDayOf
    transaction/           Transaction, TransactionType, aggregations, typeSuggestion
    user/                  User, passwordPolicy
  application/
    ports/                 the interfaces the use cases need
    use-cases/             transactions, authentication, recovery, account
    errors/                ApplicationError, RateLimitedError
    emails/                the text of the reset email
  testing/                 in-memory ports and fakes, exported only as @bytebank/core/testing
```

Each file has its test next to it. `@bytebank/core/testing` is declared in `exports`, and any other deep import of the core fails.

## Model

### Money

Immutable value object holding integer cents.

- Private constructor; factories `Money.fromCents(cents)` and `Money.zero()`.
- `toCents`, `add`, `subtract`, `negate`, `isZero`, `isNegative`, `isPositive`, `equals`, `compare`.
- Always a safe integer, and `-0` never exists. `add` and `subtract` go through `fromCents`, so overflow throws instead of losing precision.
- It does not format to a currency string: that is presentation (`@bytebank/utils`).

### CalendarDate

Immutable value object for a calendar day with no time and no timezone.

- `CalendarDate.fromISO('2022-11-18')` and `CalendarDate.fromParts(year, month, day)`.
- `toISO`, `year`, `month` (1 to 12), `day`, `monthKey` (`'2022-11'`), `subtractMonths`, `isAfter`, `isBefore`, `equals`, `compare`.
- The date exists (leap years and month lengths included) and the year is within 1 to 9999. It never uses `Date`.
- `bankDayOf(instant)` gives the calendar day of an instant in São Paulo, the one rule behind `SaoPauloClock` on the server and `BrowserClock` on the screens ([ADR 0006](../adr/0006-clock-in-sao-paulo-timezone.md)).

### TransactionType

Seven English codes, the `isTransactionType` type guard, and `transactionDirection(type)`. There are no Portuguese labels in the core; the presentation maps codes to labels.

| Label | Code | Direction | Assumption |
|---|---|---|---|
| Depósito | `deposit` | income | Obvious |
| Empréstimo e Financiamento | `loan` | income | **Amount received**, not an installment paid |
| Saque | `withdrawal` | expense | Obvious |
| Pagamento | `payment` | expense | Obvious |
| Transferência | `transfer` | expense | **Transfer sent** |
| DOC/TED | `doc_ted` | expense | **Transfer sent** |
| Câmbio de Moeda | `currency_exchange` | expense | **Purchase of foreign currency**, because only a BRL account exists |

### Transaction

Entity with `id`, `userId`, `type`, `amount` (`Money`, always the positive magnitude), `date` (`CalendarDate`) and an optional `attachment`, which the entity treats as an opaque string.

- Private constructor. `Transaction.create(props)` validates: `id` and `userId` not blank, `type` valid, `amount > 0`. The instance and its props are frozen.
- `signedAmount()` is positive for income and negative for expense. `monthKey()` delegates to the date.
- `update(changes)` returns a new instance, revalidated through `create`. `id` and `userId` never change. `attachment: undefined` removes the attachment, and leaving the key out keeps it.
- `toPrimitives()` returns `{ id, userId, type, amountInCents, date, attachment? }`, and `Transaction.fromPrimitives(...)` is the inverse, through `create`. It accepts `type` as a plain string, so raw storage data is validated, never cast.

### User

`User` holds id, name, email and the password hash, which never leaves the application: use cases return `UserDTO`. The name is trimmed and has from 1 to 100 characters, counted as characters; the email is trimmed and lower-cased. `passwordPolicy.ts` holds the rules of a new password ([security.md](security.md#password-policy)).

### DomainError

An `Error` subclass with a typed `code`:

| Code | Raised by | When |
|---|---|---|
| `MONEY_INVALID_CENTS` | `Money` | Not a safe integer (fractions, `NaN`, `Infinity`, or an arithmetic result out of range) |
| `CALENDAR_DATE_INVALID_FORMAT` | `CalendarDate.fromISO` | Not `YYYY-MM-DD` |
| `CALENDAR_DATE_INVALID_VALUE` | `CalendarDate` | The date does not exist, or the year is outside 1 to 9999 |
| `TRANSACTION_INVALID_ID`, `TRANSACTION_INVALID_USER_ID` | `Transaction` | Empty or blank |
| `TRANSACTION_INVALID_TYPE` | `Transaction` | Not a `TransactionType` |
| `TRANSACTION_INVALID_AMOUNT` | `Transaction` | Not greater than zero |

Plus the codes of `User` and of the password policy.

## The direction rule and the balance

Before Phase 4 there was no direction rule in the code, so `transactionDirection` is a new business rule, approved with the assumptions in the table above. What the old screens did:

- The balance was a fixed `balance="R$ 2.500,00"` in `DashboardWelcome.tsx`, unrelated to the data.
- `CardCharts` summed every amount as positive, withdrawals and payments included.
- `TransactionItem` showed every type with the same styling.
- No stored amount was negative (0 of 7 records), and the only `-R$` values were hardcoded sample bills on the cards page.

With the seed and this rule, the balance is **R$ 1.150,00**:

| Type | Sum | Signed |
|---|---|---|
| `deposit` (4 records) | R$ 2.800,00 | +R$ 2.800,00 |
| `transfer` | R$ 100,00 | −R$ 100,00 |
| `payment` | R$ 350,00 | −R$ 350,00 |
| `currency_exchange` | R$ 1.200,00 | −R$ 1.200,00 |
| **Balance** | | **R$ 1.150,00** |

**Volume versus balance.** Charts use magnitudes (volume moved): `totalsByMonth` and `totalsByType` add `amount`, whatever the direction. The balance uses signed amounts: `GetBalance` adds `signedAmount()`. A R$ 350,00 payment adds 350 to the chart and subtracts 350 from the balance.

## Ports

| Port | Methods | Implemented by |
|---|---|---|
| `TransactionRepository` | `findAllByUser(userId)`, `findById(id, userId)`, `create`, `update`, `delete(id, userId)`. `create` returns the stored transaction, because a backend may assign its own id | json-server and Supabase adapters, wrapped by the attachment cipher; `InMemoryTransactionRepository` in tests |
| `UserRepository` | `findByEmail`, `findById`, `create`, `updateName`, `updatePasswordHash`. Each update sends one field, so a change of the name cannot undo a change of the password made at the same time | json-server and Supabase adapters |
| `PasswordResetTokens` | `create`, `findByHash`, `markUsed` (claimed once), `invalidateAllOfUser`, plus the token generator (`generate`, `hash`) | json-server and Supabase adapters; `CryptoResetTokenGenerator` |
| `TransactionStatistics` | `summary()`, the counts of `/sobre` | json-server and Supabase adapters |
| `RateLimiter` | `consume`, `release`, `reset` | memory and Postgres limiters |
| `PasswordHasher`, `CommonPasswordList`, `DataCipher`, `EmailSender` | hash and verify; `has`; `encrypt` and `decrypt` with the owner as context; `send` | scrypt, static lists, AES-GCM, SMTP or disabled |
| `Clock` | `today(): CalendarDate` | `SaoPauloClock`, `BrowserClock`; `FixedClock` in tests |
| `IdGenerator` | `next(): string` | `CryptoIdGenerator`; `SequentialIdGenerator` in tests |

The adapters are described in [infrastructure.md](infrastructure.md).

## Use cases

Classes with their ports in the constructor and one `execute` method. Input and output are DTOs made of primitives (`amountInCents`, ISO `date`, type code), so the presentation never receives or builds entities.

| Use case | Input | Output | Rules |
|---|---|---|---|
| `ListTransactions` | `userId` | `TransactionDTO[]` | Newest date first. Ties break on id, in descending plain string order, so the result is deterministic and does not depend on locale |
| `CreateTransaction` | `{ userId, type, amountInCents, date, attachment? }` | `TransactionDTO` | Id from `IdGenerator`. A future date is refused; today is allowed. Returns what the repository stored |
| `UpdateTransaction` | `{ id, userId, changes }` | `TransactionDTO` | Looks up by owner first. The future-date check runs only if the date changed, so an old record can still be edited |
| `DeleteTransaction` | `{ id, userId }` | nothing | Looks up by owner first |
| `GetBalance` | `userId` | `{ amountInCents }` | Sum of `signedAmount()`. It can be negative |
| `GetStatement` | `userId` | `{ groups: [{ monthKey, transactions }] }` | Newest month first, newest transaction first, years never mixed |
| `GetChartData` | `{ userId, period, type? }`, `period` is `3`, `6` or `'all'` | `{ byMonth, byType }` | `filterByPeriod` with the `Clock`, then the totals. `type` narrows `byMonth` only: the pie is what the type is chosen from, so filtering both would leave one slice and no way to change the choice |
| `AuthenticateUser`, `RegisterUser` | email, password, name | `UserDTO` or nothing | [security.md](security.md#login-and-registration) |
| `RequestPasswordReset`, `ResetPassword` | email; token and password | nothing | [security.md](security.md#password-recovery) |
| `UpdateUserProfile` | `{ userId, name }` | `UserDTO` | The rule of the name lives in `User`, so a registration and a profile agree. A user that no longer exists answers `INVALID_CREDENTIALS` |
| `ChangePassword` | `{ userId, currentPassword, newPassword }` | nothing | Consumes the login limiter by email, verifies the current password, refuses an unchanged one (`PASSWORD_UNCHANGED`), applies the policy through `hashNewPassword` ([security.md](security.md#account-changing-the-name-and-the-password)) |

`ApplicationError` works like `DomainError`, with codes such as `TRANSACTION_NOT_FOUND`, `TRANSACTION_DATE_IN_FUTURE` and those of authentication and the account. A `DomainError` raised by an entity passes through unchanged.

**Not revealing other users' transactions.** `findById` returns `null` both when a transaction does not exist and when it belongs to another user, and the use cases turn both into the same `TRANSACTION_NOT_FOUND`. The ownership check runs before the changes are validated, so a validation error cannot reveal existence either.

### Account

"Minha conta" uses `UpdateUserProfile` and `ChangePassword`. The routes, the session update and the limits are in [security.md](security.md#account-changing-the-name-and-the-password).

### Rules that left the screens

| Rule | Before | Now |
|---|---|---|
| Type suggestion | An expression in `CardNewTransaction` | `suggestTransactionType(amountInCents)` in the domain: R$ 1.000 or more suggests deposit, otherwise payment. It is a hint for the form and decides nothing, so no use case calls it |
| "Today" in São Paulo | `toLocaleDateString` in the form, a copy of the rule of the server clock | `bankDayOf(instant)` in the domain, called by both clocks |
| "The date cannot be in the future" | A string comparison in the form | The same `assertDateNotInFuture` as `CreateTransaction`, with `BrowserClock` |

`BrowserClock` lives in `@bytebank/utils` because the screens cannot import `@bytebank/infrastructure`, which is server code. It holds no rule of its own.

## Aggregations

Pure functions over `Transaction[]`, in `domain/transaction/aggregations.ts`, reached by the screens through `GetStatement` and `GetChartData`:

| Function | Result |
|---|---|
| `sortNewestFirst(transactions)` | New array, newest date first, ties broken as in `ListTransactions` |
| `groupByMonth(transactions)` | `{ monthKey, transactions }[]`, newest month first, newest transaction first. The key includes the year, so months of different years never mix |
| `filterByPeriod(transactions, months, today)` | `months` is `3`, `6` or `'all'`. Keeps transactions from the start date on (inclusive) |
| `totalsByMonth(transactions)` | `{ monthKey, amountInCents }[]` in chronological order |
| `totalsByType(transactions)` | `{ type, amountInCents }[]` in `TRANSACTION_TYPES` order, omitting types with no transactions |

**End of month in `filterByPeriod`.** The start date is the same day N months ago, **clamped to the last day of the target month** when that day does not exist: May 31 minus 3 months is February 28 (29 in a leap year), and July 31 minus 3 months is April 30 (`CalendarDate.subtractMonths`).

**Bugs of the old screens that these functions fixed:**

- The old `groupByMonth` of `packages/utils` ordered by array position and merged the same month of different years.
- `CardCharts` listed months in the order they first appeared and keyed them by month name.
- `CardCharts` computed the 3 and 6 month cutoff with `new Date(year, month - N, day)`, which rolls over at month ends (May 31 minus 3 months became March 3).

## What stays out of the domain

- **Attachment size and format** (70 KB, image or PDF): the number comes from the backend, so it lives in the bff ([ADR 0009](../adr/0009-attachment-size-limit.md)).
- **Search and pagination**: local state of the extract ([reactive-programming.md](reactive-programming.md)).
- **Formatting and labels** (`R$ 150,00`, Portuguese type names, month names): `@bytebank/utils`.

## How to validate

`npm test` runs the specification tests of the core, with in-memory ports and a fixed clock. The core has nearly full coverage; the numbers are in [testing.md](testing.md). On the screen, the balance of `julia@bytebank.com` after `npm run db:reset` is R$ 1.150,00.

## Known limits

- **A type has one direction.** The model cannot tell a transfer sent from one received. Received transfers would need new types (for example `transfer_received`) or an explicit direction on the transaction; the same goes for `doc_ted`, `currency_exchange` (selling foreign currency) and `loan` (paying an installment).
