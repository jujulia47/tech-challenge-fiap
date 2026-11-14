# Infrastructure: the adapters

Requirement: Clean Architecture. `@bytebank/infrastructure` (`packages/infrastructure`) implements the ports that `@bytebank/core` defines. It depends only on the core and on native `fetch`, `Intl` and `node:crypto`, plus `@supabase/supabase-js` and `nodemailer`. It never reads `process.env`: whoever builds an adapter injects its configuration, and that happens in one place, the composition of the bff ([bff.md](bff.md)). The decision is in [ADR 0005](../adr/0005-infrastructure-as-separate-package.md), and the clock in [ADR 0006](../adr/0006-clock-in-sao-paulo-timezone.md).

## The adapters

| Port of the core | json-server (local) | Supabase (production) | Other |
|---|---|---|---|
| `TransactionRepository` | `HttpTransactionRepository` | `SupabaseTransactionRepository` | `EncryptedAttachmentRepository` wraps either one |
| `UserRepository` | `HttpUserRepository` | `SupabaseUserRepository` | |
| `PasswordResetTokens` | `HttpPasswordResetTokenRepository` | `SupabasePasswordResetTokenRepository` | |
| `TransactionStatistics` (`/sobre`) | `HttpTransactionStatistics` | `SupabaseTransactionStatistics` | |
| `RateLimiter` | `InMemoryRateLimiter` | `PostgresRateLimiter` | |
| `PasswordHasher` | | | `ScryptPasswordHasher` |
| `DataCipher` | | | `AesGcmCipher` |
| `CommonPasswordList` | | | `StaticCommonPasswordList` |
| `EmailSender` | | | `SmtpEmailSender`, `DisabledEmailSender` |
| `Clock` | | | `SaoPauloClock` |
| `IdGenerator` | | | `CryptoIdGenerator`, `CryptoResetTokenGenerator` |

```text
packages/infrastructure/src/
  json-server/     the HTTP adapters, the record mapper, the shared HTTP helpers
  supabase/        the Postgres adapters, the rate-limit keys
  encryption/      AES-256-GCM and the attachment wrapper
  password/        scrypt, the lists of common passwords, reset tokens
  email/           SMTP and the disabled sender
  rate-limit/      the memory limiter
  clock/, id/      the São Paulo clock, the id generators
  contracts/       one contract suite per port, run against both backends
  migration/       the migration of the old records, kept for reference
```

The user repositories also store `sessionsValidAfter`, the moment the user ended their sessions: as an ISO date and time in `db.json`, and as `timestamptz` in Supabase, both read back to the millisecond and covered by `userSessionsContract.ts`. The security adapters (scrypt, AES-GCM, rate limits, the lists) are described in [security.md](security.md), and the Supabase tables and functions in [deploy.md](deploy.md). This page covers the record format, the error codes, json-server and the local database.

## Record format

