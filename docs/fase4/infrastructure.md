# Infrastructure: the adapters

`@bytebank/infrastructure` (`packages/infrastructure`) implements the ports that `@bytebank/core` defines. It depends only on the core, native `fetch`, `Intl` and `node:crypto`, `@supabase/supabase-js` and `nodemailer`. It never reads `process.env`: the composition of the bff builds every adapter and injects its configuration ([bff.md](bff.md)). The decisions are in [ADR 0005](../adr/0005-infrastructure-as-separate-package.md) and, for the clock, [ADR 0006](../adr/0006-clock-in-sao-paulo-timezone.md).

| Port of the core | json-server (local) | Supabase (production) | Both |
|---|---|---|---|
| `TransactionRepository` | `HttpTransactionRepository` | `SupabaseTransactionRepository` | `EncryptedAttachmentRepository` wraps either one |
| `UserRepository` | `HttpUserRepository` | `SupabaseUserRepository` | |
| `PasswordResetTokens` | `HttpPasswordResetTokenRepository` | `SupabasePasswordResetTokenRepository` | |
| `TransactionStatistics` (`/sobre`) | `HttpTransactionStatistics` | `SupabaseTransactionStatistics` | |
| `RateLimiter` | `InMemoryRateLimiter` | `PostgresRateLimiter` | |
| `PasswordHasher`, `DataCipher`, `CommonPasswordList` | | | `ScryptPasswordHasher`, `AesGcmCipher`, `StaticCommonPasswordList` |
| `EmailSender` | | | `SmtpEmailSender`, `DisabledEmailSender` |
| `Clock`, `IdGenerator` | | | `SaoPauloClock`, `CryptoIdGenerator`, `CryptoResetTokenGenerator` |

```text
packages/infrastructure/src/
  json-server/   HTTP adapters, record mapper, HTTP helpers
  supabase/      Postgres adapters, rate-limit keys
  encryption/    AES-256-GCM and the attachment wrapper
  password/      scrypt, common password lists, reset tokens
  email/         SMTP and the disabled sender
  rate-limit/    the memory limiter
  clock/, id/    São Paulo clock, id generators
  contracts/     one contract suite per port, run against both databases
  migration/     migration of the old records
```

The security adapters are explained in [security.md](security.md), and the Supabase tables in [deploy.md](deploy.md). The user repositories also store `sessionsValidAfter`, as an ISO date in `db.json` and as `timestamptz` in Supabase, read back to the millisecond.

## Records and errors

