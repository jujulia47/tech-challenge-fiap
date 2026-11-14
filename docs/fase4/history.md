# Phase 4: history

The timeline of the work, by block. Each line says what was done, and what was found and fixed. The docs of each subject describe the final state; this page only keeps the order of events and the problems that no longer exist.

## Block 0: diagnosis and tooling (2026-10-29)

- **Baseline.** Lint, build, bundle size, TypeScript of the packages and Lighthouse were measured before any change: [baseline.md](baseline.md). Lint failed (the design system had no ESLint 9 config), the zones had never been linted, `packages/utils` did not compile (an `@/` import that resolved into the shell), and 9 `@/` imports in 8 package files tied the packages to an app. No app imported `@bytebank/*`: they all ran local copies.
- **Lint of the zones.** ESLint was turned on in dashboard and transactions, with the base config of the shell. First result: 100 files, 1 error (`react-hooks/set-state-in-effect` in the transactions page, a `useEffect` that reset the page and the search when a filter changed), 3 warnings (`@next/next/no-img-element` on the attachment previews, which are base64 data URLs that `next/image` does not optimize) and 2 existing suppressions (the same `set-state-in-effect` in the two identical copies of `ModalEditTransaction`). The error was fixed by moving the reset into the `onChange` handlers, with a guard so that choosing the option already selected resets nothing, as before; the warnings got a justified suppression; the suppression of the edit modal was kept as debt and moved with the modal to the design system. Final: 0 errors, 0 warnings.
- **Dependency audit.** `npm audit` found 24 vulnerable packages (9 critical, 11 high, 2 moderate, 2 low), 8 of them in production dependencies (3 critical, 4 high, 1 moderate). Next.js 16.2.4 → 16.4.3 and next-auth beta.31 → beta.32 fixed every production finding, and the Storybook and Vitest families were raised within their majors for the rest: 0 and 0 afterwards. Details and the decisions in [ci.md](ci.md#dependency-audit).
  - The shell proxy checked `!!req.auth`, the pattern of GHSA-8fpg-xm3f-6cx3 (an auth object filled with an error fails open). It now requires `req.auth?.user`.
  - `storybook build` failed with `SB_CORE-SERVER_0002` after the incremental updates, because `storybook` was hoisted to the root and its framework was nested in the shell. Fixed by removing only those entries from the lockfile and installing again.
  - `eslint-config-next` 16.4.3 brought `no-location-assign-relative-destination`, which flagged the four cross-zone navigations. An absolute URL hid them from the rule without the rule allowing them, so it was reverted, and each line got a justified suppression instead.
  - The release notes of 16.3 and 16.4 were read for what could touch multi-zones (strict route matching, proxy matchers under Turbopack, basePath in redirects); the smoke test of login, zones and logout passed.
- **Unit tests.** Vitest at the root, with characterization tests of `packages/utils`: they pinned the current behavior, odd cases included, before the refactor ([testing.md](testing.md#questionable-behaviors)).
- **CI.** GitHub Actions with lint, tests, build and two audits, and Dependabot with family groups ([ci.md](ci.md)). A Dependabot PR that moved `@vitest/coverage-v8` alone to 5.x broke `npm ci`, which is why the families are grouped. The Vitest config became `vitest.config.mts`, because a `.ts` file with ESM syntax made Vite print a CommonJS notice.

## Block 1: domain, infrastructure and shared packages (2026-10-30)

- **Domain.** `@bytebank/core` with `Money`, `CalendarDate`, `Transaction`, the type codes and the direction of each type, then the use cases and their ports ([domain.md](domain.md), ADRs 0001 to 0004). There was no direction rule before: the balance on the screen was a fixed `R$ 2.500,00`, and the charts added withdrawals as if they were income. The calculated balance of the seed is R$ 1.150,00.
- **Infrastructure.** `@bytebank/infrastructure` with the json-server repository, the São Paulo clock, the id generator and the migration of the old records ([infrastructure.md](infrastructure.md), ADRs 0005 and 0006). Reading json-server 1.0.0-beta.15 showed that `?userId=1` never matches a string id and that `POST` replaces the id; the repository uses `_where` and returns the stored transaction.
- **Shared packages.** The apps started importing `@bytebank/utils` and `@bytebank/design-system`, and 13 utility copies and 27 component copies were deleted. Found on the way:
  - `cn` dropped the typography tokens of the design system when a text color followed, in its four copies, so `Button`, `Select`, `Input` and `Toast` had lost their typography. Fixed once, with `extendTailwindMerge`.
  - Tailwind did not scan the package, so the components rendered without their classes while the build passed. Fixed with `@source` ([modularization.md](modularization.md#tailwind-source)).
  - In the transactions zone, "Minha conta" and "Configurações" pointed to routes that do not exist there (`/transactions/account`). Fixed with the `crossZone` items of `ProfileMenu`.
  - The two `Toast` copies differed in `aria-live` (`assertive` in the dashboard); the package version, `polite`, was kept.

## Block 2: BFF and state (2026-10-30)

- **BFF.** `@bytebank/bff`, with handlers on `Request` and `Response`, Zod at the boundary and the origin check ([bff.md](bff.md), ADRs 0007 to 0009).
  - The form accepted attachments of up to 100 KB, but json-server refuses any body above 102400 bytes, so a file between about 76 and 100 KB passed the validation and failed with a 500. The limit became 70 KB (ADR 0009).
  - The coverage reached 100% of the package, and mutation testing caught 53 of 53 deliberate changes, plus 15 of 15 in the timeout and environment code.
- **Wiring in the zones.** Route files, `proxy.ts` per zone and the server module. The first smoke test showed that the matcher of a zone missed its root: Next prefixes the matcher with the basePath, so `/dashboard` answered 200 with no session. Fixed with an explicit `'/'`. 47 smoke checks with no session and 21 with a session then passed, in dev and in Docker.
- **Records migrated.** The 7 records of `db.json` moved to the new format, with 0 errors; the result is frozen in a fixture and tested.
- **json-server version.** Docker ran json-server 0.17.4 (the `latest` tag) while the repository and the tests used 1.0.0-beta.15. In 0.17.4, any DELETE removed every transaction whose `userId` pointed to a missing user, and `_where` was ignored. The version was pinned in the three places ([infrastructure.md](infrastructure.md#the-version-is-pinned)).
- **Edit and delete answered 502 in Docker.** The compose file mounted one file, and json-server saves with an atomic rename, which the kernel refuses over a mount point. The change stayed in memory and never reached the disk; with 0.17.4 the same failure had been silent. The folder is mounted now ([infrastructure.md](infrastructure.md#where-the-database-lives)). The integration test and the browser test both missed it, because neither ran the real compose file.
- **Transactions zone.** The extract moved to the BFF: signed values, months with the year, newest first, and a failed load no longer shows "Nenhuma transação encontrada".
- **RTK Query.** Both zones moved to RTK Query, by one factory in `@bytebank/store`; the slice, the Context and the hand-written loaders were removed ([state-management.md](state-management.md)).
- **Cleanup.** `@bytebank/types` was retired, dead copies were removed, port 3001 stopped being published, and `/sobre` became a per-request page.
- **Known instabilities.** Node 24 on Windows crashes test workers now and then, and one failure on Node 20 was never reproduced ([testing.md](testing.md#known-instabilities)). CI moved to Node 22.

## Block 3: security (2026-10-31)

- **Passwords and login.** scrypt instead of plain text, one `authorize` instead of three, a decoy hash for unknown emails and a real registration ([security.md](security.md#passwords)). The old seed kept passwords in plain text, and the old `NEXTAUTH_SECRET` was in `docker-compose.yml` and in the README: both stay in the git history and were replaced.
- **Session and limits.** A 30-minute session, an inactivity logout after 10 minutes, and attempt limits by email and IP. Reading the container logs during the expiry test showed that Auth.js logged the content of the token, with name and email; `authLogger` now logs only the error name and message.
- **Headers, CSP and attachments.** A CSP with a nonce per request, AES-256-GCM for the attachments, secrets out of the compose file, and json-server installed in its image instead of downloaded at each start.
- **Password policy and recovery.** First version of the policy (minimum of 15, from NIST), recovery by email with a hashed token, and Mailpit locally. A damaged attachment used to make the whole list answer 502; it now shows "Anexo indisponível".

## Block 5: reactive programming (2026-10-31)

- The search of the extract became an RxJS pipeline, tested with marble tests ([reactive-programming.md](reactive-programming.md)).

## Block 6: performance and accessibility (2026-11-02)

- **Lazy loading and preloading.** Recharts and the modals left the first load; the First Load JS of `/dashboard` fell from 279.4 KB to 185.4 KB ([performance.md](performance.md)).
- **Accessibility.** An automatic audit of every route and modal at 375 and 1280 px; contrast fixed through tokens, focus, drawer and charts ([accessibility.md](accessibility.md)).
- **LCP on mobile.** A manual run showed 2.6 s and 3.2 s against 0.7 s in the baseline. Most of it was the method (cold cache against warm cache); with a cold cache there was a real regression, which the daisyUI include list and the icon font subset reduced ([performance.md](performance.md#lcp-on-mobile-a-fair-comparison)).

## Block 7: thin apps and rules in the domain (2026-11-02)

- **No copies between apps.** Hooks, header, menus, modals, theme, store provider, handlers and the NextAuth of the zones moved to packages; `@bytebank/auth` was created ([modularization.md](modularization.md)). The shell copies of two hooks and the three empty `tailwind.config.ts` were dead code and were removed.
- **Rules out of the screens.** Type suggestion, "today" in São Paulo and the future-date check moved to the domain, and "Minha conta" started saving the name and the password ([domain.md](domain.md#account)).

## Deploy (2026-11-06)

- **Supabase.** A Postgres database behind the same ports, chosen by `DATA_BACKEND`, with contract suites for both backends (ADR 0010, [deploy.md](deploy.md)). It closed three open items of json-server: a unique email, a reset link used once under concurrency, and rate limits shared by every instance.
- **Vercel.** The rewrites came from variables instead of fixed hosts, one region for the functions and the database, and no email in production.
- **The session race.** The first test of the production deployment saved a name that came back to the old one, and a logout that left the session alive (8 of 8 checks failed). A session read that answered after a write put the old cookie back. Fixed in the same step ([security.md](security.md#the-session-race)).

## Password policy per OWASP ASVS 5.0 (2026-11-09)

- The minimum went from 15 to 8, with the list of the 10,000 most common passwords, the context words and an entropy-based strength indicator ([security.md](security.md#password-policy)).

## Final step and review (2026-11-13)

- **Layers and server-only entries.** ESLint layer rules, `server-only` on the server entries, a typed client for the shell, and secrets checked at start ([security.md](security.md#server-only-entries)). The secrets check first wrote to `process.stderr` from `instrumentation.ts`, which Next also compiles for the Edge runtime; the import now runs only under `NEXT_RUNTIME === 'nodejs'`.
- **Storybook.** 22 components with a story, and interaction tests for the interactive ones ([testing.md](testing.md#storybook)). Two `Header` tests failed with "`useSession` must be wrapped in a `<SessionProvider />`" until the stories got a made-up session.
- **Review fixes.**
  - Complete `.env.example` files.
  - The attachment field is cleared after a transaction is created, and has a "Remover anexo" button.
  - The "Buscar" label points to its field, and the breadcrumb has a Portuguese name.
  - The transaction actions are shared through `TransactionActions` (the repeated 6-line windows between the apps went from 30 to 22).
  - The rate-limit keys use HMAC ([security.md](security.md#keys-of-the-rate-limits)).

## Delivery (2026-11-14)

- The docs were reorganized by subject, with this page as the only timeline. The work notes of the lint diagnosis and the dependency audit were merged here and into [ci.md](ci.md).
- The Lighthouse PDFs kept are the official "before" (Next 16.4.3, one run per page and device) and the median run of the 3 "after" runs. The reports measured on Next 16.2.4, before the dependency upgrade, and the other 8 "after" runs were removed; their numbers stay in [baseline.md](baseline.md) and [performance.md](performance.md#lighthouse-before-and-after).

## Superseded numbers

The coverage table of the early blocks measured fewer files. At the end of Block 3 it gave 97.05% of statements (658/678), 97.64% of branches (290/297), 96.92% of functions (252/260) and 97.46% of lines (576/591), over `utils`, `core`, `infrastructure`, `bff`, `store` and two design system files. The current figures, over every package, are in [testing.md](testing.md#coverage).
