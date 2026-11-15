# Testing

This is the only page with test counts. The other docs link here.

| Suite | Command | Result |
|---|---|---|
| Unit, integration and contract tests of the packages | `npm test` | 104 files, 1557 passing, 26 skipped |
| Storybook stories in a real browser | `cd apps/shell && npx vitest run --project storybook` | 78 stories of 22 components, 16 with interaction tests, all passing |
| Contract suite against a real Supabase project | `SUPABASE_CONTRACT_TESTS=1 npx vitest run supabase.contract` | 23 passing, with migration 0002 applied |
| Session race in a real browser | `npm run test:session-race` | 12 of 12 checks in production and in Docker |
| What each logout ends, in a real browser | `npm run test:logout-scope` | 7 of 7 checks in Docker |
| Coverage | `npm run test:coverage` | 84% of statements ([below](#coverage)) |

The 26 skipped tests are the 23 of the Supabase suite, which need its variable, and 3 cases that json-server cannot hold ([deploy.md](deploy.md#contract-tests)). CI runs `npm test` on every push ([ci.md](ci.md)).

## Strategy

The tests of `packages/utils` started as characterization tests: before the refactor they recorded what the code did, odd behavior included, so any change in output during the refactor showed up as a failure. A test that pins behavior that looks like a bug carries the comment `// Characterization: current behavior, see docs/fase4/testing.md` and is listed under [Questionable behaviors](#questionable-behaviors).

Everything else is specification. `core` tests every invariant, value object limit and use case against in-memory ports. `infrastructure` tests each adapter with a simulated `fetch` and against real servers. `bff` calls every handler with real `Request` objects. `store`, `design-system` and `auth` test the RTK Query factory, the logic extracted from components, and the session config.

The contract suites in `packages/infrastructure/src/contracts` hold one set of cases per port (users, the end of the sessions, transactions, reset tokens, rate limits). The same cases run against json-server in `npm test` and against Supabase on demand, so both databases obey the same rules.

The root config is `vitest.config.mts`: environment `node`, files `packages/**/src/**/*.test.ts`, coverage with `@vitest/coverage-v8`, and `server-only` mapped to its empty module. The Storybook project has its own config in `apps/shell/vitest.config.ts`.

| Script | Use |
|---|---|
| `npm test` | Every unit, integration and contract test, once |
| `npm run test:watch` | The same, again on each change |
| `npm run test:coverage` | Once, with coverage |
| `npm run test:session-race` | The session race against a running app |
| `npm run test:logout-scope` | What each logout ends, against a running app with short idle times |

## Unit and integration tests

| Package | Files | Tests | What they cover |
|---|---|---|---|
| `utils` | 15 | 208 | `cn` against every token of the theme, presentation of amounts and dates, secrets rule, security headers, session policy, zone rewrites |
| `core` | 23 | 340 | Value objects, entities, aggregations, password policy, revocation of sessions, every use case |
| `infrastructure` | 25 | 334 (+26 skipped) | Adapters with a simulated `fetch`, json-server and servers that never answer, the migration script, cipher, hasher, both contract suites |
| `bff` | 23 | 496 | Every handler, validation, origin check, error translation, both browser clients, composition, end to end against json-server |
| `design-system` | 11 | 112 | Static rendering, modal focus, lazy parts, icon font list, password strength, idle monitor, the order of session reads and writes |
| `store` | 3 | 41 | The RTK Query factory, the RxJS search with marble tests, `useObservable` |
| `auth` | 4 | 26 | Session config, revocation in the `jwt` callback, router fetches that do not renew the session |

A few tests deserve a note. `GetBalance.test.ts` reproduces the seed and checks the R$ 1.150,00 balance. `migrateTransactions.test.ts` checks the exact migration of the 7 legacy records. `HttpTransactionRepository.integration.test.ts` runs the repository against the installed json-server, so a change of json-server behavior fails it ([infrastructure.md](infrastructure.md#json-server)). `createJsonServerUseCases.e2e.test.ts` sends an attachment at the 70 KB limit through POST and PATCH to a real json-server. The bff was also checked by mutation: each of 53 deliberate bugs, such as comparing origins by prefix or leaking an error code, made a test fail.

The unit tests have no DOM, so the design system tests render to static HTML with `react-dom/server`, and interactions are covered by Storybook.

## Questionable behaviors

Each item matches a test marked `// Characterization: current behavior, see docs/fase4/testing.md`. The numbers are the original ones.

Items 1 to 3, in `cn.test.ts`, are fixed. `tailwind-merge` did not know the typography tokens of the design system and treated them as colors. Now `cn('text-body-semibold', 'text-inverse')` keeps both classes (1), so does `cn('text-icon-sm', 'text-success')` (2), and `cn('text-body', 'text-meta')` keeps only `text-meta` because both are font sizes (3).

Items 4 to 7, in `currency.test.ts`, are current. The domain uses integer cents ([ADR 0001](../adr/0001-money-in-integer-cents.md)), so the app never passes these inputs:

4. `formatCents(-0)` returns `'-0,00'`.
5. `formatCents(0.5)` returns `'0,01'`: non-integers are rounded instead of refused.
6. `formatCents(NaN)` returns `'NaN'` and `formatCents(Infinity)` returns `'∞'`.
7. `formatCents(9007199254740991)` returns `'90.071.992.547.409,90'`, losing the last cent in floating point.

Items 8 to 13 described helpers of the old record format and were removed with them.

Item 14, in `user.test.ts`, is current: `getFirstName('Ana\tMaria')` returns `'Ana\tMaria'`, because it splits on spaces only.

## Coverage

| Package | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `core` | 99.5% | 98.1% | 99.4% | 99.5% |
| `utils` | 98.0% | 91.7% | 95.5% | 98.9% |
| `bff` | 95.0% | 96.1% | 91.1% | 94.4% |
| `store` | 90.4% | 100% | 86.1% | 95.0% |
| `infrastructure` | 79.2% | 60.7% | 76.8% | 82.5% |
| `auth` | 69.7% | 84.4% | 66.7% | 67.3% |
| `design-system` | 61.5% | 70.0% | 56.3% | 63.2% |
| **Total** | **84.0%** | **79.1%** | **83.2%** | **85.6%** |

`infrastructure` is lower because the Supabase adapters run only in the contract suite against a real project. `design-system` and `auth` hold React components and Next.js glue; their logic is extracted into tested files, and the components are covered by Storybook.

## Storybook

Every component of the design system has a story in `apps/shell/src/components/ui/`, with its main states, built from props and decorators only. The Storybook tests render every story in a real browser and run the `play` function of the interactive ones.

| Story | What the interaction test proves |
|---|---|
| `PasswordInput / Toggle` | The button shows and hides the password, with `aria-pressed` |
| `MenuDrawer / OpenAndCloseWithEscape` | It opens, takes the focus, marks the current page, closes with Escape and gives the focus back |
| `MenuSidebar`, `MenuTabs` | Only the item of the current page is highlighted |
| `ModalTransactionDetail / EscapeGivesTheFocusBack` | Escape closes it and the focus returns to the button |
| `ModalEditTransaction` | Saving calls `onSave` and closes, a failed save keeps the modal with the message, Escape gives the focus back |
| `IdleSessionGuard / WarningAndContinue` | The warning shows the countdown, and "Continuar conectado" closes it and renews the session |
| `ChunkBoundary / FailedAndRetry` | A failed part shows the alert and "Tentar novamente" retries |
| `Header / MobileMenuOpen`, `Select / Open` | The menu and the list open |
| `TransactionActions / List` | Every item gets the three actions |
| `Toast / ClosesByButtonAndEscape` | The message is in the alert region, and the × button and Escape both close the toast |

`storySession.tsx` gives the components that read the session a made-up one, and `IdleSessionGuard` takes its services by prop, so no story touches the network or logs out.

The tests need the Chromium of Playwright (`npx playwright install chromium`). On a machine without it, copy `vitest.config.ts` with the provider set to `playwright({ launchOptions: { channel: 'chrome' } })` to use the installed Chrome.

The lazy modals do not load in Storybook. Under the Vite builder of Storybook, `lazyModal` and `lazyPart` never receive the component and show "Não foi possível carregar esta parte". The cause was not found, and the app loads them normally. So the story of `TransactionActions` covers its list only, and opening, saving and deleting are checked in the browser.

## Browser regression: the session race

`apps/shell/scripts/session-race.mjs` proves the fix of [the session race](security.md#the-session-race). It holds every session read in the browser for a few seconds after the server answered, then saves the name and logs out, and checks that the new name stays and that no session is left. It restores the original name and prints no password or cookie.

```sh
E2E_EMAIL=julia@bytebank.com E2E_PASSWORD=bytebank123 npm run test:session-race
SHELL_URL=https://bytebank-shell.vercel.app E2E_EMAIL=... E2E_PASSWORD=... npm run test:session-race
```

| Where | Before the fix | After |
|---|---|---|
| Production | 6 of 12 checks passed: the logout failed | 12 of 12 |
| Docker | 12 of 12 | 12 of 12 |

Docker never failed because its answers are fast enough that nothing is in flight at the logout. After a production run, `npm run db:reset:supabase` brings back the demonstration data.

`sessionWrites.test.ts` and `zoneSessionProps.test.ts` cover the same logic without a browser, and `sessionRevocation.test.ts` and `rscSessionCookies.test.ts` in `packages/auth` cover the revocation and the router fetches.

## Browser regression: what each logout ends

`apps/shell/scripts/logout-scope.mjs` checks that the inactivity logout ends only its own browser and that "Sair" ends the sessions of every browser ([security.md](security.md#ending-every-session)). It needs the app running with short idle times, and refuses to run with an idle timeout above 2 minutes:

```powershell
$env:IDLE_TIMEOUT_SECONDS = 20; $env:IDLE_WARNING_SECONDS = 10
docker compose up -d --no-deps --force-recreate shell dashboard transactions
$env:E2E_EMAIL = 'julia@bytebank.com'; $env:E2E_PASSWORD = 'bytebank123'; npm run test:logout-scope
```

It logs in two browsers, keeps one active and lets the other time out, then logs in a third and clicks "Sair" in the active one. The idle browser loses its session while the active one keeps it, and "Sair" ends both remaining sessions. Production uses the default 10-minute idle time, so this test runs locally.

## What has no automated test

The route files and the `proxy.ts` of the apps are checked by the smoke tests in [bff.md](bff.md#smoke-tests). The screens are checked in a real browser in Docker after each change: creating with an attachment, removing an attachment, detail, edit and delete in both zones, search, the login block, and no CSP violation.

## Known instabilities

json-server used to undo a `PATCH` under load. Its file watcher re-read `db.json` after each write and replaced the data in memory, and on a busy CI runner that read could finish after the next request, so a name changed right before a password came back. json-server now runs without its watcher (`NODE_ENV=production`) in the test harnesses, in the Docker image and in `npm run api`. In that mode it serves `./public`, so each one runs from a folder that has one, and it no longer sees `db.json` change: a reset needs a restart ([infrastructure.md](infrastructure.md#resetting-the-data)). The Supabase adapter never had this problem, since each update sends one column.

Node 24 on Windows sometimes crashes a test worker with `Worker exited unexpectedly` and exit code `0xC0000409`, from a bug of Node on Windows. A run with that message and no failed assertion can be run again. CI runs on Linux with Node 22.

On a CPU too busy to run all files in parallel, a scrypt test can pass its 5-second timeout, since each hash takes a whole core for a moment.
