# Testing

This is the only page with test counts. The other docs link here.

## Summary

| Suite | Command | Result |
|---|---|---|
| Unit and integration tests of the packages | `npm test` | **97 files, 1492 tests passing, 22 skipped**, in about 10 s |
| Storybook: every story in a real browser, with interaction tests | `cd apps/shell && npx vitest run --project storybook` | **24 files, 77 stories (22 components), 15 interaction tests**, all passing |
| Contract suite against a real Supabase project | `SUPABASE_CONTRACT_TESTS=1 npx vitest run supabase.contract` | **19 tests**, all passing (off by default, out of the CI) |
| Browser regression of the session race | `npm run test:session-race` | **12 of 12 checks** in Docker (3 rounds) |
| Coverage of the packages | `npm run test:coverage` | **83.68% of statements**, per package [below](#coverage) |

The 22 skipped tests are the 19 of the Supabase suite, which run only with its variable, and 3 cases of the json-server contract suite that json-server cannot hold ([deploy.md](deploy.md#contract-tests)).

## Strategy

| Package | Kind | Question it answers | When a test fails |
|---|---|---|---|
| `utils` | **Characterization**, then specification for the new helpers | What does the code do today? | The behavior changed. Decide whether that was intended |
| `core` | **Specification** | What must the domain do? | The domain is wrong. Fix the code, not the test |
| `infrastructure` | **Specification** and **contract** | Do the adapters talk to the outside correctly, and do both backends obey the same rules? | The adapter is wrong |
| `bff` | **Specification** | Does the HTTP contract hold? | The contract broke |
| `store`, `design-system`, `auth` | **Specification** | Do the factory, the pure logic of the components and the session config behave? | The behavior is wrong |
| Storybook | **Component and interaction** | Does each component render its states, and do the interactive ones respond to mouse and keyboard? | The component is wrong |

**Characterization tests came first.** Before the refactor, the tests of `packages/utils` recorded what the code did, odd behavior included, so that any change in output during the refactor showed up as a failing test. A test that asserts behavior that looks like a bug is marked `// Characterization: current behavior, see docs/fase4/testing.md` and listed under [Questionable behaviors](#questionable-behaviors). An intended change updates the test and this page together.

**Specification tests** state the rules of new code: every invariant and `DomainError`, value object limits (`-0`, unsafe integers, leap years, timezone safety), immutability, the round trip of `toPrimitives`/`fromPrimitives`, every validation rule of the bff and every error translation.

**Contract suites** (`packages/infrastructure/src/contracts`) hold one set of cases per port: users, transactions, reset tokens, rate limits. The same cases run against json-server (in `npm test`) and against Supabase (on demand), so both backends obey the same rules.

## How to run

| Script | Command | Use |
|---|---|---|
| `npm test` | `vitest run` | The unit and integration tests, once |
| `npm run test:watch` | `vitest` | Re-run on changes |
| `npm run test:coverage` | `vitest run --coverage` | Once, with coverage (v8) |
| `npm run test:session-race` | `node apps/shell/scripts/session-race.mjs` | The browser regression of the session race, against a running app |

The root config is `vitest.config.mts`: project `unit`, environment `node`, `include: ['packages/**/src/**/*.test.ts']`, coverage with `@vitest/coverage-v8` on `packages/*/src/**`, written to `/coverage` (ignored by git and Docker). `server-only` is aliased to its empty module, as on the server ([security.md](security.md#server-only-entries)). Tests import `describe`, `it` and `expect` from `'vitest'` (no globals), live next to the module they test, and go through the same lint and `tsc` as the package. The extension is `.mts` because the root `package.json` has no `"type": "module"`.

The Storybook project is separate: `apps/shell/vitest.config.ts`, browser mode with Playwright.

## Unit and integration tests, per package

| Package | Files | Tests | Highlights |
|---|---|---|---|
| `utils` | 15 | 203 | `cn` against every token of the theme, presentation of amounts and dates, secrets rule, security headers, session policy, zone rewrites |
| `core` | 22 | 325 | Value objects, entities, aggregations, password policy, every use case against in-memory ports |
| `infrastructure` | 24 | 324 (+22 skipped) | Adapters with a simulated `fetch`, real json-server, real hanging servers, the migration CLI, the cipher, the hasher, both contract suites |
| `bff` | 20 | 479 | Every handler with real `Request` objects, validation, origin, errors, both browser clients, the composition, end to end against json-server |
| `design-system` | 11 | 109 | Static rendering, focus of the modals, lazy parts, icon font list, password strength, idle monitor, order of the session writes |
| `store` | 3 | 41 | The RTK Query factory with a simulated `fetch`, the RxJS search in virtual time, `useObservable` |
| `auth` | 2 | 11 | The session config shared with the shell, the props of the session provider of the zones |
| **Total** | **97** | **1492 (+22 skipped)** | |

### `core`

Use cases run against `InMemoryTransactionRepository`, `FixedClock`, `SequentialIdGenerator` and the other fakes of `packages/core/src/testing`, which the main entry does not export; other packages import them from `@bytebank/core/testing`. They cover isolation between users, future dates on create and update, ordering and tie-breaks, positive, negative and zero balances, and the password rules. `GetBalance.test.ts` reproduces the seven records of the seed and confirms the R$ 1.150,00 balance (115000 cents).

| Test file | Tests |
|---|---|
| `domain/value-objects/CalendarDate.test.ts` | 66 |
| `domain/transaction/Transaction.test.ts` | 35 |
| `domain/value-objects/Money.test.ts` | 28 |
| `domain/user/passwordPolicy.test.ts` | 25 |
| `domain/transaction/aggregations.test.ts` | 21 |
| `domain/transaction/TransactionType.test.ts` | 20 |
| `application/use-cases/PasswordReset.test.ts` | 17 |
| `application/use-cases/AuthenticateUser.test.ts` | 15 |
| `application/use-cases/AccountSettings.test.ts` | 14 |
| `application/use-cases/RegisterUser.test.ts` | 13 |
| `application/use-cases/GetChartData.test.ts`, `UpdateTransaction.test.ts` | 10 each |
| `domain/user/User.test.ts` | 9 |
| `application/use-cases/CreateTransaction.test.ts` | 8 |
| `domain/transaction/typeSuggestion.test.ts` | 7 |
| `application/use-cases/GetBalance.test.ts`, `index.test.ts` (public API) | 6 each |
| `DeleteTransaction`, `GetStatement`, `ListTransactions` | 4 each |
| `ApplicationError.test.ts`, `DomainError.test.ts` | 2 and 1 |

### `infrastructure`

| Test file | Tests | Kind |
|---|---|---|
| `migration/migrateTransactions.test.ts` | 57 | The exact result on `fixtures/legacy-db.json`, a frozen copy of the 7 legacy records, and every record of the seed |
| `json-server/HttpTransactionRepository.test.ts` | 37 | Simulated `fetch`: URLs, methods, error codes |
| `json-server/transactionRecordMapper.test.ts` | 26 | Shape checks and `CORRUPTED_RECORD` |
| `encryption/AesGcmCipher.test.ts`, `EncryptedAttachmentRepository.test.ts` | 21 and 15 | Format, owner binding, tampering, wrong key, unreadable attachments |
| `password/ScryptPasswordHasher.test.ts`, `StaticCommonPasswordList.test.ts` | 20 each | Format, parameters, refusal of costly parameters; the lists |
| `json-server/HttpUserRepository.test.ts` | 20 | Users over HTTP |
| `contracts/jsonServer.contract.test.ts` | 16 (+3 skipped) | The contract suite against a json-server started for the test, and the memory limiter |
| `contracts/supabase.contract.test.ts` | 19 skipped | The same suite against Supabase, only with `SUPABASE_CONTRACT_TESTS=1` |
| `migration/migrate-db.cli.test.ts` | 14 | The script as a real process: success, a file with errors (nothing written, exit 1), protection of the input without `--in-place` |
| `json-server/HttpTransactionRepository.timeout.test.ts` | 13 | Real servers that accept and never write, stop in the middle of the body, or stop only on the write |
| `rate-limit/InMemoryRateLimiter.test.ts` | 13 | Sliding window, refused attempts, give-back |
| `json-server/HttpTransactionRepository.integration.test.ts` | 11 | The installed json-server on a temporary copy: string user ids (`"1"` versus `"10"`), another user's record, the id assigned on `POST`, blocked updates and deletes |
| `json-server/HttpPasswordResetTokenRepository.test.ts` | 9 | Reset tokens over HTTP |
| `clock/SaoPauloClock.test.ts` | 8 | The day in São Paulo at any instant |
| `supabase/rateLimitKey.test.ts` | 6 | Same input gives the same key, another secret gives other keys, two namespaces give two keys, the key shows nothing of the email and is not its plain SHA-256 |
| `email/SmtpEmailSender.test.ts`, `DisabledEmailSender.test.ts` | 5 and 2 | Sending, and the disabled sender's log line |
| `errors/InfrastructureError.test.ts`, `password/CryptoResetTokenGenerator.test.ts` | 3 each | |
| `id/CryptoIdGenerator.test.ts`, `password/hash-password.cli.test.ts` | 2 each | The script's output is accepted by the hasher |
| `index.test.ts` | 1 | Public API surface |

The integration test validates the HTTP contract of json-server, not the mount of `docker-compose.yml`: it runs on a temporary folder, so it could not catch the [bind mount failure](infrastructure.md#where-the-database-lives). Anything about Docker is verified on the real compose file.

### `bff`

All through real `Request` objects, with the in-memory ports of the core.

| Test file | Tests | Covers |
|---|---|---|
| `http/validation.test.ts` | 152 | Each validation rule, attachments, body limits, the path `id`, `period`, invalid JSON, domain rules (422) and the absence of echoes |
| `http/origin.test.ts` | 57 | Allowed and strange origins in the three writes, the `Referer` fallback, neither header, lookalike origins, and the order against the session |
| `http/errors.test.ts` | 55 | Each translation, the logger, the 502 without details, and the headers of every status |
| `http/createTransactionHandlers.test.ts` | 37 | Each handler, 401 without reading the request or running a use case, isolation between users (404, not 403) |
| `composition/createJsonServerUseCases.e2e.test.ts` | 31 | Handlers, use cases and adapters against the installed json-server: the id assigned by the server, an attachment at the 70 KB limit through POST and PATCH, corrupted records, the backend down and a server that never answers giving 502 without details |
| `client/createTransactionsClient.test.ts` | 28 | URLs, methods and bodies with a simulated `fetch`, 401 and errors |
| `env.test.ts` | 20 | Required variables and the parsing of `ALLOWED_ORIGINS` |
| `http/createAccountHandlers.test.ts`, `createRegisterHandler.test.ts` | 16 each | Profile and password routes; registration |
| `http/createPasswordResetHandlers.test.ts` | 12 | Request and confirm |
| `client/createShellClient.test.ts` | 11 | The routes of the shell: bodies, code and status of a refusal, `UNKNOWN_ERROR`, no redirect |
| `composition/dataAdapters.test.ts` | 11 | `DATA_BACKEND`, the messages of missing variables, the HMAC key from `NEXTAUTH_SECRET` |
| `client/index.test.ts` | 8 | Both clients through `@bytebank/bff/client`, with imports of types or of their own folder only, and no `server-only` |
| `responses.test.ts`, `clientIp.test.ts`, `client/http.test.ts` | 5, 4, 4 | Helpers |
| `createUseCases`, `emailDisabled`, `loginRateLimit`, `index` (public API) | 3 each | Composition |

The package was also checked by **mutation**: one deliberate change at a time (removing a check, comparing origins by prefix, letting a `DomainError` escape the mapper, keeping a parse error as the cause, leaking the code in a 502), confirming that a test fails. 53 of 53 changes were caught, plus 15 of 15 in the timeout and environment code.

### `utils`, `design-system`, `store`, `auth`

| Package | Test files (tests) |
|---|---|
| `utils` | `cn` (50), `transactionPresentation` (42), `secrets` (17), `filterTransactions` (17), `loginRetry` (15), `currency` (12), `sessionPolicy` (11), `securityHeaders` (9), `user` (7), `chartTypeFilter` (6), `preload` (6), `zoneRewrites` (5), `browserClock` (4), `authLogger` (1), `index` (1) |
| `design-system` | `passwordEntropy` (23), `idleMonitor` (19), `passwordStrength` (17), `TransactionItem` (11), `modalFocus` (9), `PasswordInput` (8), `ProfileMenu` (6), `lazy` (6), `sessionWrites` (5), `iconFont` (3), `MountOnceOpen` (2) |
| `store` | `createTransactionsApi` (21): endpoints and invalidation; `createStatementSearch` (13): marble tests; `useObservable` (7) |
| `auth` | `sessionConfig` (9): secret, policy, shape of the token, refresh of the name; `zoneSessionProps` (2) |

The `cn` tests compare the token list with `packages/design-system/src/styles/theme.css`, and check every typography token against every color token in both orders. The design system tests render to static HTML with `react-dom/server`, because the unit environment has no DOM; interactions are covered by Storybook.

## Questionable behaviors

Each item matches one test marked `// Characterization: current behavior, see docs/fase4/testing.md`. The numbering is the original one.

**`cn` (`cn.test.ts`), items 1 to 3: fixed.** `tailwind-merge` did not know the typography tokens of the design system and treated them as text colors. They are now in the `font-size` group, and the tests state the correct behavior:

1. `cn('text-body-semibold', 'text-inverse')` used to return `'text-inverse'`, so `Button`, `Select` and `Input` lost their typography. It keeps both classes now.
2. `cn('text-icon-sm', 'text-success')` keeps both classes now.
3. `cn('text-body', 'text-meta')` still returns `'text-meta'`, now for the right reason: both are font sizes. As a consequence, `cn('text-heading', 'text-sm')` returns `'text-sm'`.

**`formatCents` (`currency.test.ts`), still current.** The domain uses integer cents ([ADR 0001](../adr/0001-money-in-integer-cents.md)), so none of these inputs reaches it from the app:

4. `formatCents(-0)` returns `'-0,00'`. Negative zero can come out of arithmetic, for example `-1 * 0`.
5. `formatCents(0.5)` returns `'0,01'` and `formatCents(150.5)` returns `'1,51'`: non-integers are rounded half away from zero instead of rejected.
6. `formatCents(NaN)` returns `'NaN'` and `formatCents(Infinity)` returns `'∞'`: invalid input reaches the UI as text.
7. `formatCents(9007199254740991)` returns `'90.071.992.547.409,90'`, not `…,91`: dividing by 100 in floating point loses the last cent at this size.

**Items 8 to 13: removed.** They described `TRANSACTION_OPTIONS`, `capitalizeMonth` and `groupByMonth`, helpers of the old record format. No screen used them after the move to the BFF, so they left with their tests.

**`getFirstName` (`user.test.ts`), still current:**

14. `getFirstName('Ana\tMaria')` returns `'Ana\tMaria'`: it splits on `' '`, not on any whitespace.

## Coverage

`npm run test:coverage` (v8), over `packages/*/src`:

| Package | Files | Statements | Branches | Functions | Lines |
|---|---|---|---|---|---|
| `core` | 52 | 99.51% (408/410) | 98.47% (193/196) | 99.37% (158/159) | 99.43% (347/349) |
| `utils` | 16 | 97.96% (96/98) | 91.67% (66/72) | 95.45% (42/44) | 98.86% (87/88) |
| `bff` | 25 | 95.30% (304/319) | 95.88% (93/97) | 91.45% (107/117) | 94.72% (269/284) |
| `store` | 5 | 90.38% (47/52) | 100% (6/6) | 86.11% (31/36) | 95.00% (38/40) |
| `infrastructure` | 31 | 78.30% (487/622) | 60.98% (161/264) | 75.96% (139/183) | 81.72% (438/536) |
| `design-system` | 26 | 61.71% (216/350) | 69.95% (149/213) | 56.00% (56/100) | 63.86% (182/285) |
| `auth` | 6 | 54.84% (17/31) | 61.11% (11/18) | 57.14% (4/7) | 55.17% (16/29) |
| **Total** | **161** | **83.68% (1575/1882)** | **78.40% (679/866)** | **83.12% (537/646)** | **85.47% (1377/1611)** |

How to read it:

- **`infrastructure`** is lower because the Supabase adapters run only in the contract suite against a real project, which `npm test` skips.
- **`design-system` and `auth`** hold React components and Next.js glue. Their logic is extracted into pure files that are tested (idle monitor, session writes, entropy, focus); the components are covered by Storybook and the glue by the browser checks.
- Files with no executable code (barrels, ports, types) count as 100%, and the fakes of `core/src/testing` and `bff/src/testing` are counted too.
- Line coverage only says that a line ran. The value is in the asserted edge cases and in the mutation check of the bff.

## Storybook

Every component of the design system has a story, in `apps/shell/src/components/ui/`, with its main states, using props and decorators only: no real data and no request. The Storybook tests render every story in a real browser and run the `play` function of those that have one.

| | Before the final step | Now |
|---|---|---|
| Components of the design system with a story | 13 | 22 |
| Stories (each one is a test) | 57 | 77 |
| Interaction tests (`play`) | 3 | 15 |

| Story | What the interaction test proves |
|---|---|
| `PasswordInput / Toggle` | The button shows and hides the password, with `aria-pressed` |
| `MenuDrawer / OpenAndCloseWithEscape` | Opens, takes the focus, marks the current page, closes with Escape and gives the focus back |
| `MenuSidebar`, `MenuTabs` (2 each) | The item of the current page is highlighted, and only it |
| `ModalTransactionDetail / EscapeGivesTheFocusBack` | Escape closes the modal and the focus goes back to the button that opened it |
| `ModalEditTransaction` (3) | Saving calls `onSave` with the form and closes; a failed save keeps the modal open with the message; Escape gives the focus back |
| `IdleSessionGuard / WarningAndContinue` | The warning comes with the countdown and the focus on its button; "Continuar conectado" closes it and renews the session |
| `ChunkBoundary / FailedAndRetry` | A part that failed shows the alert, the rest of the page stays, and "Tentar novamente" calls the retry |
| `Header / MobileMenuOpen`, `Select / Open` | Open the menu and the list |
| `TransactionActions / List` | Every item of the list gets the three actions |

How the stories avoid the network:

- `storySession.tsx` gives the components that read the session a made-up one, through `SessionProvider` with no refetch.
- `IdleSessionGuard` takes an optional `services` prop (policy, renewal, expiry). The story gives a policy with the warning after 2 s and spies for the renewal and the expiry, so it never logs out or navigates.
- The tests check that a modal is in the document, not `toBeVisible`: the daisyUI modal fades in from opacity 0.

**Running them.** `cd apps/shell && npx vitest run --project storybook`. They need the Chromium of Playwright (`npx playwright install chromium`). On a machine without it, they run on the installed Chrome with a copy of `vitest.config.ts` whose provider is `playwright({ launchOptions: { channel: 'chrome' } })`, which is how the numbers above were produced.

**Known limit: the lazy modals do not load in Storybook.** `lazyModal` and `lazyPart` use `next/dynamic`, and under the Vite builder of Storybook the component never arrives: React gets `undefined` and the boundary shows "Não foi possível carregar esta parte". Called from a story, `next/dynamic` works, with an inline component and with a component of the package; called from `lazy.tsx`, the same chunk fails. A loader in the shape `{ default }` and an inline arrow did not change it, and there is a single copy of `next`. The cause was not found, and the production code was left as it is: the app loads these modals in both zones. So `TransactionActions` has a story of its list only, and opening, saving and deleting are checked in the browser, in Docker, in both zones.

## Browser regression: the session race

`apps/shell/scripts/session-race.mjs` proves the fix of [the session race](security.md#the-session-race) in a real browser. It is not part of `npm test`, because it needs a running app and Chrome. What `npm test` covers instead:

- `packages/design-system/src/session/sessionWrites.test.ts`: a read in flight is waited for before the sign-out, a sign-out undone by a late read is done again, at most twice, and a failed read blocks nothing. A fake cookie and a fake server that answers when told play the slow network.
- `packages/auth/src/zoneSessionProps.test.ts`: the provider of the zones starts with the session of the server and does not read it on focus.

The script logs in, then holds every `GET` of the session for 3 s after the server answered, so the real answer arrives late. It starts reads the way a page does (load, `visibilitychange`, `focus`), then saves the name and logs out. It checks that the header and the session keep the new name, and that after the logout no session is left and `/dashboard` goes back to the login. It runs 3 rounds by default (`ROUNDS` changes it), puts the original name back, prints statuses and names only, never a password or a cookie, and uses the installed Chrome.

```sh
# Local, with Docker up and the demonstration user of the README
E2E_EMAIL=julia@bytebank.com E2E_PASSWORD=bytebank123 npm run test:session-race

# Production, through the shell (finish with npm run db:reset:supabase)
SHELL_URL=https://bytebank-shell.vercel.app E2E_EMAIL=... E2E_PASSWORD=... npm run test:session-race
```

| Where | Before the fix | After the fix |
|---|---|---|
| Production | 8 of 8 checks failed (2 rounds) | 2026-11-14: 6 of 12 passed (3 rounds). The name passed 6 of 6; the logout failed 6 of 6: after the sign-out the session was still there and `/dashboard` opened |
| Docker, local | not run | 12 of 12 passed (3 rounds) |

## What has no automated test

- **The route files and the `proxy.ts` of the apps.** A matcher can only be proved on a running server. They are covered by the smoke tests in [bff.md](bff.md#smoke-tests), whose first run found a real bug.
- **The screens.** They are checked in a real browser in Docker after each change: create with an attachment, remove the attachment, detail, edit and delete in both zones, search, login block, and no CSP violation.

## Known instabilities

Neither comes from an assertion about the code.

- **Node 24 on Windows crashes test workers.** About 1 in 4 runs of `npm test` on the development machine ended with `Worker exited unexpectedly` and a few tests not reported (6 of 24 full runs). The worker dies with exit code `0xC0000409`. A minimal script outside Vitest, with a plain `fetch` followed by `process.exit`, crashes almost every run with `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76`, so it is a bug of Node on Windows. The same script had 0 crashes in 240 runs on Linux with Node 24.22. A red run with that message and no failed assertion can be run again; the counts on this page come from clean runs.
- **One failure on Linux with Node 20, cause unknown.** In a copy of the repository on `node:20-alpine`, two rounds failed because a record answered 404 right after being created. Five rounds on `node:22-alpine` passed, and a loop of 400 `POST` and `GET` on each version did not reproduce it. CI uses Node 22 (json-server 1.0.0-beta.15 does not support 20), and twenty rounds on `node:22-alpine` passed. That points to Node 20 without proving the cause.

The tests also run in CI on every push and pull request to `main` ([ci.md](ci.md)).
