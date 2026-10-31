# Phase 4: testing (Steps 0.5, 1.1 to 1.4b, 2.1 to 2.5b)

**Date:** 2026-10-29, updated 2026-10-30

## Strategy

The repository has two kinds of unit test, and they answer different questions:

| Package | Kind | Question it answers | When a test fails |
|---|---|---|---|
| `packages/utils` | **Characterization** | What does the code do today? | The behavior changed. Decide whether that was intended. |
| `packages/core` | **Specification** | What must the domain do? | The domain is wrong. Fix the code, not the test. |
| `packages/infrastructure` | **Specification** | Do the adapters talk to the outside correctly? | The adapter is wrong. Fix the code, not the test. |
| `packages/bff` | **Specification** | Does the HTTP contract hold? | The contract broke. Fix the code, not the test. |

### Characterization tests (`packages/utils`)

The first tests are **characterization tests**. They record what the code does today, including odd or questionable behavior, instead of what it should do. They do not fix anything. When a test asserts behavior that looks like a bug, it is marked with:

```ts
// Characterization: current behavior, see docs/fase4/testing.md
```

and listed under [Questionable behaviors](#questionable-behaviors).

They come before the refactor on purpose. The Phase 4 refactor (Clean Architecture, moving logic out of components, shared packages) will move this code around. With the current behavior pinned down, any change in output during the refactor shows up as a failing test. If the change is intended (for example, fixing one of the questionable behaviors), the test is updated in the same change, together with this document. If it is not intended, it is a regression.

### Specification tests (`packages/core`)

The `packages/core` tests are **specification tests**. The domain is new code, so there is no earlier behavior to record. The tests state the desired rules: every invariant and `DomainError`, value object limits (`-0`, unsafe integers, leap years, timezone safety), immutability, and the round trip of `toPrimitives`/`fromPrimitives`. They have no `Characterization` markers, because a surprising result there is a bug to fix. The rules themselves are documented in `docs/fase4/domain.md`.

## How to run

From the repository root:

| Script | Command | Use |
|---|---|---|
| `npm test` | `vitest run` | Run the unit tests once |
| `npm run test:watch` | `vitest` | Re-run on file changes during development |
| `npm run test:coverage` | `vitest run --coverage` | Run once and print coverage (v8) |

Configuration is in `vitest.config.mts` at the root:

- project name `unit`, environment `node`;
- `include: ['packages/**/src/**/*.test.ts']`;
- coverage via `@vitest/coverage-v8`, on `packages/*/src/**/*.ts` (test files excluded, new packages enter automatically), with `text` and `json-summary` reporters. The JSON summary is written to `/coverage`, which is gitignored and in `.dockerignore`.

The shell's `apps/shell/vitest.config.ts` (project `storybook`, browser mode with Playwright) is separate and unchanged. The root config does not include any story or anything under `apps/shell/.storybook`.

`vitest` and `@vitest/coverage-v8` are declared in the root `devDependencies` with the same range as the shell (`^4.1.12`, installed 4.1.12). Nothing new was downloaded.

Tests import `describe`, `it`, `expect` and `expectTypeOf` explicitly from `'vitest'` (no `globals: true`). Test files live next to the module they test and go through the same ESLint config (root `eslint.config.mjs`) and `tsc -p packages/utils` as the rest of the package.

## Scope

**Tested now:** every export of `packages/utils/src`, `packages/core/src`, `packages/infrastructure/src` and `packages/bff/src`, plus `ProfileMenu` and `TransactionItem` from the design system, 913 tests in 43 files.

| Package | Test files | Tests | Kind |
|---|---|---|---|
| `packages/utils` | 5 | 108 | Characterization (the `cn` typography tests became specification tests in step 1.4a, and `transactionPresentation.test.ts` is specification) |
| `packages/core` | 15 | 225 | Specification |
| `packages/infrastructure` | 10 | 172 | Specification (unit, CLI, integration and timeout against real servers) |
| `packages/bff` | 10 | 378 | Specification (handlers with real `Request` objects, and end to end) |
| `packages/design-system` | 2 | 13 | Specification (static rendering of `ProfileMenu` and `TransactionItem`) |
| `packages/store` | 1 | 17 | Specification (the RTK Query factory with a simulated `fetch`: endpoints and invalidation) |

`packages/core`:

| Module | Exports | Test file |
|---|---|---|
| `domain/errors/DomainError.ts` | `DomainError` | `DomainError.test.ts` |
| `domain/value-objects/Money.ts` | `Money` | `Money.test.ts` |
| `domain/value-objects/CalendarDate.ts` | `CalendarDate` | `CalendarDate.test.ts` |
| `domain/transaction/TransactionType.ts` | `TRANSACTION_TYPES`, `isTransactionType`, `transactionDirection` | `TransactionType.test.ts` |
| `domain/transaction/Transaction.ts` | `Transaction` | `Transaction.test.ts` |
| `domain/transaction/aggregations.ts` | `sortNewestFirst`, `groupByMonth`, `filterByPeriod`, `totalsByMonth`, `totalsByType` | `aggregations.test.ts` |
| `application/errors/ApplicationError.ts` | `ApplicationError` | `ApplicationError.test.ts` |
| `application/use-cases/*.ts` | `ListTransactions`, `CreateTransaction`, `UpdateTransaction`, `DeleteTransaction`, `GetBalance`, `GetStatement`, `GetChartData` | one test file per use case |
| `index.ts` | barrel for all of the above | `index.test.ts` (public API surface) |

Use cases run against `InMemoryTransactionRepository`, `FixedClock` and `SequentialIdGenerator` from `packages/core/src/testing`. The main `index.ts` does not export them. Other packages import them, with `aTransaction`, from the `@bytebank/core/testing` subpath (step 2.1). They cover isolation between users, future dates on create and update, ordering and tie-breaks, and positive, negative and zero balances. `GetBalance.test.ts` also reproduces the seven records of the seed (`apps/shell/data/db.seed.json`) and confirms the R$ 1.150,00 balance (115000 cents).

`packages/infrastructure` has four kinds of test:

- **Unit tests** simulate `fetch` with `vi.fn` and `vi.stubGlobal`. They check URLs, methods and error handling. On their own they only prove that the code matches what we believe about json-server. `migrateTransactions.test.ts` confirms the exact result on `migration/fixtures/legacy-db.json`, a frozen copy of the 7 legacy records: all of them migrate, and `GetBalance` gives 115000 cents. A separate test reads the seed, `apps/shell/data/db.seed.json`, and checks that every record migrates without errors. The database in use is not versioned, so no test reads it.
- **The timeout test** (`HttpTransactionRepository.timeout.test.ts`, 13 tests) uses real servers, because the behavior under test is what `fetch` does when an answer never comes: one server accepts the connection and never writes, one stops in the middle of the body, and one only stops on the write.
- **The integration test** (`HttpTransactionRepository.integration.test.ts`) guarantees that those beliefs still hold. It copies `integration-db.json` to a temporary folder, starts the installed json-server on a free port, runs the repository against it, and stops the server in `afterAll`, even if a test fails. It covers string user ids (`"1"` versus `"10"`), reading a transaction of another user, the id assigned by the server on `POST`, and blocked updates and deletes. If an upgrade changes those behaviors, this test fails. It runs with `npm test` and takes less than 1 s (11 tests). It validates the HTTP contract, not the mount in `docker-compose.yml`: it runs on a temporary folder, so it could not catch the failure described in `infrastructure.md`, step 2.3b.
- **The CLI test** (`migrate-db.cli.test.ts`) runs `scripts/migrate-db.mjs` as a real process on temporary files: success, a file with errors (nothing written, exit 1) and the protection of the input without `--in-place`. It takes about 3 s (14 tests). The script itself is not in the coverage table, which only measures `src/**/*.ts`.

`packages/bff`, all through real `Request` objects:

| Test file | Tests | Covers |
|---|---|---|
| `http/createTransactionHandlers.test.ts` | 37 | Each handler, 401 in every handler without reading the request or running a use case, and isolation between users (404, not 403) |
| `http/validation.test.ts` | 152 | Each validation rule, attachments, body limits, the path `id`, `period`, invalid JSON, domain rules (422) and the absence of echoes |
| `http/origin.test.ts` | 57 | Allowed and strange origins in the three writes, the `Referer` fallback, neither header, lookalike origins, reads without `Origin`, and the order against the session |
| `http/errors.test.ts` | 47 | Each translation, the logger, the 502 without details, and the headers of every status |
| `http/responses.test.ts` | 5 | JSON and 204 helpers |
| `composition/createUseCases.test.ts` | 3 | The composition of the use cases |
| `composition/createJsonServerUseCases.e2e.test.ts` | 23 | Handlers, use cases and adapters against the installed json-server |
| `env.test.ts` | 20 | Required variables and the parsing of `ALLOWED_ORIGINS` |
| `client/createTransactionsClient.test.ts` | 31 | URLs, methods and bodies with a simulated `fetch`, 401, errors, and that the client imports types only |
| `index.test.ts` | 3 | Public API surface and the `@bytebank/bff/limits` subpath |

The end-to-end test reuses the structure of the integration test: a temporary copy of `e2e-db.json`, a free port, and the server stopped in `afterAll`. It adds what only the whole chain shows: the id assigned by the server, the attachment removed from the stored record, an attachment at the 70 KB limit reaching json-server through POST and PATCH, corrupted records, the backend down (a port with no server) and a server that never answers giving 502 without details, and the error code and record id reaching the logger only. See `bff.md`.

`packages/utils`:

| Module | Exports | Test file |
|---|---|---|
| `cn.ts` | `cn` | `cn.test.ts` |
| `currency.ts` | `formatCents` | `currency.test.ts` |
| `transactionPresentation.ts` | `TRANSACTION_TYPE_LABELS`, `TRANSACTION_TYPE_OPTIONS`, `formatDateBR`, `formatMonthKey`, `formatSignedCents`, `groupDtosByMonth` | `transactionPresentation.test.ts` |
| `user.ts` | `getFirstName` | `user.test.ts` |
| `index.ts` | barrel for all of the above | `index.test.ts` (public API surface) |

**Left for later:** logic that lives inside components or hooks and cannot be imported on its own yet. It will be tested once the Block 1 refactor extracts it into the domain layer.

- `parseBRL` and the period filter (`3m` / `6m` / `tudo`), plus the per-month and per-type aggregation in `apps/dashboard/src/components/dashboard/CardCharts.tsx`.
- The search, type/month filters and pagination in `apps/transactions/src/app/page.tsx`.
- Form validation, category suggestion and the attachment size check in `CardNewTransaction.tsx`. Also the amount parsing in `ModalEditTransaction.tsx` (`.replace('R$ ', '')...`).
- `useCurrencyInput`, `useBalance` and `useToast` (React hooks, which need a component test environment).
- The other `packages/design-system` components, and any interaction test (clicks, keyboard, focus). `ProfileMenu.test.ts` renders to static HTML with `react-dom/server`, which works in the `node` environment. Interactions need a DOM environment, such as jsdom or happy-dom, which is not installed.

## Copies vs packages

Since step 1.4a the local copies are gone, and the apps import `@bytebank/utils`, so these tests cover the code that runs in the apps. Before the removal, the copies matched the packages except for the type import in `transactions.ts`. See `docs/fase4/modularization.md`.

## Questionable behaviors

Each item matches one test marked `// Characterization: current behavior, see docs/fase4/testing.md`, except items 1 to 3, which were fixed in step 1.4a.

### `cn` (`cn.test.ts`): fixed in step 1.4a

These three items are no longer current behavior. `tailwind-merge` did not know the design system `text-*` tokens and treated them as text colors. They are now registered in the `font-size` group with `extendTailwindMerge`, and the tests state the correct behavior, marked `// Fixed in step 1.4a: design system typography tokens are registered in tailwind-merge`.

1. ~~**"drops a custom typography token when a text color follows it".**~~ **Fixed in 1.4a.** `cn('text-body-semibold', 'text-inverse')` used to return `'text-inverse'`, so `Button`, `Select` and `Input` lost their typography. It now keeps both classes.
2. ~~**"drops a custom icon size token when a text color follows it".**~~ **Fixed in 1.4a.** `cn('text-icon-sm', 'text-success')` now keeps both classes.
3. ~~**"treats two custom typography tokens as conflicting and keeps the last one".**~~ **Fixed in 1.4a.** `cn('text-body', 'text-meta')` still returns `'text-meta'`, but now for the right reason: both are font sizes. As a consequence, `cn('text-heading', 'text-sm')` now returns `'text-sm'`.

The test file also checks every token against every color token in both orders, and compares its token list with `globals.css`.

### `formatCents` (`currency.test.ts`)

4. **"formats negative zero as "-0,00"".** `formatCents(-0)` returns `'-0,00'`. Negative zero can come out of arithmetic, for example `-1 * 0`.
5. **"rounds fractional cents half away from zero instead of rejecting them".** `formatCents(0.5)` returns `'0,01'` and `formatCents(150.5)` returns `'1,51'`. The function expects integer cents but silently rounds non-integers.
6. **"returns locale output for non-finite input instead of throwing".** `formatCents(NaN)` returns `'NaN'` and `formatCents(Infinity)` returns `'∞'`. Invalid input reaches the UI as text instead of failing.
7. **"loses precision near Number.MAX_SAFE_INTEGER because it divides by 100".** `formatCents(9007199254740991)` returns `'90.071.992.547.409,90'`, not `…,91`. Floating-point division loses the last cent at this size. This is far beyond realistic amounts, but it shows that money is handled as floating point.

### `transactions.ts`: removed in step 2.5b

Items 8 to 13 described `TRANSACTION_OPTIONS`, `capitalizeMonth` and `groupByMonth`, the helpers of the old format. No screen uses them anymore, so they left together with their tests.

### `getFirstName` (`user.test.ts`)

14. **"splits only on the space character, not on tabs or line breaks".** `getFirstName('Ana\tMaria')` returns `'Ana\tMaria'`. It splits on `' '` instead of on any whitespace.

## Coverage

`npm run test:coverage` (v8), `packages/*/src/**/*.ts`:

| File | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `bff/src/client/createTransactionsClient.ts` | 100% (34/34) | 100% (8/8) | 100% (14/14) | 100% (30/30) |
| `bff/src/env.ts` | 100% (17/17) | 100% (6/6) | 100% (6/6) | 100% (13/13) |
| `bff/src/index.ts` | 100% (0/0) | 100% (0/0) | 100% (0/0) | 100% (0/0) |
| `bff/src/composition/createJsonServerUseCases.ts` | 100% (1/1) | 100% (0/0) | 100% (1/1) | 100% (1/1) |
| `bff/src/composition/createUseCases.ts` | 100% (1/1) | 100% (0/0) | 100% (1/1) | 100% (1/1) |
| `bff/src/http/createTransactionHandlers.ts` | 100% (53/53) | 100% (16/16) | 100% (20/20) | 100% (46/46) |
| `bff/src/http/errors.ts` | 100% (23/23) | 100% (14/14) | 100% (8/8) | 100% (17/17) |
| `bff/src/http/limits.ts` | 100% (1/1) | 100% (0/0) | 100% (0/0) | 100% (1/1) |
| `bff/src/http/origin.ts` | 100% (7/7) | 100% (6/6) | 100% (2/2) | 100% (6/6) |
| `bff/src/http/responses.ts` | 100% (4/4) | 100% (1/1) | 100% (2/2) | 100% (4/4) |
| `bff/src/http/schemas.ts` | 100% (28/28) | 100% (2/2) | 100% (6/6) | 100% (28/28) |
| `bff/src/testing/handlerHarness.ts` | 100% (19/19) | 100% (8/8) | 100% (9/9) | 100% (18/18) |
| `core/src/index.ts` | 100% (0/0) | 100% (0/0) | 100% (0/0) | 100% (0/0) |
| `core/src/application/TransactionDTO.ts` | 100% (0/0) | 100% (0/0) | 100% (0/0) | 100% (0/0) |
| `core/src/application/errors/ApplicationError.ts` | 100% (3/3) | 100% (0/0) | 100% (1/1) | 100% (3/3) |
| `core/src/application/ports/Clock.ts` | 100% (0/0) | 100% (0/0) | 100% (0/0) | 100% (0/0) |
| `core/src/application/ports/IdGenerator.ts` | 100% (0/0) | 100% (0/0) | 100% (0/0) | 100% (0/0) |
| `core/src/application/ports/TransactionRepository.ts` | 100% (0/0) | 100% (0/0) | 100% (0/0) | 100% (0/0) |
| `core/src/application/use-cases/CreateTransaction.ts` | 100% (7/7) | 100% (0/0) | 100% (2/2) | 100% (7/7) |
| `core/src/application/use-cases/DeleteTransaction.ts` | 100% (5/5) | 100% (2/2) | 100% (2/2) | 100% (4/4) |
| `core/src/application/use-cases/GetBalance.ts` | 100% (5/5) | 100% (0/0) | 100% (3/3) | 100% (4/4) |
| `core/src/application/use-cases/GetChartData.ts` | 100% (7/7) | 100% (2/2) | 100% (3/3) | 100% (6/6) |
| `core/src/application/use-cases/GetStatement.ts` | 100% (5/5) | 100% (0/0) | 100% (4/4) | 100% (5/5) |
| `core/src/application/use-cases/ListTransactions.ts` | 100% (4/4) | 100% (0/0) | 100% (3/3) | 100% (3/3) |
| `core/src/application/use-cases/UpdateTransaction.ts` | 100% (20/20) | 100% (12/12) | 100% (3/3) | 100% (14/14) |
| `core/src/application/use-cases/assertDateNotInFuture.ts` | 100% (2/2) | 100% (2/2) | 100% (1/1) | 100% (2/2) |
| `core/src/domain/errors/DomainError.ts` | 100% (3/3) | 100% (0/0) | 100% (1/1) | 100% (3/3) |
| `core/src/domain/transaction/Transaction.ts` | 100% (25/25) | 100% (20/20) | 100% (13/13) | 100% (24/24) |
| `core/src/domain/transaction/TransactionType.ts` | 100% (4/4) | 100% (0/0) | 100% (2/2) | 100% (4/4) |
| `core/src/domain/transaction/aggregations.ts` | 100% (26/26) | 100% (12/12) | 100% (13/13) | 100% (19/19) |
| `core/src/domain/value-objects/CalendarDate.ts` | 100% (35/35) | 100% (26/26) | 100% (12/12) | 100% (32/32) |
| `core/src/domain/value-objects/Money.ts` | 100% (19/19) | 100% (8/8) | 100% (12/12) | 100% (17/17) |
| `core/src/testing/InMemoryTransactionRepository.ts` | 100% (12/12) | 100% (5/5) | 100% (7/7) | 100% (9/9) |
| `core/src/testing/fakes.ts` | 100% (6/6) | 100% (1/1) | 100% (4/4) | 100% (6/6) |
| `core/src/testing/index.ts` | 100% (0/0) | 100% (0/0) | 100% (0/0) | 100% (0/0) |
| `design-system/src/ProfileMenu.tsx` | 44% (11/25) | 60% (9/15) | 33.33% (2/6) | 52.63% (10/19) |
| `design-system/src/TransactionItem.tsx` | 40% (2/5) | 100% (13/13) | 25% (1/4) | 40% (2/5) |
| `design-system/src/index.ts` | 100% (0/0) | 100% (0/0) | 100% (0/0) | 100% (0/0) |
| `infrastructure/src/index.ts` | 100% (0/0) | 100% (0/0) | 100% (0/0) | 100% (0/0) |
| `infrastructure/src/clock/SaoPauloClock.ts` | 100% (6/6) | 100% (1/1) | 100% (4/4) | 100% (4/4) |
| `infrastructure/src/errors/InfrastructureError.ts` | 100% (5/5) | 100% (1/1) | 100% (1/1) | 100% (5/5) |
| `infrastructure/src/id/CryptoIdGenerator.ts` | 100% (1/1) | 100% (0/0) | 100% (1/1) | 100% (1/1) |
| `infrastructure/src/json-server/HttpTransactionRepository.ts` | 100% (48/48) | 100% (19/19) | 100% (14/14) | 100% (44/44) |
| `infrastructure/src/json-server/TransactionRecord.ts` | 100% (0/0) | 100% (0/0) | 100% (0/0) | 100% (0/0) |
| `infrastructure/src/json-server/transactionRecordMapper.ts` | 100% (14/14) | 100% (17/17) | 100% (5/5) | 100% (13/13) |
| `infrastructure/src/migration/legacyTransaction.ts` | 100% (6/6) | 100% (11/11) | 100% (1/1) | 100% (5/5) |
| `infrastructure/src/migration/migrateTransactions.ts` | 100% (35/35) | 100% (16/16) | 100% (7/7) | 100% (32/32) |
| `store/src/createTransactionsApi.ts` | 100% (19/19) | 100% (2/2) | 100% (15/15) | 100% (14/14) |
| `store/src/createTransactionsStore.ts` | 100% (2/2) | 100% (0/0) | 100% (2/2) | 100% (2/2) |
| `store/src/index.ts` | 100% (0/0) | 100% (0/0) | 100% (0/0) | 100% (0/0) |
| `utils/src/cn.ts` | 100% (2/2) | 100% (0/0) | 100% (1/1) | 100% (2/2) |
| `utils/src/currency.ts` | 100% (1/1) | 100% (0/0) | 100% (1/1) | 100% (1/1) |
| `utils/src/index.ts` | 100% (0/0) | 100% (0/0) | 100% (0/0) | 100% (0/0) |
| `utils/src/transactionPresentation.ts` | 100% (17/17) | 100% (4/4) | 100% (6/6) | 100% (15/15) |
| `utils/src/user.ts` | 100% (1/1) | 100% (0/0) | 100% (1/1) | 100% (1/1) |
| **Total** | **96.98% (546/563)** | **97.60% (244/250)** | **96.87% (217/224)** | **97.55% (478/490)** |

**This total does not cover the design-system components.** The pattern matches `.ts` only, so the `.tsx` files in `packages/design-system/src` are not measured, and they have no tests. The `0/0` rows are files with no executable code (barrels, ports and other type-only files), which v8 reports as 100%. The test helpers in `core/src/testing` and `bff/src/testing` are counted too, so they inflate the total slightly.

Line coverage is a weak signal for code this small: 100% only means every line ran. The value of these tests is in the asserted edge cases above. In the terminal, the `text` reporter hides files at 100%, so the per-file numbers come from `coverage/coverage-summary.json`.

Result: 43 test files, 913 tests, all passing, in about 6 s.

The route handlers and the `proxy.ts` of the zones have no unit tests: the apps have no test setup, and a matcher can only be proved on a running server. They are covered by the smoke tests recorded in `bff.md`, which found a real bug in their first run. The screens of the transactions zone were checked in a real browser in step 2.3, as recorded in `bff.md`.

## Known instabilities

Recorded in step 2.3b. Neither of these comes from an assertion about the code.

**Node 24.15 on Windows crashes the test workers.** About 1 in 4 runs of `npm test` on this machine ended with `Worker exited unexpectedly` and a few tests not reported (6 of 24 full runs). The worker dies with exit code `0xC0000409`. A minimal script outside Vitest, with a plain `fetch` followed by `process.exit`, crashes in almost every run with `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76`, with or without `AbortSignal`, so it is a bug in Node on Windows and not in this code. The same script had 0 crashes in 240 runs on Linux with Node 24.22. A red run with that message and no failed assertion can be run again.

**One failure on Linux with Node 20, cause unknown.** In a copy of the repository on `node:20-alpine`, two rounds failed because a record answered 404 right after being created (the integration test in one, and the end-to-end test in the other). Five rounds on `node:22-alpine` passed. A loop of 400 `POST` and `GET` on each version did not reproduce it, so the suspected race with the file watcher of json-server is not confirmed. CI moved to Node 22 in step 2.4a, because json-server 1.0.0-beta.15 does not support Node 20. Twenty rounds on `node:22-alpine` then passed with no failure. That points to Node 20, but it does not prove the cause: the failure was rare, and it was never reproduced on purpose.

## Config file extension

The root config is `vitest.config.mts`, not `.ts`. The root `package.json` has no `"type": "module"`, so a `.ts` config with ESM syntax made Vite print a notice ("uses ESM syntax in a file loaded as CommonJS", unsupported by the planned `configLoader: 'native'` default). The `.mts` extension marks the file as ESM explicitly. The file was renamed in step 0.6 without content changes, and the notice is gone.

The tests also run in CI on every push and pull request to `main`. See `docs/fase4/ci.md`.
