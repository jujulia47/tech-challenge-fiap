# Phase 4: infrastructure (Step 1.3)

**Date:** 2026-10-30

`@bytebank/infrastructure` (`packages/infrastructure`) implements the ports defined by `@bytebank/core`. It depends only on `@bytebank/core`, with native `fetch`, `Intl` and `crypto`. **The apps do not use it yet**, and the migration has not been run on `apps/shell/db.json`: that happens in step 1.5.

See [ADR 0005](../adr/0005-infrastructure-as-separate-package.md) and [ADR 0006](../adr/0006-clock-in-sao-paulo-timezone.md).

```text
packages/infrastructure/src/
  index.ts
  errors/InfrastructureError.ts
  json-server/TransactionRecord.ts
  json-server/transactionRecordMapper.ts
  json-server/HttpTransactionRepository.ts
  clock/SaoPauloClock.ts
  id/CryptoIdGenerator.ts
  migration/legacyTransaction.ts
  migration/migrateTransactions.ts
packages/infrastructure/scripts/
  migrate-db.mjs
```

## Record format

| Field | Type | Example |
|---|---|---|
| `id` | string | `"1"` |
| `userId` | string | `"1"` |
| `type` | string (type code) | `"deposit"` |
| `amountInCents` | integer | `15000` |
| `date` | ISO string | `"2022-11-18"` |
| `attachment` | string, optional | `"data:image/png;base64,..."` |

This matches `TransactionPrimitives`. There is no `month`, no `label` and no text `amount`.

## Adapters

### `transactionRecordMapper`

Converts between records and the domain. `parseTransactionRecord(value: unknown)` checks the shape at runtime and drops unknown fields. `transactionFromRecord` then goes through `Transaction.fromPrimitives`, so invalid stored data becomes an error and never enters the application silently.

### `HttpTransactionRepository`

Implements `TransactionRepository`. It receives `baseUrl` through the constructor and never reads `process.env`: whoever builds it injects the configuration.

| Method | Request | Notes |
|---|---|---|
| `findAllByUser` | `GET /transactions?_where={"userId":{"eq":"<id>"}}` | Also filters on the client, so isolation does not depend on the server |
| `findById` | `GET /transactions/<id>` | `null` on 404 or when the `userId` does not match |
| `create` | `POST /transactions` | Returns the stored transaction, from the response |
| `update` | `GET` to confirm the owner, then `PUT /transactions/<id>` | `TRANSACTION_NOT_FOUND` if the owner does not match, with no write |
| `delete` | `GET` to confirm the owner, then `DELETE /transactions/<id>` | Same |

Non-2xx responses (except the handled 404) throw `InfrastructureError` with `status` and `url`. The response body is never included.

### json-server behavior (verified on 1.0.0-beta.15)

Checked in the package README, in its source, and against a real server running on a temporary copy of the data.

**`?userId=1` does not work for string ids.** The README says "no operator -> `eq` (equal)", which is true, but `lib/parse-where.js` coerces numeric-looking values to numbers (`coerceValue`) and `lib/matches-where.js` compares with `===`. So `?userId=1` looks for the number `1` and finds nothing when the stored value is the string `"1"`:

| Request | Stored `userId` | Result |
|---|---|---|
| `?userId=1` | `"1"` | `[]` |
| `?userId:eq=1` | `"1"` | `[]` |
| `?userId=user-a` | `"user-a"` | match (the value does not look like a number) |
| `?_where={"userId":{"eq":"1"}}` | `"1"` | match, and `"10"` does not match |

`_where` takes JSON, so the value stays a string. The repository uses it.

**`POST` replaces the id.** `lib/service.js` does `{ ...data, id: randomId() }`, so an id sent by the client is discarded: `client-uuid` came back as `8N9On-LoiYA`. For this reason `TransactionRepository.create` returns the stored `Transaction`, and `CreateTransaction` returns that one. **With json-server, the id from `CryptoIdGenerator` is therefore not the one that ends up stored.** It stays in place for backends that accept client ids.

**Other confirmed behavior:** `PUT` keeps the id from the URL and ignores the one in the body, `PUT` on an unknown id returns 404, and `GET` on a missing id returns 404.

### `SaoPauloClock`

