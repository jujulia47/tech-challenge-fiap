# BFF

`@bytebank/bff` (`packages/bff`) is the server layer between the browser and the data. It turns the use cases into HTTP handlers written with the standard `Request` and `Response`, so it depends on neither Next.js nor NextAuth. The decisions are in [ADR 0007](../adr/0007-bff-with-framework-agnostic-handlers.md) (handlers with no framework), [ADR 0008](../adr/0008-input-validation-at-the-boundary.md) (validation at the boundary) and [ADR 0009](../adr/0009-attachment-size-limit.md) (attachment limit).

## How a request is handled

1. A write (POST, PATCH, DELETE) from an origin that is not allowed is refused before anything else.
2. The user comes from the session, through the injected `getUserId`. Without a session the answer is 401 and the body is not read.
3. The path `id` is checked, then `Content-Length`, then the body is read while its bytes are counted.
4. Zod validates the format. The domain validates the business rules.
5. The use case runs. The handler holds no business logic.
6. The result becomes a core DTO in JSON, or an error becomes a status and a code with no internal details.

```text
packages/bff/src/
  index.ts        server entry (imports server-only)
  env.ts          requireEnv, parseAllowedOrigins
  composition/    createDataAdapters (DATA_BACKEND), use cases, rate limits, handlers built on demand
  http/           handlers, schemas, origin check, errors, limits, client IP
  client/         browser clients, exposed as @bytebank/bff/client
```

