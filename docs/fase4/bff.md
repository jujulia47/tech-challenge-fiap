# BFF

Requirement: Clean Architecture, the boundary. `@bytebank/bff` (`packages/bff`) is the server-side layer between the browser and the data. It turns the use cases into HTTP handlers written with the standard `Request` and `Response` types, so it does not depend on Next.js or NextAuth. Decisions: [ADR 0007](../adr/0007-bff-with-framework-agnostic-handlers.md) (handlers with no framework), [ADR 0008](../adr/0008-input-validation-at-the-boundary.md) (validation at the boundary) and [ADR 0009](../adr/0009-attachment-size-limit.md) (attachment limit).

## What it does

For each request, in this order:

1. **Refuses cross-site writes.** POST, PATCH and DELETE run only for an allowed origin. A refused request does not read the session or the body.
2. **Authenticates.** The user comes from the session, through the injected `getUserId`, and from nowhere else. Without a session the answer is 401, the request is not read and no use case runs.
3. **Checks the path `id`**, on PATCH and DELETE.
4. **Checks `Content-Length`**, on POST and PATCH, before the body is read, then counts the bytes as they arrive.
5. **Parses the JSON and validates the schema** with Zod. The domain checks the business rules.
6. **Calls the use case.** The handlers hold no business logic.
7. **Translates the result.** Success becomes a core DTO in JSON, and each error a status and a code, with no internal details.

```text
packages/bff/src/
  index.ts                 server entry (imports server-only)
  env.ts                   requireEnv, parseAllowedOrigins
  composition/             createDataAdapters (DATA_BACKEND), use cases, rate limits, lazy handlers
  http/                    the handlers, schemas, origin, errors, limits, client IP
  client/                  the browser clients, exposed as @bytebank/bff/client
  testing/                 the request harness of the tests
```

