# Domain and use cases

`@bytebank/core` (`packages/core`) holds the domain and the use cases. It is plain TypeScript with no runtime dependency: no React, no Next.js, no date library, no `node:crypto`. Everything depends on it and it depends on nothing, which the ESLint layer rules enforce ([conventions.md](../conventions.md#layers)).

| Decision | ADR |
|---|---|
| Money as integer cents | [0001](../adr/0001-money-in-integer-cents.md) |
| Calendar dates without timezone | [0002](../adr/0002-calendar-dates-without-timezone.md) |
| English type codes, each with a direction | [0003](../adr/0003-english-transaction-type-codes.md) |
| Use cases depend on ports | [0004](../adr/0004-use-cases-depend-on-ports.md) |

```text
packages/core/src/
  domain/
    errors/          DomainError
    value-objects/   Money, CalendarDate, bankDayOf
    transaction/     Transaction, TransactionType, aggregations, typeSuggestion
    user/            User, passwordPolicy, sessionRevocation
  application/
    ports/           the interfaces the use cases need
    use-cases/       transactions, authentication, recovery, account, sessions
    errors/          ApplicationError, RateLimitedError
  testing/           in-memory ports and fakes, exported only as @bytebank/core/testing
```

Each file has its test next to it. Any import of the core other than the main entry and `@bytebank/core/testing` fails.

## Model

`Money` holds an integer number of cents. It is always a safe integer, `-0` never exists, and an overflow throws instead of losing precision. Formatting as `R$` belongs to `@bytebank/utils`.

`CalendarDate` is a day with no time and no timezone, built with `fromISO('2022-11-18')` or `fromParts`. The date must exist and the year must be between 1 and 9999. It never uses `Date`. `bankDayOf(instant)` gives the day of an instant in São Paulo, the one rule behind the server clock and the browser clock ([ADR 0006](../adr/0006-clock-in-sao-paulo-timezone.md)).

`Transaction` has `id`, `userId`, `type`, `amount` (always the positive magnitude), `date` and an optional `attachment`, which the entity treats as an opaque string. `Transaction.create` validates the invariants and freezes the instance. `signedAmount()` is positive for income and negative for expense. `update(changes)` returns a new instance and never changes `id` or `userId`. `toPrimitives()` and `fromPrimitives()` convert to and from storage, validating raw data instead of casting it.

`User` holds id, name, email, password hash and `sessionsValidAfter`, the moment the user last ended their sessions. The hash never leaves the application, since use cases return `UserDTO`. The name is trimmed and has 1 to 100 characters, and the email is trimmed and lower-cased. `passwordPolicy.ts` holds the rules of a new password, and `isSessionRevoked` refuses a session that started before `sessionsValidAfter` ([security.md](security.md#ending-every-session)).

`DomainError` carries a typed code, such as `MONEY_INVALID_CENTS`, `CALENDAR_DATE_INVALID_VALUE` or `TRANSACTION_INVALID_AMOUNT`.

### Transaction types and the balance

Each of the seven codes has a fixed direction. The core has no Portuguese labels; the presentation maps them.

| Label | Code | Direction | Assumption |
|---|---|---|---|
| Depósito | `deposit` | income | |
| Empréstimo e Financiamento | `loan` | income | The amount received, not an installment paid |
| Saque | `withdrawal` | expense | |
| Pagamento | `payment` | expense | |
| Transferência | `transfer` | expense | A transfer sent |
| DOC/TED | `doc_ted` | expense | A transfer sent |
| Câmbio de Moeda | `currency_exchange` | expense | A purchase of foreign currency, since the account is in BRL |

There was no direction rule before. The balance on the screen was a fixed `R$ 2.500,00`, and the charts added withdrawals as if they were income. With the seed, the calculated balance is R$ 1.150,00: four deposits of R$ 2.800,00, minus a transfer of R$ 100,00, a payment of R$ 350,00 and an exchange of R$ 1.200,00.

Charts show volume, so `totalsByMonth` and `totalsByType` add the magnitudes. The balance adds the signed amounts. A R$ 350,00 payment adds 350 to the chart and subtracts 350 from the balance.

## Ports

| Port | Methods | Implemented by |
|---|---|---|
| `TransactionRepository` | `findAllByUser`, `findById(id, userId)`, `create`, `update`, `delete(id, userId)`. `create` returns the stored transaction, because a backend may assign its own id | json-server and Supabase, wrapped by the attachment cipher |
| `UserRepository` | `findByEmail`, `findById`, `create`, `updateName`, `updatePasswordHash`, `updateSessionsValidAfter`. Each update sends one field, so one change cannot undo another | json-server and Supabase |
| `PasswordResetTokens` | `create`, `findByHash`, `markUsed`, `invalidateAllOfUser`, and the generator (`generate`, `hash`) | json-server and Supabase, `CryptoResetTokenGenerator` |
| `TransactionStatistics` | `summary()`, the counts of `/sobre` | json-server and Supabase |
| `RateLimiter` | `consume`, `release`, `reset` | Memory and Postgres limiters |
| `PasswordHasher`, `CommonPasswordList`, `DataCipher`, `EmailSender` | Hash and verify, `has`, `encrypt` and `decrypt` with the owner as context, `send` | scrypt, static lists, AES-GCM, SMTP or disabled |
| `Clock` | `today(): CalendarDate` | `SaoPauloClock`, `BrowserClock`, `FixedClock` in tests |
| `IdGenerator` | `next(): string` | `CryptoIdGenerator`, `SequentialIdGenerator` in tests |

The adapters are described in [infrastructure.md](infrastructure.md).

## Use cases

Each use case is a class with its ports in the constructor and one `execute` method. Input and output are DTOs of primitives, so the screens never touch an entity.

| Use case | Output | Rules |
|---|---|---|
| `ListTransactions` | `TransactionDTO[]` | Newest first, ties broken by id in plain string order |
| `CreateTransaction` | `TransactionDTO` | A future date is refused, today is allowed. Returns what the repository stored |
| `UpdateTransaction` | `TransactionDTO` | Looks up by owner first. Checks the future date only if the date changed, so an old record stays editable |
| `DeleteTransaction` | nothing | Looks up by owner first |
| `GetBalance` | `{ amountInCents }` | Sum of the signed amounts, which can be negative |
| `GetStatement` | `{ groups: [{ monthKey, transactions }] }` | Newest month first, and years never mix |
| `GetChartData` | `{ byMonth, byType }` | Filters by period (`3`, `6` or `all`) with the clock. `type` narrows `byMonth` only, because the pie is where the type is chosen |
| `AuthenticateUser`, `RegisterUser` | `UserDTO` or nothing | [security.md](security.md#login-and-registration) |
| `RequestPasswordReset`, `ResetPassword` | nothing | [security.md](security.md#password-recovery). `ResetPassword` ends every session |
| `UpdateUserProfile` | `UserDTO` | The name rule lives in `User`, so registration and profile agree |
| `ChangePassword` | nothing | Checks the current password, refuses an unchanged one, applies the policy and ends every session ([security.md](security.md#account)) |
| `EndUserSessions` | nothing | Records now as the moment every session of the user ends |
| `VerifySession` | `boolean` | Reads the user and applies `isSessionRevoked`. A user that no longer exists has no session |

`findById` returns `null` both for an unknown transaction and for one of another user, and both become `TRANSACTION_NOT_FOUND`. The ownership check runs before validating the changes, so no answer reveals that an id exists.

Three rules moved out of the screens into the domain: the type suggestion (`suggestTransactionType`, deposit from R$ 1.000), "today" in São Paulo (`bankDayOf`), and the future-date check, which the form now runs with `BrowserClock`.

## Aggregations

`domain/transaction/aggregations.ts` holds pure functions over `Transaction[]`: `sortNewestFirst`, `groupByMonth`, `filterByPeriod`, `totalsByMonth` and `totalsByType`. The screens reach them through `GetStatement` and `GetChartData`.

`filterByPeriod` starts at the same day N months ago, clamped to the last day of that month: May 31 minus 3 months is February 28, or 29 in a leap year. These functions fixed three bugs of the old screens: the same month of different years merged, months were listed in order of appearance, and May 31 minus 3 months became March 3.

Attachment size and format stay out of the domain, because the limit comes from the backend ([ADR 0009](../adr/0009-attachment-size-limit.md)). Search, pagination, formatting and labels belong to the screens and `@bytebank/utils`.

## How to validate

`npm test` runs the specification tests of the core with in-memory ports and a fixed clock ([testing.md](testing.md)). On screen, the balance of `julia@bytebank.com` after `npm run db:reset` is R$ 1.150,00.

## Known limits

A type has one direction, so the model cannot tell a transfer received from one sent. That would need new types, such as `transfer_received`, or an explicit direction on the transaction. The same goes for selling foreign currency or paying a loan installment.