| Export | Purpose |
|---|---|
| `createDataAdapters(env)` | The adapters of the chosen database, in one place ([deploy.md](deploy.md)) |
| `createLazyTransactionHandlers`, `createLazyAccountHandlers` | The handlers of the zones, built on the first request |
| `createTransactionHandlers({ getUserId, useCases, allowedOrigins, logger? })` | The seven transaction handlers |
| `createRegisterHandler`, `createPasswordResetHandlers`, `createAccountHandlers` | Registration and recovery in the shell, name and password in the dashboard |
| `createEndSessionsHandler`, `getSessionRevocation()` | "Sair" ending every session, and the session check of the three apps ([security.md](security.md#ending-every-session)) |
| `MAX_ATTACHMENT_BYTES` from `@bytebank/bff/limits` | The attachment limit, in a file with no imports so the browser can use it |
| `createTransactionsClient(basePath)`, `createShellClient()` from `@bytebank/bff/client` | The browser clients ([below](#browser-clients)) |
| `requireEnv`, `parseAllowedOrigins` from `@bytebank/bff/env` | Read server variables and fail with a clear message |

The handlers are built on the first request, never on import, because `next build` loads the route modules without runtime variables. That is why the build and CI need no secrets.

## Endpoints

Bodies use the core format: `amountInCents`, ISO dates and type codes. Under the basePath the URLs are `/dashboard/api/...` and `/transactions/api/...`.

| Route file in `src/app/api` | Method | Use case | Input | Success |
|---|---|---|---|---|
| `transactions/route.ts` | GET | `ListTransactions` | | 200, `TransactionDTO[]`, newest first |
| `transactions/route.ts` | POST | `CreateTransaction` | `type`, `amountInCents`, `date`, `attachment?` | 201, `TransactionDTO` |
| `transactions/[id]/route.ts` | PATCH | `UpdateTransaction` | At least one of `type`, `amountInCents`, `date`, `attachment` | 200, `TransactionDTO` |
| `transactions/[id]/route.ts` | DELETE | `DeleteTransaction` | | 204 |
| `balance/route.ts` | GET | `GetBalance` | | 200, `{ amountInCents }` |
| `statement/route.ts` | GET | `GetStatement` | | 200, `{ groups: [{ monthKey, transactions }] }` |
| `chart-data/route.ts` | GET | `GetChartData` | `period` (`3`, `6`, `all`), `type` optional | 200, `{ byMonth, byType }` |

The dashboard also has `account/profile` and `account/password`. The shell has `register`, `password-reset/request`, `password-reset/confirm`, `session-policy` and `sessions/end` ([security.md](security.md)). The route files only delegate, with `dynamic = 'force-dynamic'` and `runtime = 'nodejs'`. `params` is a promise in Next.js 16 and is awaited.

### Errors

| Situation | Status | Body |
|---|---|---|
| Invalid or unknown field, empty PATCH, invalid id, period or type, invalid JSON | 400 | `{ error: 'VALIDATION_ERROR', issues: [{ field, message }] }` |
| No session | 401 | `{ error: 'UNAUTHENTICATED' }` |
| Write from an origin that is not allowed | 403 | `{ error: 'FORBIDDEN_ORIGIN' }` |
| Unknown transaction, or one of another user | 404 | `{ error: 'TRANSACTION_NOT_FOUND' }` |
| Body above 200 KB | 413 | `{ error: 'PAYLOAD_TOO_LARGE' }` |
| A domain rule, such as a date that does not exist or a future date | 422 | `{ error: <code> }` |
| Any failure of the database adapter ([infrastructure.md](infrastructure.md#error-codes)) | 502 | `{ error: 'UPSTREAM_ERROR' }` |
| Anything else, which means a bug | 500 | `{ error: 'INTERNAL_ERROR' }` |

Every 502 has the same body. The adapter's code, the URL and the record id go to the logger only. Invalid input fails before the repository is called, so it is always 400 or 422, while a broken stored record becomes a 502. The `message` of an issue is in English for developers; the screens show their own Portuguese texts.

## Validation

Schemas are strict, so any extra field is a 400.

| Field | Rule |
|---|---|
| `type` | One of `TRANSACTION_TYPES` |
| `amountInCents` | Safe positive integer |
| `date` | `YYYY-MM-DD`. The domain checks that the date exists, so `2026-02-31` gets a 422 |
| `attachment` | Base64 data URL of an allowed type, at most 70 KB decoded |
| `id` (path) | Letters, digits, `_` and `-`, from 1 to 64 characters |
| `period` (query) | `3`, `6` or `all` |
| `type` (query) | One of `TRANSACTION_TYPES`. It narrows `byMonth` only, since `byType` is the list the type is chosen from |

On PATCH the fields are optional and at least one is required. `attachment: null` removes the attachment and an absent key keeps it.

The attachment limit is 70 KB of decoded file, defined in `packages/bff/src/http/limits.ts` and imported by the form. json-server refuses any body above 102400 bytes, and base64 makes a file a third larger, so the largest attachment it accepted was 76,707 bytes. 70 KB leaves a margin for the other fields. The end-to-end test sends an attachment at the limit through POST and PATCH, and sends 80 KB straight to json-server expecting a refusal.

## CSRF

The session cookie is `SameSite=Lax`, so the browser does not send it on a cross-site POST, PATCH or DELETE. The Auth.js documentation does not state this default; it was confirmed in `defaultCookies` of `@auth/core` 0.41.3 and must be checked again on each upgrade, since `next-auth` is in beta.

The origin check is a second layer that covers sibling subdomains too, which `SameSite` treats as the same site.

| Request | Result |
|---|---|
| GET | Not checked |
| `Origin` in `ALLOWED_ORIGINS` | Passes |
| Another `Origin`, including `null` or empty | 403, with no fallback to `Referer` |
| No `Origin` and a `Referer` from an allowed origin | Passes |
| No `Origin` and any other `Referer`, or neither header | 403 |

The comparison is exact on scheme, host and port, so `http://bff.test.evil.example` does not pass for `http://bff.test`. It runs before the session, so a forged request learns nothing about the session. An empty list refuses every write, and an entry that is not an exact origin stops the app with a message. Through the rewrites of the shell, the `Origin` header reaches the zones unchanged.

## Security rules

- The user always comes from the session. A `userId` in the body is refused, and one in the query is ignored.
- A transaction of another user answers 404, like an unknown id, so its existence is not revealed.
- Attachments can be PNG, JPEG, WebP or PDF. SVG is refused because it can carry scripts, and a PDF is shown in an `<iframe>` where a `data:text/html` document would run.
- `Content-Length` is checked before the body is read, and the bytes are counted while reading, so a chunked request also stops at 200 KB.
- The id is validated before it reaches the backend URL, because `encodeURIComponent` keeps `..`.
- Every response, errors included, has `Cache-Control: no-store`.
- Errors never carry a URL, a status, a record id or a backend body.
- Login, registration, recovery and password change have attempt limits ([security.md](security.md#attempt-limits)).

## Wiring in the zones

Each zone has only its route files and a `proxy.ts`. `createLazyTransactionHandlers(getUserId)` builds the handlers, and `@bytebank/auth/handlers` binds it to the NextAuth of the zone ([modularization.md](modularization.md)).

The `proxy.ts` of each zone protects its pages even when the shell is bypassed. A page with no session redirects to `SHELL_URL`, because a relative `/` would stay inside the basePath of the zone. `/api/*` is outside the matcher, so the handlers answer 401 in JSON. Next prefixes the matcher with the basePath, which left the root of the zone unprotected until the matcher got an explicit `'/'`:

```ts
matcher: ['/', '/((?!api/|_next/static|_next/image|favicon.ico).*)']
```

The proxy of the shell does not guard the zone APIs, so the client gets the handler's 401 and not an HTML redirect. Its pattern requires `api/`, so a page such as `/dashboard/apiary` stays protected:

```ts
matcher: ['/dashboard', '/dashboard/((?!api/).*)', '/transactions', '/transactions/((?!api/).*)']
```

A missing variable never gets a default in the zones. With no `JSON_SERVER_URL` an API request answers 500 and the log says `Missing required environment variable: JSON_SERVER_URL`. With `ALLOWED_ORIGINS` ending in a slash, the log says `ALLOWED_ORIGINS has an invalid origin`. The local variables are in the README and in each `.env.example`; production is in [deploy.md](deploy.md#variables-per-vercel-project).

## Browser clients

`createTransactionsClient(basePath)` is the only HTTP client of the zones, used by both through `createTransactionsApi` of `@bytebank/store` ([state-management.md](state-management.md)). `createShellClient()` serves the shell: registration, "Esqueci a senha", reset, session policy and "Sair". Both live in `packages/bff/src/client/` because the bff defines the contract.

| Function | Request |
|---|---|
| `fetchTransactions()` | `GET {basePath}/api/transactions` |
| `createTransaction(data)` | `POST {basePath}/api/transactions` |
| `updateTransaction(id, changes)` | `PATCH {basePath}/api/transactions/{id}` |
| `deleteTransaction(id)` | `DELETE {basePath}/api/transactions/{id}` |
| `fetchBalance()` | `GET {basePath}/api/balance` |
| `fetchStatement()` | `GET {basePath}/api/statement` |
| `fetchChartData({ period, type? })` | `GET {basePath}/api/chart-data?period=...&type=...` |

The URLs are relative and include the basePath. The browser stays on the origin of the shell, so the `Origin` header is the one in `ALLOWED_ORIGINS`, and a direct visit to port 3002 can read but not write. A 401 sends the browser to the login with a full page load. Any other error throws with the code from the bff, or `UNKNOWN_ERROR` when the answer is not JSON. The clients import types only, and a test reads their source to keep server code out of the browser.

Moving the screens to the bff fixed what they showed. Expenses now carry a minus sign, months include the year, the newest transaction comes first, and a failed load shows "Não foi possível carregar as transações" instead of "Nenhuma transação encontrada".

## How to validate

`npm test` runs every handler with real `Request` objects and the end-to-end test against json-server ([testing.md](testing.md)).

### Smoke tests

With `curl` and no session, in `npm run dev` and in Docker:

| Request | Through the shell (3000) | Direct (3002, 3003) |
|---|---|---|
| `GET /dashboard/api/transactions`, `/balance`, `/statement`, `/chart-data?period=all` | 401 JSON | 401 JSON |
| `POST /dashboard/api/transactions` with a strange `Origin` | 403 JSON | 403 JSON |
| `GET /dashboard/api/auth/session` | 200 `null` | 200 `null` |
| `GET /dashboard`, `/dashboard/account`, `/transactions` | 307 to `/` | 307 to `SHELL_URL` |

The `/transactions/api/*` routes answer the same. With a session, the same image covered the migrated records, the R$ 1.150,00 balance, a POST with a 70 KB attachment, PATCH and DELETE, a 404 for another user, a 400 for `userId` in the body and a 401 for a tampered cookie.

## Known limits

- A corrupted record of another user gives 502, not 404, because it must be read before its owner is checked.
- One corrupted record fails the whole list of its owner, since a balance computed without it would be silently wrong.
- A write that times out has an unknown result. The client should read the data again before retrying.
- The MIME type of an attachment is the declared one, not detected from the bytes.
- The transaction routes have no rate limit. They all need a session.
