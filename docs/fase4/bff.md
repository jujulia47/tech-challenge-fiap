# Phase 4: BFF (Step 2.1)

**Date:** 2026-10-30

`@bytebank/bff` (`packages/bff`) is the server-side layer between the zones and the data. It turns the use cases into HTTP handlers, written with the standard `Request` and `Response` types. **Both zones expose it since step 2.2** (see [Wiring in the zones](#wiring-in-the-zones-step-22)). The transactions zone calls it since step 2.3 (see [Transactions zone](#transactions-zone-step-23)), and the dashboard since step 2.4b (see `state-management.md`).

See [ADR 0007](../adr/0007-bff-with-framework-agnostic-handlers.md), [ADR 0008](../adr/0008-input-validation-at-the-boundary.md) and [ADR 0009](../adr/0009-attachment-size-limit.md).

```text
packages/bff/src/
  index.ts
  env.ts
  composition/createUseCases.ts
  composition/createJsonServerUseCases.ts
  http/limits.ts
  http/origin.ts
  http/schemas.ts
  http/errors.ts
  http/responses.ts
  http/createTransactionHandlers.ts
  testing/handlerHarness.ts
```

## Role

- **Refuses cross-site writes.** POST, PATCH and DELETE only run for an allowed origin.
- **Authenticates.** The user comes from the session, through the injected `getUserId`, and from nowhere else.
- **Validates the request.** Zod checks the format at the boundary, and the domain checks the business rules. See ADR 0008.
- **Calls the use case.** The handlers hold no business logic.
- **Translates the result.** Success becomes a core DTO in JSON, and each error becomes a status and a code, with no internal details.

The package depends on `@bytebank/core`, `@bytebank/infrastructure` and `zod`, and not on Next.js or NextAuth.

## Public API

| Export | Purpose |
|---|---|
| `createUseCases({ repository, clock, idGenerator })` | Builds the seven use cases from the ports |
| `createJsonServerUseCases({ baseUrl, timeoutMs? })` | The same, with `HttpTransactionRepository`, `SaoPauloClock` and `CryptoIdGenerator`. `timeoutMs` defaults to 5 s |
| `createTransactionHandlers({ getUserId, useCases, allowedOrigins, logger? })` | Returns the seven handlers |
| `MAX_ATTACHMENT_BYTES`, from `@bytebank/bff/limits` | The attachment limit. The subpath has no imports, so a client component can use it without pulling server code into the browser bundle |
| `createTransactionsClient(basePath)`, from `@bytebank/bff/client` | The browser client of these endpoints, shared by the zones. See [Shared client](#shared-client-step-24a) |
| `requireEnv(name)` and `parseAllowedOrigins(value)`, from `@bytebank/bff/env` | Read the server variables, failing with a clear message. The subpath has no imports either, so `proxy.ts` can use it |

`logger` is an object with `error(error: unknown)`, so `console` fits. The default is no logging. It receives every error the handlers catch, including client errors. The 401 and the 403 are not logged, because nothing failed.

## Endpoints

The URLs are defined by the route files in step 2.2. All bodies use the core format: `amountInCents`, ISO dates and type codes.

| Handler | Method | Use case | Input | Success |
|---|---|---|---|---|
| `listTransactions(request)` | GET | `ListTransactions` | None | 200, `TransactionDTO[]`, newest first |
| `createTransaction(request)` | POST | `CreateTransaction` | Body: `type`, `amountInCents`, `date`, `attachment?` | 201, `TransactionDTO` |
| `updateTransaction(request, id)` | PATCH | `UpdateTransaction` | Path `id`; body with at least one of `type`, `amountInCents`, `date`, `attachment` | 200, `TransactionDTO` |
| `deleteTransaction(request, id)` | DELETE | `DeleteTransaction` | Path `id` | 204, no body |
| `getBalance(request)` | GET | `GetBalance` | None | 200, `{ amountInCents }` |
| `getStatement(request)` | GET | `GetStatement` | None | 200, `{ groups: [{ monthKey, transactions }] }` |
| `getChartData(request)` | GET | `GetChartData` | Query `period`: `3`, `6` or `all` (required); `type`: a type code (optional) | 200, `{ byMonth, byType }` |

Possible error codes per handler:

| Handler | 400 | 401 | 403 | 404 | 413 | 422 | 500 | 502 |
|---|---|---|---|---|---|---|---|---|
| `listTransactions` | | ✓ | | | | | ✓ | ✓ |
| `createTransaction` | ✓ | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ |
| `updateTransaction` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `deleteTransaction` | ✓ | ✓ | ✓ | ✓ | | | ✓ | ✓ |
| `getBalance` | | ✓ | | | | | ✓ | ✓ |
| `getStatement` | | ✓ | | | | | ✓ | ✓ |
| `getChartData` | ✓ | ✓ | | | | | ✓ | ✓ |

### Order of the checks

1. **Origin**, on POST, PATCH and DELETE. A refused request does not read the session or the body.
2. **Session.** Without it the answer is 401, the request is not read and no use case runs.
3. **Path `id`**, on PATCH and DELETE.
4. **`Content-Length`**, on POST and PATCH, before the body is read.
5. **Body read**, counting the bytes as they arrive.
6. **JSON parsing.**
7. **Schema.**
8. **Use case**, where the domain rules run.

### Error translation

| Situation | Status | Body |
|---|---|---|
| Invalid field, unknown field, empty PATCH, invalid id, period or chart type | 400 | `{ error: 'VALIDATION_ERROR', issues: [{ field, message }] }` |
| Invalid JSON or no body | 400 | The same, with `field: 'body'` |
| No session | 401 | `{ error: 'UNAUTHENTICATED' }` |
| Write from an origin that is not allowed | 403 | `{ error: 'FORBIDDEN_ORIGIN' }` |
| `TRANSACTION_NOT_FOUND`, including a transaction of another user | 404 | `{ error: 'TRANSACTION_NOT_FOUND' }` |
| Body above 200 KB | 413 | `{ error: 'PAYLOAD_TOO_LARGE' }` |
| `DomainError` from the client's input, such as a date that does not exist | 422 | `{ error: <code> }` |
| `TRANSACTION_DATE_IN_FUTURE` | 422 | `{ error: 'TRANSACTION_DATE_IN_FUTURE' }` |
| Backend unreachable: down, DNS failure, connection reset (`UPSTREAM_UNREACHABLE`) | 502 | `{ error: 'UPSTREAM_ERROR' }` |
| Backend accepted the request and did not finish answering in time (`UPSTREAM_TIMEOUT`) | 502 | `{ error: 'UPSTREAM_ERROR' }` |
| Invalid record read from the database (`CORRUPTED_RECORD`) | 502 | `{ error: 'UPSTREAM_ERROR' }` |
| Backend answered with an error or something that is not JSON (`UPSTREAM_BAD_STATUS`, `UPSTREAM_INVALID_RESPONSE`) | 502 | `{ error: 'UPSTREAM_ERROR' }` |
| Anything else, which means a bug | 500 | `{ error: 'INTERNAL_ERROR' }` |

All the 502 responses have the same body on purpose. The `InfrastructureError` code, the URL and the record id go to the `logger` only.

Client input and stored data never mix. Invalid input fails in the schema or in the use case, before the repository is called, so it stays 400 or 422. A `DomainError` raised while reading a stored record is converted to `CORRUPTED_RECORD` by the adapter, so it is a 502.

Issues that are not about one field use `field: 'body'`, such as an unknown key. The `message` values are in English: they are for developers, and the interface shows its own texts in Portuguese.

## Validation

Schemas are strict: any extra field is a 400.

| Field | Rule |
|---|---|
| `type` | One of `TRANSACTION_TYPES` |
| `amountInCents` | Safe, positive integer |
| `date` | String in the `YYYY-MM-DD` format. Whether the date exists is checked by the domain, so `2026-02-31` gets a 422 |
| `attachment` | Optional base64 data URL with an allowed MIME type, at most 70 KB when decoded |
| `id` (path) | Letters, digits, `_` and `-`, from 1 to 64 characters |
| `period` (query) | `3`, `6` or `all` |
| `type` (query, optional) | One of `TRANSACTION_TYPES`. An empty value is a 400. It narrows `byMonth` only: `byType` stays complete, because it is the list the type is chosen from |

On PATCH the same fields are optional, and at least one is required. `attachment: null` removes the attachment, and an absent key keeps it. On POST, `null` is rejected.

## Attachment limit: 70 KB

The limit is 70 KB (71 680 bytes) of decoded file, in the bff and in the form. See ADR 0009.

**Why 70 KB.** json-server reads bodies with `milliparsec`, whose default limit is 102400 bytes (100 KB) for the **whole body**, and base64 makes the attachment about a third larger. 100 KB of limit, minus the base64 growth and the other fields, leaves room for about 76 KB of file. 70 KB keeps a margin. Against the installed version (1.0.0-beta.15):

| Decoded attachment | Body sent | Result |
|---|---|---|
| 70 000 bytes | 93 458 bytes | 201 |
| 71 680 bytes (the limit), with the largest values in every other field | 95 758 bytes | 201, with 6 642 bytes to spare |
| 76 707 bytes | 102 398 bytes | 201 (the largest accepted) |
| 76 708 bytes | 102 402 bytes | 500, `Payload too large` |
| 102 400 bytes | 136 658 bytes | 500, `Payload too large` |

`createJsonServerUseCases.e2e.test.ts` sends an attachment at the limit through POST and through PATCH. It also sends 80 KB straight to json-server and expects a refusal, so a change in that limit shows up as a failing test.

The limit is defined once, in `packages/bff/src/http/limits.ts`. The form still has the number written directly, until step 2.2.

## CSRF

There are two layers: the session cookie and the origin check.

### `SameSite` of the session cookie: `Lax`

**Confirmed in the installed code, not in the documentation.** `next-auth` 5.0.0-beta.32 uses `@auth/core` 0.41.3, and `defaultCookies` in `lib/utils/cookie.js` sets these options on the session cookie:

```js
{ httpOnly: true, sameSite: 'lax', path: '/', secure: useSecureCookies }
```

Calling that function gave `sameSite: 'lax'` for both `authjs.session-token` (HTTP) and `__Secure-authjs.session-token` (HTTPS). No `auth.ts` in the apps sets `cookies`, so the default applies.

The documentation does not state this default. Checked on 2026-10-30:

| Page | Documents | What it says |
|---|---|---|
| `authjs.dev/reference/nextjs` | v5 | Options can be overridden, default `{}`. No mention of `sameSite` |
| `authjs.dev/reference/core` | `@auth/core` | The same |
| `authjs.dev/getting-started/deployment` | v5 | No mention of `sameSite` |
| `next-auth.js.org/configuration/options` | v4 | Shows `sameSite: 'lax'` in an example of overriding, without calling it the default |

`next-auth` is still in beta, so this should be checked again on every upgrade, by reading the same function.

With `Lax`, the browser does not send the cookie on cross-site POST, PATCH or DELETE requests, which already stops the classic forged form.

### Origin check

`allowedOrigins: string[]` is required. It is defense in depth: it does not depend on the cookie attributes, and it also covers requests from another origin on the same site, such as a sibling subdomain, which `SameSite` treats as same-site.

| Request | Result |
|---|---|
| GET | Not checked |
| `Origin` in the list | Passes |
| `Origin` present and not in the list, including `null` and an empty value | 403 `FORBIDDEN_ORIGIN`, with no fallback to `Referer` |
| No `Origin`, `Referer` from an allowed origin | Passes |
| No `Origin`, `Referer` from another origin or not a valid URL | 403 |
| Neither header | 403 |

- **The comparison is exact, on the whole origin** (scheme, host and port). `http://bff.test.evil.example` does not pass for `http://bff.test`, and neither does a `Referer` that only mentions the allowed origin in its path or query. The entries in the list must be in the same form as the header: no trailing slash.
- **It runs before the session.** A forged request does not cause a session lookup and does not learn whether a session exists. So a request with no session and a bad origin gets a 403, not a 401.
- **An empty list refuses every write.**
- **Clients that are not browsers must send `Origin`.** Browsers send it on these methods. A script or a server-side call without it gets a 403.

## Security rules

- **`userId` comes only from the session.** A `userId` in the body is rejected by the schema, and one in the query string is ignored.
- **Another user's transaction looks like it does not exist.** The answer is 404, not 403, with the same body as an unknown id. A 403 would confirm that the id exists.
- **Writes are refused from other origins.** See [CSRF](#csrf).
- **Allowed attachments:** `image/png`, `image/jpeg`, `image/webp` and `application/pdf`. Everything else is rejected, including SVG, which can carry scripts. This matters because `ModalTransactionDetail` shows any attachment that is not an image inside an `<iframe>`, where a `data:text/html` document would run.
- **Limits:** 70 KB for the decoded attachment and 200 KB for the body. The largest valid body is about 96 KB, so the body limit is only there to refuse abuse early.
- **The body limit does not trust the header.** `Content-Length` is checked first, so that an oversized request is refused without reading it. It may also be missing, as in a chunked request, so the bytes are counted while reading, and the read stops at the limit.
- **The id never reaches the backend URL unchecked.** `encodeURIComponent` keeps `.` and `..`, and `/transactions/..` would become a request to `/`.
- **`Cache-Control: no-store` on every response**, including errors, so that financial data stays out of shared and browser caches.
- **Errors do not leak.** The original error goes to the `logger` and never to the response. A 502 has no URL, status, record id or backend body. Validation issues do not repeat what was received.

## Known limits

- **A corrupted record of another user gives 502, not 404.** `findById` has to read the record before it can check the owner, so it fails first. A user would need to know the id, and all it reveals is that a broken record exists. A record in the legacy format has no `userId`, so it behaves the same way.
- **One corrupted record fails the whole list of its owner.** The answer is a 502 instead of a partial list: a balance computed without a record would be wrong without anyone noticing.
- **A write that times out has an unknown result.** `UPSTREAM_TIMEOUT` on POST, PATCH or DELETE means that the answer did not arrive, not that the write did not happen. The client gets a 502 and should read the data again before retrying.
- **The MIME type is declared, not detected.** The schema checks what the data URL says, not the content. A file whose bytes do not match its declared type passes. Together with the allowlist, this is enough for how attachments are displayed today: an image goes in `<img>`, and a PDF is handled by the browser's PDF viewer.
- **There is no rate limiting.**

## Testing

Every handler is tested with real `Request` objects, `InMemoryTransactionRepository`, `FixedClock` and `SequentialIdGenerator`, from `@bytebank/core/testing`. `createJsonServerUseCases.e2e.test.ts` runs handlers, use cases and adapters against the installed json-server, on a temporary copy of `e2e-db.json`, and against a port with no server. See `testing.md`.

Coverage is 100% on the package. The tests were also checked by mutation, applying one deliberate change at a time and confirming that a test fails. In the closing round there were 53 changes (removing a check, comparing origins by prefix, letting a `DomainError` escape the mapper, keeping a parse error as the cause, leaking the code in a 502), and all of them were caught.

The new code of step 2.2 (timeout and environment variables) went through the same check: 15 changes, all caught.

## Wiring in the zones (step 2.2)

Both zones expose the same API. The screens that still read json-server directly, in the old format, stay broken until they move to it, which is expected. The shell page `/sobre` is in the same situation: it reads `label`, which no longer exists, so its list of types is empty.

### Server module

`src/server/transactionHandlers.ts`, identical in both zones, exports `getTransactionHandlers()`.

```ts
handlers ??= createTransactionHandlers({
  getUserId: async () => (await auth())?.user?.id ?? null,
  useCases: createJsonServerUseCases({ baseUrl: requireEnv('JSON_SERVER_URL') }),
  allowedOrigins: parseAllowedOrigins(requireEnv('ALLOWED_ORIGINS')),
  logger,
})
```

- **`import 'server-only'`** turns an import from a Client Component into a build error. The package is declared in both zones. The Next.js docs say that installing it is optional, because Next.js handles the import internally.
- **The handlers are built on the first request, not on import.** `next build` loads the route modules, and the build must not need runtime variables. That is why CI and `docker compose build` work without them.
- **`logger`** calls `console.error`, which goes to the server log. It receives every error the handlers catch, including client errors such as a 404.

### Routes

The routes only delegate. Each one has `dynamic = 'force-dynamic'` and `runtime = 'nodejs'`, and `next build` lists all of them as dynamic (`ƒ`).

| File in `src/app/api` | Methods | Handlers |
|---|---|---|
| `transactions/route.ts` | GET, POST | `listTransactions`, `createTransaction` |
| `transactions/[id]/route.ts` | PATCH, DELETE | `updateTransaction`, `deleteTransaction` |
| `balance/route.ts` | GET | `getBalance` |
| `statement/route.ts` | GET | `getStatement` |
| `chart-data/route.ts` | GET | `getChartData` |

With the `basePath`, the URLs are `/dashboard/api/...` and `/transactions/api/...`.

**Receiving `[id]`.** Confirmed in the docs that ship with Next.js 16.4.3 (`next/dist/docs/.../file-conventions/route.md`) and in nextjs.org: "`params`: a promise that resolves to an object containing the dynamic route parameters for the current route", so it must be awaited.

```ts
export async function PATCH(request: Request, { params }: TransactionRouteContext) {
  const { id } = await params
  return getTransactionHandlers().updateTransaction(request, id)
}
```

The docs also offer the `RouteContext` helper. It is not used here, because its types only exist after `next dev`, `next build` or `next typegen`, and `tsc` on a clean checkout would fail.

### Variables

Server only, with no `NEXT_PUBLIC_` prefix. They are declared in `turbo.json`, and each zone has a `.env.example`.

| Variable | Purpose | Local | Docker Compose |
|---|---|---|---|
| `JSON_SERVER_URL` | Address of json-server, seen from the server | `http://localhost:3001` | `http://json-server:3001` |
| `ALLOWED_ORIGINS` | Comma-separated origins allowed to write | `http://localhost:3000` | `http://localhost:3000` |
| `SHELL_URL` | Public address of the shell, target of the redirect | `http://localhost:3000` | `http://localhost:3000` |

The shell also has `JSON_SERVER_URL`, for the page `/sobre`, and its login uses `NEXTAUTH_API_URL`. Both are read on the server only.

A missing variable never gets a default in the zones. In `/sobre`, a public page, it only hides the numbers. Tested on the real image, with one variable removed at a time:

| Situation | Response | Server log |
|---|---|---|
| No `JSON_SERVER_URL`, API request | 500 | `Missing required environment variable: JSON_SERVER_URL` |
| No `SHELL_URL`, page without a session | 500 | `Missing required environment variable: SHELL_URL` |
| `ALLOWED_ORIGINS` with a trailing slash | 500 | `ALLOWED_ORIGINS has an invalid origin: "http://localhost:13006/"` |

The last check exists because an entry that is not an exact origin would refuse every write without saying why. Without `SHELL_URL`, the API keeps working: only the redirect needs it.

### Protection of the zones

Each zone has its own `src/proxy.ts`, so a page is protected even when the shell is bypassed. Next.js 16 runs proxy on the Node.js runtime, and that cannot be changed.

- A page without a session redirects to `SHELL_URL`. A relative `/` would stay inside the `basePath` of the zone.
- A session is valid with the same criterion as the shell: `!!req.auth?.user`.
- `/api/*` is outside the matcher: the handlers answer 401 in JSON, and `/api/auth/*` stays reachable.

**The matcher needs an explicit `'/'`.** Next.js prefixes the matcher with the `basePath`, so `/((?!api/|...).*)` becomes a pattern that needs a slash after `/dashboard`, and the root of the zone escapes it. The first smoke test showed exactly this: `/dashboard/account` redirected, and `/dashboard` answered 200 without a session. The docs of `proxy` and `basePath` do not mention this.

```ts
matcher: ['/', '/((?!api/|_next/static|_next/image|favicon.ico).*)']
```

### Shell matcher

The shell no longer guards `/dashboard/api/*` and `/transactions/api/*`, so the client gets the 401 from the handler, not a redirect to HTML.

```ts
matcher: ['/dashboard', '/dashboard/((?!api/).*)', '/transactions', '/transactions/((?!api/).*)']
```

The pattern requires `api/`, so a page such as `/dashboard/apiary` stays protected.

### Origin through the rewrites

**The header reaches the zone intact, in `npm run dev` and in Docker.** `allowedOrigins` holds the public address of the shell.

The origin check runs before the session, so without a session a request has two possible answers, and they show what arrived: a 401 means that the origin passed the exact comparison, and a 403 means that it did not. All requests went through the shell, on port 3000, to both zones, with POST, PATCH and DELETE.

| Sent through the shell | Result | Conclusion |
|---|---|---|
| `Origin: http://localhost:3000` | 401 | Arrived exactly as sent |
| `Origin: https://evil.example` | 403 | The rewrite does not replace it with an allowed value |
| No `Origin` | 403 | The rewrite does not add one |
| Only `Referer: http://localhost:3000/dashboard` | 401 | `Referer` arrives too, and the fallback works |

### Timeout

Every request of `HttpTransactionRepository` has a timeout of 5 s, configurable through `timeoutMs`. It covers the body too, so a server that stops halfway also gets a `UPSTREAM_TIMEOUT`. The bff answers 502 with the same generic body. `update` and `delete` make two requests, so they can take up to twice the timeout. See `infrastructure.md`.

### Smoke tests

Run with `curl` and no session, in `npm run dev` and in Docker, through the shell and directly on the zones: 47 checks, all passing in both environments.

| Request | Through the shell (3000) | Direct (3002, 3003) |
|---|---|---|
| `GET /dashboard/api/transactions` | 401 JSON | 401 JSON |
| `GET /dashboard/api/balance` | 401 JSON | 401 JSON |
| `GET /dashboard/api/statement` | 401 JSON | 401 JSON |
| `GET /dashboard/api/chart-data?period=all` | 401 JSON | 401 JSON |
| `POST /dashboard/api/transactions`, strange `Origin` | 403 JSON | 403 JSON |
| `GET /dashboard/api/auth/session` | 200 `null` | 200 `null` |
| `GET /dashboard` (page) | 307 to `/` | 307 to `SHELL_URL` |
| `GET /dashboard/account` (page) | 307 to `/` | 307 to `SHELL_URL` |
| `GET /transactions` (page) | 307 to `/` | 307 to `SHELL_URL` |

The `/transactions/api/*` routes gave the same results as the dashboard routes.

**With a session.** These checks use the real image and the real `auth()`, in isolated containers: a throwaway secret, a session cookie signed with it, and a temporary database. No real password or secret was involved. All 21 passed: the 7 migrated records, newest first; a balance of 115000 cents; statement and chart data; a page behind the zone proxy; a POST with a 70 KB attachment, with the owner taken from the session; PATCH and DELETE on `[id]`; 404 for another user; 400 for `userId` in the body; and 401 for a tampered cookie.

### The json-server version in Docker

During this step, Docker Compose was running json-server 0.17.4, not the 1.0.0-beta.15 of the repository. It was pinned in step 2.3. See `infrastructure.md`.

### Still to do

- **Vercel:** set the three variables in the two zone projects, with the production address of the shell in `ALLOWED_ORIGINS` and `SHELL_URL`. The rewrites in `apps/shell/vercel.json` cover the API routes, but the Origin test was only done in dev and in Docker.

## Transactions zone (step 2.3)

The transactions zone is the first one to use the BFF. It no longer reads json-server from the browser.

### Client

Since step 2.5a the zone reaches these requests through RTK Query (see `state-management.md`), which uses the shared client (see [Shared client](#shared-client-step-24a)). The types are `TransactionDTO` from the core.

| Function | Request |
|---|---|
| `fetchTransactions()` | `GET /transactions/api/transactions` |
| `createTransaction(data)` | `POST /transactions/api/transactions` |
| `updateTransaction(id, changes)` | `PATCH /transactions/api/transactions/{id}` |
| `deleteTransaction(id)` | `DELETE /transactions/api/transactions/{id}` |

- **The URLs are relative, and they include the `basePath`.** Next.js does not add it to `fetch`. The browser is on the origin of the shell, and the rewrite reaches the zone, so the `Origin` header is the one in `ALLOWED_ORIGINS`.
- **Direct access to port 3002 can read, but it cannot write.** The browser is then on another origin, so a PATCH or DELETE gets a 403, and the screen shows its generic error message. This is the origin check working: use the shell, on port 3000.

### Errors

- **401:** the client sends the browser to `/`, the root of the shell, where the login is. It is a full page load, because that page belongs to another zone. It also throws, so nothing goes on as if the request had worked.
- **Any other error:** it throws a `TransactionsApiError` with the code from the BFF, such as `VALIDATION_ERROR`. A response that is not JSON gets `UNKNOWN_ERROR`. The screens show their own messages in Portuguese and never the code.
- **A failed load is not an empty statement.** The page shows an alert. Before this step a failure looked like "Nenhuma transação encontrada", which in a bank statement would be a false statement.

### What changed on the screen

| Where | Before | Now |
|---|---|---|
| Value | `R$ 350,00` for everything | `-R$ 350,00` for expenses, `R$ 2.500,00` for income |
| Month group | `Novembro` | `Novembro de 2022`, and the same month of different years no longer merges |
| Month filter | Month name | Month and year, newest first |
| Order | Insertion order, reversed | Newest first, from the core |
| Loading | "Nenhuma transação encontrada" for a moment | "Carregando transações..." |
| BFF failure | "Nenhuma transação encontrada" | "Não foi possível carregar as transações" |
| Edit | `PUT` of the whole record | `PATCH` with only `{ type, amountInCents }` |

The search looks at the formatted values, so `-R$` finds the expenses, and `20/01/2026` matches, while `2026-01` does not.

### Tested in a browser

The screen was used in a real Chrome, through the shell, against an isolated stack: the new images, json-server 1.0.0-beta.15, a temporary database, a made-up user and a throwaway secret. The login went through NextAuth. It covered the list, pagination, both filters, the search, the detail, an edit (with the exact body of the PATCH, and a reload to confirm it persisted), a delete, a load failure, direct access (403) and an expired session (redirect to `/`). The console had no errors. The script is not in the repository, because the apps have no end-to-end setup.

**This test had a blind spot.** Its stack mounted a folder, and the real `docker-compose.yml` mounted a file, so it did not catch the 502 on edit and delete described in `infrastructure.md` (step 2.3b).

## Shared client (step 2.4a)

`createTransactionsClient(basePath)` is the only HTTP client of the BFF. It lives in `packages/bff/src/client/`, exposed as `@bytebank/bff/client`, because this package already defines the contract, and the client must change together with it.

**It imports types only**, so no server code reaches the browser. A test reads the source to enforce this, and the build confirms it: `ZodError`, `UPSTREAM_UNREACHABLE`, `HttpTransactionRepository` and `createJsonServerUseCases` appear in no file of `.next/static`, in either zone. It is not exported by the main entry, which is server code.

| Function | Request |
|---|---|
| `fetchTransactions()` | `GET {basePath}/api/transactions` |
| `createTransaction(data)` | `POST {basePath}/api/transactions` |
| `updateTransaction(id, changes)` | `PATCH {basePath}/api/transactions/{id}` |
| `deleteTransaction(id)` | `DELETE {basePath}/api/transactions/{id}` |
| `fetchBalance()` | `GET {basePath}/api/balance` |
| `fetchStatement()` | `GET {basePath}/api/statement` |
| `fetchChartData({ period, type? })` | `GET {basePath}/api/chart-data?period=...&type=...` |

The behavior is the one described in [Transactions zone](#transactions-zone-step-23): relative URLs that include the `basePath`, a 401 sends the browser to `/`, and any other error throws `TransactionsApiError` with the code from the BFF.

Both zones use it through `createTransactionsApi` from `@bytebank/store` (see `state-management.md`).

The redirect uses `window.location.href` directly. The `eslint-disable` that the zone needed did not come along: that rule belongs to the Next.js lint config, which does not run on packages, and disabling a rule that is not defined is an ESLint error.
