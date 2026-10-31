# Phase 4: infrastructure (Step 1.3)

**Date:** 2026-10-30

`@bytebank/infrastructure` (`packages/infrastructure`) implements the ports defined by `@bytebank/core`. It depends only on `@bytebank/core`, with native `fetch`, `Intl` and `crypto`. The zones use it through `@bytebank/bff` since step 2.2. The migration was run on the real data in step 2.2, and since step 2.3b the database lives in `apps/shell/data/` (see [Where the database lives](#where-the-database-lives-step-23b)).

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

Converts between records and the domain. `parseTransactionRecord(value: unknown)` checks the shape at runtime and drops unknown fields. `transactionFromRecord` then goes through `Transaction.fromPrimitives`, so invalid stored data becomes an error and never enters the application silently. Any failure in that read becomes an `InfrastructureError` with the code `CORRUPTED_RECORD`, so a `DomainError` caused by stored data does not look like a mistake of the client.

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

### `InfrastructureError` codes (step 2.1)

Every failure of the adapter has a code, so a logger can tell them apart. `@bytebank/bff` answers 502 `UPSTREAM_ERROR` for all of them, and none of these details reach the response.

| Code | When | Details on the error |
|---|---|---|
| `UPSTREAM_UNREACHABLE` | `fetch` rejects: backend down, DNS failure, connection reset | `url`, and the original error as `cause` |
| `UPSTREAM_TIMEOUT` | The answer did not arrive in time, or stopped in the middle of the body (step 2.2) | `url`, and the `TimeoutError` as `cause` |
| `UPSTREAM_BAD_STATUS` | Non-2xx response, except the handled 404 | `status`, `url` |
| `UPSTREAM_INVALID_RESPONSE` | The response is not JSON, or a list was expected and something else arrived | `url` |
| `CORRUPTED_RECORD` | A record read from the database fails in the mapper or in `Transaction.fromPrimitives` | The record id in the message (`(no id)` if it has none), and the original error as `cause` |

- `code` is optional, because the errors of the migration have none: they are only reported by message.
- **`UPSTREAM_INVALID_RESPONSE` has no `cause` on purpose.** The message of a JSON parse error quotes the start of the response, and response bodies stay out of errors.
- **Timeout.** Every `fetch` carries `AbortSignal.timeout(timeoutMs)`, 5 s by default, set through the constructor: `new HttpTransactionRepository(baseUrl, { timeoutMs })`. The signal also covers the body, so `readJson` has to tell a timeout from invalid JSON: a server that sends the headers and stops is a `UPSTREAM_TIMEOUT`, not a `UPSTREAM_INVALID_RESPONSE`. `update` and `delete` make two requests, each with its own timeout. After a timeout on a write, the result is unknown.
- `findById` reads the record before it checks the owner, so a corrupted record of another user is a `CORRUPTED_RECORD`, not a `null`.
- Invalid input from a client never gets here: it fails in the use case, before the repository is called.

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

**The body limit is 102400 bytes.** `milliparsec`, which reads the bodies, refuses anything larger with a 500, `Payload too large`. This is the reason for the attachment limit, see [ADR 0009](../adr/0009-attachment-size-limit.md).

**Other confirmed behavior:** `PUT` keeps the id from the URL and ignores the one in the body, `PUT` on an unknown id returns 404, and `GET` on a missing id returns 404.

### The version must be fixed (step 2.3)

Until step 2.2, Docker ran another json-server. `npx json-server` and `npm install -g json-server`, with no version, download the `latest` tag, which is **0.17.4**, while the repository and every test use **1.0.0-beta.15**. The tag `latest` is older than the beta, so the mismatch went unnoticed: the app worked, on a backend with other rules.

| Behavior | 1.0.0-beta.15 | 0.17.4 |
|---|---|---|
| `_where` | Filters on the server | Ignored: returns everything. Isolation held only because the adapter also checks the owner |
| Id on `POST` | Replaced by the server | Kept from the client |
| `DELETE` | Removes the record | **Also removes every record of any collection whose `xxxId` points to something missing** |

The last row is the serious one. In 0.17.4, `userId` counts as a foreign key to `users`, so a transaction whose owner is not in `users` is removed by **any** DELETE on any record. In a test with `users` empty, one DELETE wiped all the transactions.

`docker-compose.yml` and `apps/shell/Dockerfile.jsonserver` now name `1.0.0-beta.15`, the version in `package-lock.json`. **Any change of version must happen in the three places together**, and the integration test must pass, because this adapter depends on the behaviors above.

**Node.** This version declares `node >=22.12.0`. Compose and `Dockerfile.jsonserver` use `node:22-alpine` since step 2.3b, and CI uses Node 22 since step 2.4a.

### `SaoPauloClock`

`today()` returns the calendar day in `America/Sao_Paulo`, using `Intl.DateTimeFormat`, never the server's timezone. For example, `2026-10-30T01:30:00Z` is `2026-10-29`. The constructor accepts a `now` function so that tests can fix the instant.

### `CryptoIdGenerator`

`next()` returns `crypto.randomUUID()`. In the browser this function only exists in secure contexts (HTTPS or localhost).

## Migration

`migrateTransactions(records, userId)` is a pure function. It converts each record and returns `{ transactions, errors, summary }`.

| Field | Rule |
|---|---|
| `id` | Kept |
| `userId` | The parameter (`"1"` in the real migration) |
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

### Result on the real data (step 2.2)

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

These records are frozen in `src/migration/fixtures/legacy-db.json` (step 2.1), and the exact result above is tested on that copy. It holds only the transactions, not the `users` collection. A second test reads the seed, `apps/shell/data/db.seed.json`, and only checks that every record migrates without errors.

### Running it

The real migration ran in step 2.2, with `--in-place --user-id 1`. The summary was 7 total, 7 migrated, 0 already in the new format and 0 errors. Running it again on a copy gave 7 already in the new format and 0 migrated. Two precautions if it is ever run again:

- **Stop json-server first.** It keeps the data in memory, so a later write would bring the old records back.
- **Line endings.** The script writes LF and a final newline, which matters only if the output is meant to replace the seed. The `users` and `$schema` blocks did not change.

```bash
node packages/infrastructure/scripts/migrate-db.mjs <input.json> <output.json> --user-id 1
```

- `--user-id` is required. It is the owner of the migrated records.
- `--in-place` is required to overwrite the input. Without it, an output that points to the same file is refused, even if it is written as a different path.
- It prints total, migrated, already in the new format and errors.
- **If any record has an error, nothing is written**: the script lists each error (id and reason) and exits with code 1.
- Other collections and keys of the file (`users`, `$schema`) are kept as they are.

`src/migration` holds the logic, tested in TypeScript. The `.mjs` file is a thin wrapper, because Node cannot import this TypeScript directly: it fails on the extensionless imports, and Node 20 has no type stripping. The wrapper loads the package with `runnerImport` from Vite, which is declared in the root `devDependencies`. So the script needs dev dependencies installed, which is fine for a one-off migration.

## Where the database lives (step 2.3b)

| File | Role | In git |
|---|---|---|
| `apps/shell/data/db.seed.json` | The seed: the 7 records in the new format. json-server never writes to it | Yes |
| `apps/shell/data/db.json` | The database in use, created from the seed when it does not exist | No, it is in `.gitignore` and `.dockerignore` |

`docker compose up` and `npm run api` create `db.json` when it is missing. `Dockerfile.jsonserver`, which is what runs on Railway, copies the seed into the image, so a new deploy starts from the seed.

### The problem: editing and deleting answered 502

On the Docker stack, editing or deleting showed an error, and the change still appeared after a reload. The BFF was right: json-server was answering 500.

```text
Error: EBUSY: resource busy or locked, rename '.db.json.tmp' -> 'db.json'
```

### The cause: a bind mount of one file, plus an atomic rename

`docker-compose.yml` mounted one file: `./apps/shell/db.json:/app/db.json`. json-server saves atomically: it writes `.db.json.tmp` and renames it over `db.json`. That file was a mount point, and the kernel refuses a rename over a mount point.

json-server changes the data in memory first and saves afterwards, so:

1. The record changes in memory.
2. Saving fails, and the answer is a 500.
3. The BFF answers 502, and the screen shows the error.
4. A reload reads from memory, so the change seems to be saved.
5. Nothing reached the disk. A restart of json-server loses the change.

| Mount | Version | `PUT` | `DELETE` | Reached the disk |
|---|---|---|---|---|
| One file | 1.0.0-beta.15 | 500 | 500 | No |
| One file | 0.17.4 | 200 | 200 | **No, and with no error** |
| Folder | 1.0.0-beta.15 | 200 | 200 | Yes |

**The problem was older than the version change.** 0.17.4 failed to save too, in silence: it answered 200, left a `.~db.json` behind, and `db.json` did not change. So writes in Docker were probably never saved. Pinning 1.0.0-beta.15 only made the failure visible.

### The correction

- Compose mounts a folder, `./apps/shell/data:/app`, so the rename happens inside a normal directory. Mounting all of `./apps/shell` would expose `.env.local` to the container and serve its `public` folder.
- Compose creates `db.json` from the seed before starting json-server.
- The image is `node:22-alpine`, because this version requires Node >= 22.12.

Verified with the real `docker-compose.yml`, on port 3001 and through the BFF:

| Check | Result |
|---|---|
| Direct `PUT` | 200, and the change is in the file on disk |
| Direct `DELETE` | 200, with the deleted record in the body, and the record left the file |
| `docker compose restart json-server` | The change is still there |
| `PATCH` through the BFF | 200 with the DTO, and the change is in the file |
| `DELETE` through the BFF | 204, and the record left the file |

`DELETE` answers 200 on json-server and 204 on the BFF: the 204 is the contract of the BFF.

### The lesson

**The integration test validates the HTTP contract, not the mount in the compose file.** It runs json-server as a local process on a temporary folder, where a rename works, so it passed all along. The browser test of step 2.3 did not catch this either, because its isolated stack mounted a folder, not a file as the compose file did. A test only proves the setup it runs on, so anything about Docker has to be verified with the real `docker-compose.yml`.

### Manual testing

Testing on the screen now changes `apps/shell/data/db.json`, which git ignores. To go back to the seed:

```bash
npm run db:reset
docker compose restart json-server   # only when it runs in Docker
```

**The restart is required in Docker.** File changes do not cross the bind mount on Windows, so json-server keeps serving its memory, and the next write would overwrite the reset. With `npm run api`, it watches the file and reloads by itself. `git restore` no longer plays any part in this.

## Reaching json-server for debugging (step 2.5b)

Docker Compose no longer publishes port 3001. Only the apps reach json-server, through the `bytebank` network, so `curl http://localhost:3001` is refused on purpose: the mock database has plain-text passwords, and anything on the machine could read them.

To look at it, run commands inside the container, with the services up:

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

Use `127.0.0.1`, not `localhost`, which may resolve to IPv6 in the image. Outside Docker, `npm run api` in `apps/shell` still serves on port 3001 of the machine.

## Integration test

The unit tests simulate `fetch`. `HttpTransactionRepository.integration.test.ts` runs the repository against the installed json-server, on a temporary copy of a test database, as part of `npm test`. It covers the behaviors above: string user ids (`"1"` versus `"10"`), ownership, the id assigned on `POST`, and blocked updates and deletes. See `testing.md`.