| Field | Type | Example |
|---|---|---|
| `id` | string | `"1"` |
| `userId` | string | `"1"` |
| `type` | string (type code) | `"deposit"` |
| `amountInCents` | integer | `15000` |
| `date` | ISO string | `"2022-11-18"` |
| `attachment` | string, optional | `"aes256gcm$v1$..."` ([security.md](security.md#attachments)) |

This matches `TransactionPrimitives` of the core. `parseTransactionRecord(value: unknown)` checks the shape at runtime and drops unknown fields, then `Transaction.fromPrimitives` validates the rules, so invalid stored data becomes an error and never enters the application silently. Any failure in that read becomes `CORRUPTED_RECORD`, so a `DomainError` caused by stored data does not look like a mistake of the client.

## `HttpTransactionRepository`

| Method | Request | Notes |
|---|---|---|
| `findAllByUser` | `GET /transactions?_where={"userId":{"eq":"<id>"}}` | Also filters on the client, so isolation does not depend on the server |
| `findById` | `GET /transactions/<id>` | `null` on 404 or when the `userId` does not match |
| `create` | `POST /transactions` | Returns the stored transaction, from the response |
| `update` | `GET` to confirm the owner, then `PUT /transactions/<id>` | `TRANSACTION_NOT_FOUND` if the owner does not match, with no write |
| `delete` | `GET` to confirm the owner, then `DELETE /transactions/<id>` | Same |

**Timeout.** Every `fetch` carries `AbortSignal.timeout(timeoutMs)`, 5 s by default (`new HttpTransactionRepository(baseUrl, { timeoutMs })`). The signal also covers the body, so a server that sends the headers and stops is a `UPSTREAM_TIMEOUT`, not invalid JSON. `update` and `delete` make two requests, each with its own timeout. After a timeout on a write, the result is unknown.

### Error codes

Every failure of an adapter has a code, so the logger can tell them apart. The bff answers 502 `UPSTREAM_ERROR` for all of them, and none of these details reach the response.

| Code | When | Details on the error |
|---|---|---|
| `UPSTREAM_UNREACHABLE` | `fetch` rejects: backend down, DNS failure, connection reset | `url`, and the original error as `cause` |
| `UPSTREAM_TIMEOUT` | The answer did not arrive in time, or stopped in the middle of the body | `url`, and the `TimeoutError` as `cause` |
| `UPSTREAM_BAD_STATUS` | Non-2xx response, except the handled 404 | `status`, `url` |
| `UPSTREAM_INVALID_RESPONSE` | The response is not JSON, or a list was expected and something else arrived | `url` |
| `CORRUPTED_RECORD` | A stored record fails in the mapper or in `Transaction.fromPrimitives` | The record id (`(no id)` if it has none), and the original error as `cause` |

- **`UPSTREAM_INVALID_RESPONSE` has no `cause` on purpose.** The message of a JSON parse error quotes the start of the response, and response bodies stay out of errors.
- Errors name the collection, never the email or the user id ([security.md](security.md#personal-data-in-logs)).
- `findById` reads the record before it checks the owner, so a corrupted record of another user is a `CORRUPTED_RECORD`, not a `null`.
- Invalid input from a client never gets here: it fails in the bff or the use case, before the repository is called.

## json-server

json-server is the local database: no setup, a file that resets, and the demonstration data in the seed. It is not a production database: no transaction, no unique index, no atomic update, no access control ([ADR 0010](../adr/0010-supabase-as-production-database.md)).

### Behavior verified on 1.0.0-beta.15

Checked in the package README, in its source, and against a real server on a temporary copy of the data. The integration test keeps these facts true ([testing.md](testing.md)).

**`?userId=1` does not work for string ids.** `lib/parse-where.js` coerces numeric-looking values to numbers and `lib/matches-where.js` compares with `===`, so `?userId=1` looks for the number `1`:

| Request | Stored `userId` | Result |
|---|---|---|
| `?userId=1` | `"1"` | `[]` |
| `?userId:eq=1` | `"1"` | `[]` |
| `?userId=user-a` | `"user-a"` | match (the value does not look like a number) |
| `?_where={"userId":{"eq":"1"}}` | `"1"` | match, and `"10"` does not match |

`_where` takes JSON, so the value stays a string. The repository uses it.

**`POST` replaces the id.** `lib/service.js` does `{ ...data, id: randomId() }`, so an id sent by the client is discarded (`client-uuid` came back as `8N9On-LoiYA`). That is why `TransactionRepository.create` returns the stored transaction: with json-server, the id from `CryptoIdGenerator` is not the one stored. Supabase keeps it.

**The body limit is 102400 bytes.** `milliparsec` refuses anything larger with a 500, `Payload too large`. This is the reason for the attachment limit of 70 KB ([ADR 0009](../adr/0009-attachment-size-limit.md)).

**Other confirmed behavior:** `PUT` keeps the id from the URL and ignores the one in the body, `PUT` on an unknown id returns 404, and `GET` on a missing id returns 404.

### The version is pinned

`npx json-server` and `npm install -g json-server`, with no version, download the `latest` tag, which is **0.17.4**, older than the **1.0.0-beta.15** of the repository. Docker once ran 0.17.4 by accident, and the app seemed to work on a backend with other rules:

| Behavior | 1.0.0-beta.15 | 0.17.4 |
|---|---|---|
| `_where` | Filters on the server | Ignored: returns everything. Isolation held only because the adapter also checks the owner |
| Id on `POST` | Replaced by the server | Kept from the client |
| `DELETE` | Removes the record | **Also removes every record of any collection whose `xxxId` points to something missing** |

The last row is the serious one: in 0.17.4, `userId` counts as a foreign key to `users`, so with `users` empty one DELETE wiped all the transactions.

`package-lock.json`, `docker-compose.yml` and `apps/shell/Dockerfile.jsonserver` name `1.0.0-beta.15`. **A change of version must happen in the three places together**, and the integration test must pass. This version declares `node >=22.12.0`, so the images and the CI use Node 22.

### The image

`apps/shell/Dockerfile.jsonserver` installs `json-server@1.0.0-beta.15` at build time, on `node:22-alpine`, so the container starts with no network (`--network none`); before, `npx` asked the registry on every start. The seed is in the image too, outside `/app`, which let the same image run on Railway, the hosting of the first deploys.

### Where the database lives

| File | Role | In git |
|---|---|---|
| `apps/shell/data/db.seed.json` | The seed: 2 users and 7 transactions. json-server never writes to it | Yes |
| `apps/shell/data/db.json` | The database in use, created from the seed when it does not exist | No (`.gitignore`, `.dockerignore`) |

Docker Compose mounts the folder `./apps/shell/data:/app` and creates `db.json` from the seed before starting json-server. Mounting all of `./apps/shell` would expose `.env.local` to the container.

**Why a folder, not a file.** The compose file once mounted only `db.json`. json-server saves atomically: it writes `.db.json.tmp` and renames it over `db.json`, and the kernel refuses a rename over a mount point (`EBUSY: resource busy or locked, rename '.db.json.tmp' -> 'db.json'`). json-server changes its memory first and saves afterwards, so an edit answered 500 (502 in the bff), a reload showed the change from memory, and nothing reached the disk:

| Mount | Version | `PUT` | `DELETE` | Reached the disk |
|---|---|---|---|---|
| One file | 1.0.0-beta.15 | 500 | 500 | No |
| One file | 0.17.4 | 200 | 200 | **No, and with no error** |
| Folder | 1.0.0-beta.15 | 200 | 200 | Yes |

With the folder, verified on the real compose file: a direct `PUT` and `DELETE` reach the file on disk, the change survives `docker compose restart json-server`, and `PATCH` and `DELETE` through the bff answer 200 and 204 and reach the file. The lesson: a test only proves the setup it runs on, so anything about Docker is verified with the real `docker-compose.yml`.

### Resetting the data

```bash
npm run db:reset
docker compose restart json-server   # only when it runs in Docker
```

The restart is required in Docker: file changes do not cross the bind mount on Windows, so json-server keeps serving its memory, and the next write would overwrite the reset. With `npm run api`, json-server watches the file and reloads by itself. A `db.json` older than the current format (plain-text passwords, unencrypted attachments) also needs this reset.

### Reaching json-server for debugging

Docker Compose does not publish port 3001. Only the apps reach json-server, through the `bytebank` network, so `curl http://localhost:3001` is refused on purpose: the mock database has no access control. With the services up:

```bash
# Read
docker compose exec json-server wget -qO- http://127.0.0.1:3001/transactions
# The file in use, which is also apps/shell/data/db.json on the machine
docker compose exec json-server cat db.json
# Write, through Node, because the wget of the image only reads
docker compose exec json-server node -e "fetch('http://127.0.0.1:3001/transactions/1').then(r => r.text()).then(console.log)"
# Logs
docker compose logs json-server --tail 40
```

Use `127.0.0.1`, not `localhost`, which may resolve to IPv6 in the image. Outside Docker, `npm run api` in `apps/shell` serves on port 3001 of the machine.

## `SaoPauloClock` and `CryptoIdGenerator`

`SaoPauloClock.today()` returns the calendar day in `America/Sao_Paulo`, through `bankDayOf` of the domain, never the timezone of the server: `2026-10-30T01:30:00Z` is `2026-10-29`. The constructor accepts a `now` function so that tests can fix the instant. The screens use `BrowserClock` (`@bytebank/utils`), which calls the same rule.

`CryptoIdGenerator.next()` returns `crypto.randomUUID()`.

## Migration of the old records

Before Phase 4, records were stored with Portuguese labels, amounts as text (`R$ 1.234,56`) and dates as `dd/mm/yyyy`. `migrateTransactions(records, userId)` is a pure function that converts them:

| Field | Rule |
|---|---|
| `id` | Kept |
| `userId` | The parameter |
| `type` | Portuguese label to code; an unknown label is an error |
| `amountInCents` | Parsed from `R$ 1.234,56` with string handling only (no `parseFloat`). A negative value is an error: the domain stores magnitudes, and dropping the `-` could change the meaning of a record |
| `date` | `transactionDate` if present, otherwise `date`, from `dd/mm/yyyy`, validated with `CalendarDate` |
| `attachment` | Kept if present |
| `month`, `label`, `amount` | Discarded |

It is idempotent (a record already in the new format is validated and kept), every result goes through `Transaction.fromPrimitives`, and an invalid record is reported with its id without stopping the run. The script refuses to write anything if any record has an error, and refuses to overwrite its input without `--in-place`:

```bash
node packages/infrastructure/scripts/migrate-db.mjs <input.json> <output.json> --user-id 1
```

Result on the real data, with 0 errors; `GetBalance` over it gives 115000 cents (R$ 1.150,00). These records are frozen in `src/migration/fixtures/legacy-db.json`, and this exact result is tested:

| id | Before: label | Before: amount | Before: date | After: type | After: amountInCents | After: date |
|---|---|---|---|---|---|---|
| 1 | Depósito | R$ 150,00 | 18/11/2022 | `deposit` | 15000 | 2022-11-18 |
| 2 | Depósito | R$ 100,00 | 21/11/2022 | `deposit` | 10000 | 2022-11-21 |
| 3 | Depósito | R$ 50,00 | 21/11/2022 | `deposit` | 5000 | 2022-11-21 |
| 6 | Transferência | R$ 100,00 | 10/12/2022 | `transfer` | 10000 | 2022-12-10 |
| 7 | Depósito | R$ 2.500,00 | 15/01/2026 | `deposit` | 250000 | 2026-01-15 |
| 8 | Pagamento | R$ 350,00 | 20/01/2026 | `payment` | 35000 | 2026-01-20 |
| 11 | Câmbio de Moeda | R$ 1.200,00 | 08/03/2026 | `currency_exchange` | 120000 | 2026-03-08 |

The `.mjs` wrapper loads the TypeScript with `runnerImport` from Vite, a root dev dependency, because Node cannot import the extensionless TypeScript imports directly. If it is ever run again: stop json-server first (it keeps the data in memory), and note that it writes LF with a final newline.

## How to validate

- `npm test` runs the unit tests of every adapter, the integration test against the installed json-server, the timeout tests against real hanging servers, the migration CLI and the json-server contract suite ([testing.md](testing.md#infrastructure)).
- The Supabase contract suite runs the Postgres adapters against a real project ([deploy.md](deploy.md#contract-tests)).
- In Docker, edit and delete a transaction, then `docker compose restart json-server`: the change is still there.

## Known limits

- **A write that times out has an unknown result.** The client gets a 502 and should read the data again before retrying.
- **json-server cannot hold some guarantees** under concurrency (unique email, single use of a reset link); the contract suite skips those cases for it.