| Export | Purpose |
|---|---|
| `createDataAdapters(env)` | The adapters of the chosen backend, in one place ([deploy.md](deploy.md)) |
| `createLazyTransactionHandlers(getUserId)`, `createLazyAccountHandlers(...)` | The handlers of the zones, built on the first request |
| `createTransactionHandlers({ getUserId, useCases, allowedOrigins, logger? })` | The seven transaction handlers |
| `createRegisterHandler`, `createPasswordResetHandlers`, `createAccountHandlers` | Registration and recovery in the shell, name and password in the dashboard ([security.md](security.md)) |
| `MAX_ATTACHMENT_BYTES`, from `@bytebank/bff/limits` | The attachment limit. The file has no imports, so a client component can use it without pulling server code into the browser |
| `createTransactionsClient(basePath)`, `createShellClient()`, from `@bytebank/bff/client` | The browser clients ([Shared clients](#shared-clients)) |
| `requireEnv(name)`, `parseAllowedOrigins(value)`, from `@bytebank/bff/env` | Read the server variables, failing with a clear message |

**Built on the first request, not on import.** `next build` loads the route modules, and the build must not need runtime variables. That is why the CI and `docker compose build` work without secrets.

## Endpoints

All bodies use the core format: `amountInCents`, ISO dates and type codes. With the basePath, the URLs are `/dashboard/api/...` and `/transactions/api/...`.

| Route file in `src/app/api` | Method | Handler and use case | Input | Success |
|---|---|---|---|---|
| `transactions/route.ts` | GET | `listTransactions`, `ListTransactions` | None | 200, `TransactionDTO[]`, newest first |
| `transactions/route.ts` | POST | `createTransaction`, `CreateTransaction` | `type`, `amountInCents`, `date`, `attachment?` | 201, `TransactionDTO` |
| `transactions/[id]/route.ts` | PATCH | `updateTransaction`, `UpdateTransaction` | At least one of `type`, `amountInCents`, `date`, `attachment` | 200, `TransactionDTO` |
| `transactions/[id]/route.ts` | DELETE | `deleteTransaction`, `DeleteTransaction` | Path `id` | 204, no body |
| `balance/route.ts` | GET | `getBalance`, `GetBalance` | None | 200, `{ amountInCents }` |
| `statement/route.ts` | GET | `getStatement`, `GetStatement` | None | 200, `{ groups: [{ monthKey, transactions }] }` |
| `chart-data/route.ts` | GET | `getChartData`, `GetChartData` | `period`: `3`, `6` or `all`; `type` optional | 200, `{ byMonth, byType }` |

The dashboard also has `account/profile` and `account/password`, and the shell `register`, `password-reset/request`, `password-reset/confirm` and `session-policy` ([security.md](security.md)).

The routes only delegate. Each one has `dynamic = 'force-dynamic'` and `runtime = 'nodejs'`. `params` is a promise in Next.js 16 and is awaited; the `RouteContext` helper is not used, because its types only exist after `next dev`, `next build` or `next typegen`, and `tsc` on a clean checkout would fail.

```ts
export async function PATCH(request: Request, { params }: TransactionRouteContext) {
  const { id } = await params
  return getTransactionHandlers().updateTransaction(request, id)
}
```

### Errors

| Situation | Status | Body |
|---|---|---|
| Invalid field, unknown field, empty PATCH, invalid id, period or chart type | 400 | `{ error: 'VALIDATION_ERROR', issues: [{ field, message }] }` |
| Invalid JSON or no body | 400 | The same, with `field: 'body'` |
| No session | 401 | `{ error: 'UNAUTHENTICATED' }` |
| Write from an origin that is not allowed | 403 | `{ error: 'FORBIDDEN_ORIGIN' }` |
| `TRANSACTION_NOT_FOUND`, including a transaction of another user | 404 | `{ error: 'TRANSACTION_NOT_FOUND' }` |
| Body above 200 KB | 413 | `{ error: 'PAYLOAD_TOO_LARGE' }` |
| `DomainError` from the client's input, such as a date that does not exist, or `TRANSACTION_DATE_IN_FUTURE` | 422 | `{ error: <code> }` |
| Any failure of the database adapter ([infrastructure.md](infrastructure.md#error-codes)) | 502 | `{ error: 'UPSTREAM_ERROR' }` |
| Anything else, which means a bug | 500 | `{ error: 'INTERNAL_ERROR' }` |

| Handler | 400 | 401 | 403 | 404 | 413 | 422 | 500 | 502 |
|---|---|---|---|---|---|---|---|---|
| `listTransactions`, `getBalance`, `getStatement` | | ✓ | | | | | ✓ | ✓ |
| `createTransaction` | ✓ | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ |
| `updateTransaction` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `deleteTransaction` | ✓ | ✓ | ✓ | ✓ | | | ✓ | ✓ |
| `getChartData` | ✓ | ✓ | | | | | ✓ | ✓ |

- **All 502 responses have the same body on purpose.** The adapter's code, the URL and the record id go to the `logger` only.
- **Client input and stored data never mix.** Invalid input fails in the schema or the use case, before the repository, so it stays 400 or 422. A `DomainError` raised while reading a stored record becomes `CORRUPTED_RECORD` in the adapter, so it is a 502.
- Issues that are not about one field use `field: 'body'`. The `message` values are in English, for developers; the screens show their own texts in Portuguese.
- `logger` receives every error the handlers catch, including client errors; 401 and 403 are not logged, because nothing failed.

## Validation

Schemas are strict: any extra field is a 400.

| Field | Rule |
|---|---|
| `type` | One of `TRANSACTION_TYPES` |
| `amountInCents` | Safe, positive integer |
| `date` | `YYYY-MM-DD`. Whether the date exists is checked by the domain, so `2026-02-31` gets a 422 |
| `attachment` | Optional base64 data URL with an allowed MIME type, at most 70 KB decoded |
| `id` (path) | Letters, digits, `_` and `-`, from 1 to 64 characters |
| `period` (query) | `3`, `6` or `all` |
| `type` (query, optional) | One of `TRANSACTION_TYPES`; an empty value is a 400. It narrows `byMonth` only: `byType` stays complete, because it is the list the type is chosen from |

On PATCH the fields are optional and at least one is required. `attachment: null` removes the attachment, and an absent key keeps it. On POST, `null` is refused.

### Attachment limit: 70 KB

The limit is 70 KB (71 680 bytes) of decoded file, defined once in `packages/bff/src/http/limits.ts` and imported by the form. json-server reads bodies with `milliparsec`, whose limit is 102400 bytes for the **whole body**, and base64 makes a file about a third larger. Measured against 1.0.0-beta.15:

| Decoded attachment | Body sent | Result |
|---|---|---|
| 70 000 bytes | 93 458 bytes | 201 |
| 71 680 bytes (the limit), with the largest values in every other field | 95 758 bytes | 201, with 6 642 bytes to spare |
| 76 707 bytes | 102 398 bytes | 201 (the largest accepted) |
| 76 708 bytes | 102 402 bytes | 500, `Payload too large` |
| 102 400 bytes | 136 658 bytes | 500, `Payload too large` |

The end-to-end test sends an attachment at the limit through POST and PATCH, and sends 80 KB straight to json-server expecting a refusal, so a change in that limit fails a test. Encryption kept the limit, because the bytes of the file are encrypted, not the data URL ([security.md](security.md#attachments)).

## CSRF

Two layers: the session cookie and the origin check.

### `SameSite` of the session cookie: `Lax`

Confirmed in the installed code, not in the documentation. `next-auth` 5.0.0-beta.32 uses `@auth/core` 0.41.3, and `defaultCookies` in `lib/utils/cookie.js` sets on the session cookie:

```js
{ httpOnly: true, sameSite: 'lax', path: '/', secure: useSecureCookies }
```

Calling that function gave `sameSite: 'lax'` for both `authjs.session-token` (HTTP) and `__Secure-authjs.session-token` (HTTPS), and no app overrides `cookies`. The documentation does not state this default (checked on 2026-10-30 in `authjs.dev/reference/nextjs`, `authjs.dev/reference/core`, `authjs.dev/getting-started/deployment`, and `next-auth.js.org/configuration/options` for v4, which only shows it in an example). `next-auth` is in beta, so this must be checked again on every upgrade, by reading the same function. With `Lax`, the browser does not send the cookie on cross-site POST, PATCH or DELETE, which already stops the classic forged form.

### Origin check

`allowedOrigins` is required. It is defense in depth: it does not depend on the cookie, and it also covers another origin on the same site, such as a sibling subdomain, which `SameSite` treats as same-site.

| Request | Result |
|---|---|
| GET | Not checked |
| `Origin` in the list | Passes |
| `Origin` present and not in the list, including `null` and an empty value | 403 `FORBIDDEN_ORIGIN`, with no fallback to `Referer` |
| No `Origin`, `Referer` from an allowed origin | Passes |
| No `Origin`, `Referer` from another origin or not a valid URL | 403 |
| Neither header | 403 |

- **The comparison is exact, on the whole origin** (scheme, host and port). `http://bff.test.evil.example` does not pass for `http://bff.test`, nor does a `Referer` that only mentions the allowed origin in its path or query.
- **It runs before the session**, so a forged request does not cause a session lookup and does not learn whether a session exists.
- **An empty list refuses every write.** Clients that are not browsers must send `Origin`.
- An entry of `ALLOWED_ORIGINS` that is not an exact origin (a trailing slash, for example) stops the app with a message, because it would refuse every write without saying why.

**The header reaches the zones intact through the rewrites of the shell**, in dev and in Docker. With no session, a 401 means the origin passed and a 403 means it did not:

| Sent through the shell (port 3000), POST, PATCH and DELETE, both zones | Result | Conclusion |
|---|---|---|
| `Origin: http://localhost:3000` | 401 | Arrived exactly as sent |
| `Origin: https://evil.example` | 403 | The rewrite does not replace it with an allowed value |
| No `Origin` | 403 | The rewrite does not add one |
| Only `Referer: http://localhost:3000/dashboard` | 401 | `Referer` arrives too, and the fallback works |

## Security rules

- **`userId` comes only from the session.** A `userId` in the body is refused by the schema, and one in the query string is ignored.
- **Another user's transaction looks like it does not exist.** The answer is 404 with the same body as an unknown id; a 403 would confirm that the id exists.
- **Allowed attachments:** `image/png`, `image/jpeg`, `image/webp` and `application/pdf`. Everything else is refused, including SVG, which can carry scripts. This matters because the detail modal shows a PDF inside an `<iframe>`, where a `data:text/html` document would run.
- **Limits:** 70 KB for the decoded attachment and 200 KB for the body. The largest valid body is about 96 KB, so the body limit only refuses abuse early. It does not trust the header: `Content-Length` is checked first, and the bytes are counted while reading, so a chunked request stops at the limit too.
- **The id never reaches the backend URL unchecked.** `encodeURIComponent` keeps `.` and `..`, and `/transactions/..` would become a request to `/`.
- **`Cache-Control: no-store` on every response**, errors included, so financial data stays out of shared and browser caches.
- **Errors do not leak.** A 502 has no URL, status, record id or backend body, and validation issues do not repeat what was received.
- **Attempt limits** apply to login, registration, recovery and password change ([security.md](security.md#attempt-limits)).

## Wiring in the zones

Each zone has only its route files and a `proxy.ts`. The server module that builds the handlers came from a copy in each zone to `createLazyTransactionHandlers(getUserId)` in the bff; the session comes in as a function, so the bff imports neither Next nor NextAuth. `@bytebank/auth/handlers` binds it to the NextAuth of the zone ([modularization.md](modularization.md)).

### Protection of the zones

Each zone has its own `src/proxy.ts` (from `@bytebank/auth/zoneProxy`), so a page is protected even when the shell is bypassed.

- A page without a session redirects to `SHELL_URL`. A relative `/` would stay inside the basePath of the zone.
- A session is valid with the same criterion as the shell: `!!req.auth?.user`.
- `/api/*` is outside the matcher: the handlers answer 401 in JSON, and `/api/auth/*` stays reachable.

**The matcher needs an explicit `'/'`.** Next.js prefixes the matcher with the basePath, so `/((?!api/|...).*)` needs a slash after `/dashboard`, and the root of the zone escaped it: the first smoke test showed `/dashboard` answering 200 with no session. The docs of `proxy` and `basePath` do not mention this.

```ts
matcher: ['/', '/((?!api/|_next/static|_next/image|favicon.ico).*)']
```

The shell does not guard `/dashboard/api/*` and `/transactions/api/*`, so the client gets the 401 from the handler, not a redirect to HTML. The pattern requires `api/`, so a page such as `/dashboard/apiary` stays protected:

```ts
matcher: ['/dashboard', '/dashboard/((?!api/).*)', '/transactions', '/transactions/((?!api/).*)']
```

### Variables

Server only, with no `NEXT_PUBLIC_` prefix. The full list for local runs is in the README and in each `.env.example`; production is in [deploy.md](deploy.md#variables-per-vercel-project). A missing variable never gets a default in the zones. Tested on the real image, one variable removed at a time:

| Situation | Response | Server log |
|---|---|---|
| No `JSON_SERVER_URL`, API request | 500 | `Missing required environment variable: JSON_SERVER_URL` |
| No `SHELL_URL`, page without a session | 500 | `Missing required environment variable: SHELL_URL` |
| `ALLOWED_ORIGINS` with a trailing slash | 500 | `ALLOWED_ORIGINS has an invalid origin: "http://localhost:13006/"` |

Without `SHELL_URL` the API keeps working: only the redirect needs it. The secrets are checked earlier, at start ([security.md](security.md#secrets)).

## Shared clients

`createTransactionsClient(basePath)` is the only HTTP client of the zones, used by both through `createTransactionsApi` of `@bytebank/store` ([state-management.md](state-management.md)). `createShellClient()` is the client of the shell: registration, "Esqueci a senha", reset and the session policy. Both live in `packages/bff/src/client/`, exposed as `@bytebank/bff/client`, because the package defines the contract and the clients must change with it.

| Function | Request |
|---|---|
| `fetchTransactions()` | `GET {basePath}/api/transactions` |
| `createTransaction(data)` | `POST {basePath}/api/transactions` |
| `updateTransaction(id, changes)` | `PATCH {basePath}/api/transactions/{id}` |
| `deleteTransaction(id)` | `DELETE {basePath}/api/transactions/{id}` |
| `fetchBalance()` | `GET {basePath}/api/balance` |
| `fetchStatement()` | `GET {basePath}/api/statement` |
| `fetchChartData({ period, type? })` | `GET {basePath}/api/chart-data?period=...&type=...` |

- **The URLs are relative and include the basePath**, which Next.js does not add to `fetch`. The browser is on the origin of the shell, and the rewrite reaches the zone, so the `Origin` header is the one in `ALLOWED_ORIGINS`. Direct access to port 3002 can read but cannot write: the origin is another one, so a write gets 403.
- **401** sends the browser to `/`, the login in the shell, with a full page load, and throws, so nothing goes on as if the request had worked.
- **Any other error** throws with the code from the bff, such as `VALIDATION_ERROR`; a response that is not JSON gets `UNKNOWN_ERROR`. The screens show their own messages in Portuguese and never the code.
- **It imports types only**, so no server code reaches the browser. A test reads the source to enforce this, and the build confirms it: `ZodError`, `UPSTREAM_UNREACHABLE`, `HttpTransactionRepository` and `createJsonServerUseCases` appear in no file of `.next/static`, in either zone.

**What changed on the screens when they moved to the bff:**

| Where | Before | Now |
|---|---|---|
| Value | `R$ 350,00` for everything | `-R$ 350,00` for expenses, `R$ 2.500,00` for income |
| Month group | `Novembro` | `Novembro de 2022`; the same month of different years no longer merges |
| Month filter | Month name | Month and year, newest first |
| Order | Insertion order, reversed | Newest first, from the core |
| Loading | "Nenhuma transação encontrada" for a moment | "Carregando transações..." |
| Failure | "Nenhuma transação encontrada", a false statement in a bank | "Não foi possível carregar as transações" |
| Edit | `PUT` of the whole record | `PATCH` with only `{ type, amountInCents }` |

## How to validate

- `npm test` runs every handler with real `Request` objects, and the end-to-end test against the installed json-server ([testing.md](testing.md#bff)). Coverage and the mutation check are there too.

### Smoke tests

With `curl` and no session, in `npm run dev` and in Docker, through the shell and directly on the zones: 47 checks, all passing in both environments.

| Request | Through the shell (3000) | Direct (3002, 3003) |
|---|---|---|
| `GET /dashboard/api/transactions`, `/balance`, `/statement`, `/chart-data?period=all` | 401 JSON | 401 JSON |
| `POST /dashboard/api/transactions`, strange `Origin` | 403 JSON | 403 JSON |
| `GET /dashboard/api/auth/session` | 200 `null` | 200 `null` |
| `GET /dashboard`, `/dashboard/account`, `/transactions` (pages) | 307 to `/` | 307 to `SHELL_URL` |

The `/transactions/api/*` routes gave the same results.

**With a session**, on the real image and the real `auth()`, in isolated containers with a throwaway secret, a session cookie signed with it and a temporary database: 21 of 21 checks passed. They covered the 7 migrated records, newest first; a balance of 115000 cents; statement and chart data; a page behind the zone proxy; a POST with a 70 KB attachment, with the owner taken from the session; PATCH and DELETE on `[id]`; 404 for another user; 400 for `userId` in the body; and 401 for a tampered cookie.

**In the browser**, through the shell, in Docker: list, pagination, filters, search, detail, edit (with the exact body of the PATCH and a reload), delete, a load failure, direct access (403) and an expired session (redirect to `/`), with no console error.

## Known limits

- **A corrupted record of another user gives 502, not 404.** `findById` reads the record before it can check the owner. A user would need to know the id, and all it reveals is that a broken record exists.
- **One corrupted record fails the whole list of its owner.** A 502 instead of a partial list: a balance computed without a record would be wrong without anyone noticing. (An attachment that cannot be decrypted is different: the transaction comes without it, see [security.md](security.md#attachments).)
- **A write that times out has an unknown result** ([infrastructure.md](infrastructure.md#known-limits)).
- **The MIME type is declared, not detected.** The schema checks what the data URL says, not the bytes. With the allowlist, this is enough for how attachments are displayed: an image in `<img>`, a PDF in the browser's viewer.
- **The transaction routes have no rate limit**, only the authentication routes do. Every transaction route needs a session.