`today()` returns the calendar day in `America/Sao_Paulo`, using `Intl.DateTimeFormat`, never the server's timezone. For example, `2026-10-30T01:30:00Z` is `2026-10-29`. The constructor accepts a `now` function so that tests can fix the instant.

### `CryptoIdGenerator`

`next()` returns `crypto.randomUUID()`. In the browser this function only exists in secure contexts (HTTPS or localhost).

## Migration

`migrateTransactions(records, userId)` is a pure function. It converts each record and returns `{ transactions, errors, summary }`.

| Field | Rule |
|---|---|
| `id` | Kept |
| `userId` | The parameter (`"1"` in step 1.5) |
| `type` | Portuguese label to code; an unknown label is an error |
| `amountInCents` | Parsed from `R$ 1.234,56` with string handling only (no `parseFloat`). Accepts spaces, and values with or without thousands separators. A negative value or anything else is an error. |
| `date` | `transactionDate` if present, otherwise `date`, converted from `dd/mm/yyyy` and validated with `CalendarDate` |
| `attachment` | Kept if present |
| `month`, `label`, `amount` | Discarded |

- **Negative amounts are errors:** a value such as `-R$ 10,00` is reported with the reason `negative amount: the domain stores magnitudes; review this record manually`. The entity holds a positive magnitude and the sign comes from the type, so dropping the `-` could silently change the meaning of a record. No stored record is negative today.
- **Idempotent:** a record with `amountInCents` is treated as new format. It is validated and kept as it is, including its `userId`.
- **Every result goes through `Transaction.fromPrimitives`**, so the domain has accepted everything that comes out.
- **Errors do not stop the run:** each invalid record is reported with its id (`(no id)` if it has none), so one run shows every problem.
- `users` does not change.

### Result on the current data (not written to `db.json`)

| id | Before: label | Before: amount | Before: date | After: type | After: amountInCents | After: date |
|---|---|---|---|---|---|---|
| 1 | Depósito | R$ 150,00 | 18/11/2022 | `deposit` | 15000 | 2022-11-18 |
| 2 | Depósito | R$ 100,00 | 21/11/2022 | `deposit` | 10000 | 2022-11-21 |
| 3 | Depósito | R$ 50,00 | 21/11/2022 | `deposit` | 5000 | 2022-11-21 |
| 6 | Transferência | R$ 100,00 | 10/12/2022 | `transfer` | 10000 | 2022-12-10 |
| 7 | Depósito | R$ 2.500,00 | 15/01/2026 | `deposit` | 250000 | 2026-01-15 |
| 8 | Pagamento | R$ 350,00 | 20/01/2026 | `payment` | 35000 | 2026-01-20 |
| 11 | Câmbio de Moeda | R$ 1.200,00 | 08/03/2026 | `currency_exchange` | 120000 | 2026-03-08 |

Summary: 7 total, 7 migrated, 0 already migrated, 0 errors. `GetBalance` over the result gives 115000 cents (R$ 1.150,00).

### Running it

**The migration has not been run on `apps/shell/db.json`. That happens in step 1.5.**

```bash
node packages/infrastructure/scripts/migrate-db.mjs <input.json> <output.json> --user-id 1
```

- `--user-id` is required. It is the owner of the migrated records.
- `--in-place` is required to overwrite the input. Without it, an output that points to the same file is refused, even if it is written as a different path.
- It prints total, migrated, already in the new format and errors.
- **If any record has an error, nothing is written**: the script lists each error (id and reason) and exits with code 1.
- Other collections and keys of the file (`users`, `$schema`) are kept as they are.

`src/migration` holds the logic, tested in TypeScript. The `.mjs` file is a thin wrapper, because Node cannot import this TypeScript directly: it fails on the extensionless imports, and Node 20 has no type stripping. The wrapper loads the package with `runnerImport` from Vite, which is declared in the root `devDependencies`. So the script needs dev dependencies installed, which is fine for a one-off migration.

## Integration test

The unit tests simulate `fetch`. `HttpTransactionRepository.integration.test.ts` runs the repository against the installed json-server, on a temporary copy of a test database, as part of `npm test`. It covers the behaviors above: string user ids (`"1"` versus `"10"`), ownership, the id assigned on `POST`, and blocked updates and deletes. See `testing.md`.