A transaction is stored as `{ id, userId, type, amountInCents, date, attachment? }`, the same shape as `TransactionPrimitives` of the core, with an ISO date and the attachment encrypted ([security.md](security.md#attachments)). `parseTransactionRecord` checks the shape and drops unknown fields, then `Transaction.fromPrimitives` applies the domain rules, so bad stored data becomes an error instead of entering the application.

`HttpTransactionRepository` lists with `_where`, also filters by owner on the client, and checks the owner with a `GET` before each `PUT` or `DELETE`. Every request has a 5-second timeout (`AbortSignal.timeout`), which also covers a body that stops halfway.

### Error codes

The bff answers 502 `UPSTREAM_ERROR` for all of these. The details go to the logger only.

| Code | When |
|---|---|
| `UPSTREAM_UNREACHABLE` | `fetch` rejects: the backend is down, DNS fails or the connection resets |
| `UPSTREAM_TIMEOUT` | No answer in time, or the body stopped halfway |
| `UPSTREAM_BAD_STATUS` | A non-2xx answer, except the expected 404 |
| `UPSTREAM_INVALID_RESPONSE` | The answer is not JSON, or not the expected shape |
| `CORRUPTED_RECORD` | A stored record fails the mapper or the domain rules |

`UPSTREAM_INVALID_RESPONSE` has no `cause`, because a JSON parse error quotes the start of the answer. Errors name the collection, never the email or the user id.

## json-server

json-server is the local database: no setup, a file that resets, and the demonstration data in the seed. It is not a production database, since it has no transaction, unique index, atomic update or access control ([ADR 0010](../adr/0010-supabase-as-production-database.md)).

The adapters depend on how json-server 1.0.0-beta.15 behaves, and the integration test keeps these facts true:

- `?userId=1` never matches the string `"1"`, because json-server turns values that look like numbers into numbers. The repository filters with `_where={"userId":{"eq":"1"}}`, which keeps the string.
- `POST` replaces the id sent by the client with its own. So `TransactionRepository.create` returns the stored transaction.
- Any body above 102400 bytes gets a 500, which sets the attachment limit ([ADR 0009](../adr/0009-attachment-size-limit.md)).
- `PUT` keeps the id of the URL, and `PUT` or `GET` on an unknown id answer 404.

### The version is pinned

`npx json-server` with no version downloads the `latest` tag, which is the older 0.17.4. That version ignores `_where` and, on any `DELETE`, removes every record whose `userId` points to a missing user. `package-lock.json`, `docker-compose.yml` and `apps/shell/Dockerfile.jsonserver` name 1.0.0-beta.15. A version change must touch all three and pass the integration test. This version needs Node 22.12 or later.

### Running without the file watcher

By default json-server re-reads `db.json` after each write and replaces its data in memory. Under load that read could finish after the next request and undo a `PATCH`. So it runs with `NODE_ENV=production`, which turns the watcher off, in the Docker image, in `npm run api` (`apps/shell/scripts/db.mjs serve`) and in the test harnesses. In that mode json-server serves `./public`, so each one starts from a folder that has one: `/srv` in the image, `apps/shell` locally, and a temporary folder in the tests.

### Where the database lives

`apps/shell/data/db.seed.json` is the versioned seed, with 2 users and 7 transactions. `apps/shell/data/db.json` is the database in use, ignored by git and created from the seed when missing.

Docker Compose mounts the folder `./apps/shell/data`, not the file. json-server saves by writing a temporary file and renaming it over `db.json`, and the kernel refuses a rename over a mounted file. With the file mounted, edits and deletes answered 502 and never reached the disk. The json-server image installs its pinned version at build time, so the container starts with no network.

### Resetting the data

```bash
npm run db:reset
docker compose restart json-server
```

json-server keeps the data in memory and does not watch the file, so it must be restarted after a reset, in Docker and with `npm run api` alike. A `db.json` older than the current format also needs this reset.

### Reaching json-server for debugging

Docker Compose does not publish port 3001, because the mock database has no access control. Run commands inside the container instead, with `127.0.0.1` because `localhost` may resolve to IPv6 there:

```bash
docker compose exec json-server wget -qO- http://127.0.0.1:3001/transactions
docker compose exec json-server cat /app/db.json
docker compose logs json-server --tail 40
```

Outside Docker, `npm run api` in `apps/shell` serves on port 3001 of the machine.

## SaoPauloClock and CryptoIdGenerator

`SaoPauloClock.today()` returns the calendar day in `America/Sao_Paulo` through `bankDayOf` of the domain, whatever the timezone of the server: `2026-10-30T01:30:00Z` is `2026-10-29`. The screens use `BrowserClock` from `@bytebank/utils`, which calls the same rule. `CryptoIdGenerator.next()` returns `crypto.randomUUID()`.

## Migration of the old records

The first records used Portuguese labels, amounts as text (`R$ 1.234,56`) and dates as `dd/mm/yyyy`. `migrateTransactions` converts them to type codes, integer cents and ISO dates with string handling only, refuses negative amounts, and reports each invalid record by id without stopping. The 7 records of the seed migrated with no error, and the result, with its R$ 1.150,00 balance, is frozen in `src/migration/fixtures/legacy-db.json` and tested.

```bash
node packages/infrastructure/scripts/migrate-db.mjs <input.json> <output.json> --user-id 1
```

The script writes nothing if any record fails, and needs `--in-place` to overwrite its input. Stop json-server before running it, since json-server keeps the old data in memory.

## How to validate

- `npm test` runs the adapter unit tests, the integration test against json-server, the timeout tests, the migration script and the json-server contract suite ([testing.md](testing.md)).
- The Supabase contract suite runs the Postgres adapters against a real project ([deploy.md](deploy.md#contract-tests)).
- In Docker, edit a transaction, run `docker compose restart json-server`, and the change is still there.

## Known limits

- A write that times out has an unknown result.
- json-server cannot keep an email unique or a reset link single-use under concurrency, so the contract suite skips those cases for it.
