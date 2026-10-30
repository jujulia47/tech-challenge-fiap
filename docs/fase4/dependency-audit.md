# Phase 4: dependency audit (Step 0.4)

**Date:** 2026-10-29

This is a diagnosis only. `npm audit fix` was **not** run, and no `package.json` or lockfile was changed. The data comes from `npm audit --json` and `npm audit --omit=dev --json` at the root, plus `npm ls <package>` for the dependency paths.

## Totals

| Audit | Critical | High | Moderate | Low | Total |
|---|---|---|---|---|---|
| `npm audit` (full) | 9 | 11 | 2 | 2 | 24 |
| `npm audit --omit=dev` | 3 | 4 | 1 | 0 | 8 |

Counts are per **package**, as npm reports them. Each package can carry several advisories. The severity of a package is the highest severity among its advisories, including the ones it inherits from vulnerable dependencies.

Packages in the `--omit=dev` audit: `@auth/core`, `baseline-browser-mapping`, `nanoid`, `next`, `next-auth`, `postcss`, `sharp`, `source-map-js`.

`json-server` is not affected (no vulnerability reported), so there are no **runtime-mock** items.

## Exposure classification

- **runtime-app**: runs in the deployed apps (Next.js server, auth).
- **runtime-mock**: runs only in the mock backend (json-server). None in this audit.
- **dev-only**: development, build or test tooling (Storybook, Vitest, Vite, ESLint). Items marked **dev-only (build)** are installed as production dependencies of `next` or the Tailwind PostCSS plugin, which is why `--omit=dev` still lists them. They process CSS and browser targets at build time and do not handle requests in the running server.

## All vulnerabilities

| Package | Version | Severity | Advisories | Direct/transitive (via) | Workspaces | Exposure | Fix available | Breaking |
|---|---|---|---|---|---|---|---|---|
| `@auth/core` | 0.41.2 | critical | 3 (1 critical, 1 high, 1 moderate), see appendix | transitive (next-auth) | shell, dashboard, transactions | runtime-app | yes: next-auth@5.0.0-beta.32 | no |
| `@storybook/addon-vitest` | 10.3.6 | critical | 2 (1 critical, 1 high), see appendix | direct | shell | dev-only | yes (lockfile update within current ranges) | no |
| `@vitest/browser` | 4.1.5 | critical | 3 (3 critical), see appendix; inherited from `@vitest/mocker`, `vitest` | transitive (@storybook/addon-vitest, @vitest/browser-playwright, @vitest/coverage-v8) | shell | dev-only | yes (lockfile update within current ranges) | no |
| `@vitest/browser-playwright` | 4.1.5 | critical | inherited from `@vitest/browser`, `@vitest/mocker`, `vitest` | direct | shell | dev-only | yes (lockfile update within current ranges) | no |
| `@vitest/coverage-v8` | 4.1.5 | critical | inherited from `@vitest/browser`, `vitest` | direct | shell | dev-only | yes (lockfile update within current ranges) | no |
| `next` | 16.2.4 | critical | 33 (5 critical, 13 high, 12 moderate, 3 low), see appendix; inherited from `postcss`, `sharp` | direct | shell, dashboard, transactions, design-system (peer) | runtime-app | yes: next@16.4.3 | no |
| `next-auth` | 5.0.0-beta.31 | critical | 4 (2 critical, 1 high, 1 moderate), see appendix; inherited from `@auth/core` | direct | shell, dashboard, transactions | runtime-app | yes: next-auth@5.0.0-beta.32 | no |
| `storybook` | 10.3.6 | critical | 2 (1 critical, 1 high), see appendix | direct | shell | dev-only | yes (lockfile update within current ranges) | no |
| `vitest` | 4.1.5 | critical | 1 (1 moderate), see appendix; inherited from `@vitest/browser-playwright`, `@vitest/coverage-v8`, `@vitest/mocker` | direct | shell | dev-only | yes (lockfile update within current ranges) | no |
| `brace-expansion` | 5.0.5, 1.1.14 | high | 13 (10 high, 3 moderate), see appendix | transitive (eslint (minimatch), typescript-eslint (minimatch), @storybook/nextjs-vite (glob)) | root, shell, dashboard, transactions | dev-only | yes (lockfile update within current ranges) | no |
| `browserslist` | 4.28.2 | high | 2 (2 high), see appendix | transitive (eslint-plugin-react-hooks (via @babel/core), @storybook/nextjs-vite) | root, shell | dev-only | yes (lockfile update within current ranges) | no |
| `image-size` | 2.0.2 | high | 2 (2 high), see appendix | transitive (@storybook/nextjs-vite (via vite-plugin-storybook-nextjs)) | shell | dev-only | yes (lockfile update within current ranges) | no |
| `js-yaml` | 4.1.1 | high | 4 (3 high, 1 moderate), see appendix | transitive (eslint (via @eslint/eslintrc)) | root, shell, dashboard, transactions | dev-only | yes (lockfile update within current ranges) | no |
| `nanoid` | 3.3.11 | high | 3 (3 high), see appendix | transitive (postcss (via next and @tailwindcss/postcss)) | shell, dashboard, transactions | dev-only (build) | yes (lockfile update within current ranges) | no |
| `postcss` | 8.4.31, 8.5.10 | high | 4 (2 high, 2 moderate), see appendix | transitive (next (bundled copy 8.4.31), @tailwindcss/postcss, vite) | shell, dashboard, transactions | dev-only (build) | yes: next@16.4.3 | no |
| `sharp` | 0.34.5 | high | 3 (3 high), see appendix | transitive (next (optional dependency, used by the image optimizer)) | shell, dashboard, transactions | runtime-app | yes: next@16.4.3 | no |
| `source-map-js` | 1.2.1 | high | 1 (1 high), see appendix | transitive (postcss (via next), @tailwindcss/postcss, @vitest/coverage-v8) | shell, dashboard, transactions | dev-only (build) | yes (lockfile update within current ranges) | no |
| `vite` | 8.0.10 | high | 7 (1 high, 5 moderate, 1 low), see appendix | direct | shell | dev-only | yes (lockfile update within current ranges) | no |
| `ws` | 8.20.0 | high | 2 (1 high, 1 moderate), see appendix | transitive (storybook, @storybook/addon-vitest (via @vitest/browser)) | shell | dev-only | yes (lockfile update within current ranges) | no |
| `zod` | 4.3.6 | high | 1 (1 high), see appendix | transitive (eslint-plugin-react-hooks) | root, shell, dashboard, transactions (via eslint-config-next) | dev-only | yes (lockfile update within current ranges) | no |
| `@vitest/mocker` | 4.1.5 | moderate | 2 (2 moderate), see appendix | transitive (vitest, @vitest/browser, @vitest/browser-playwright) | shell | dev-only | yes (lockfile update within current ranges) | no |
| `baseline-browser-mapping` | 2.10.20 | moderate | 1 (1 moderate), see appendix | transitive (next, eslint-plugin-react-hooks (via @babel/core → browserslist)) | shell, dashboard, transactions, root | dev-only (build) | yes (lockfile update within current ranges) | no |
| `@babel/core` | 7.29.0 | low | 1 (1 low), see appendix | transitive (eslint-plugin-react-hooks, @storybook/nextjs-vite (via react-docgen)) | root, shell, dashboard, transactions | dev-only | yes (lockfile update within current ranges) | no |
| `esbuild` | 0.27.7 | low | 1 (1 low), see appendix | transitive (vite, storybook, @storybook/addon-docs) | shell | dev-only | yes (lockfile update within current ranges) | no |

"Fix available: yes (lockfile update within current ranges)" means npm reports `fixAvailable: true`: a fixed version exists inside the semver range already declared, so only the lockfile would change. No item reports `isSemVerMajor: true`.

## Proposed actions

### Safe update

Fixes without a major version bump.

- **`next` 16.2.4 → 16.4.3** (fixes `next` and the inherited `postcss` and `sharp` advisories). It is a minor bump, but every app pins `"next": "16.2.4"` exactly, and `eslint-config-next` is pinned to `16.2.4` in the shell, dashboard and transactions. The update means editing those pins in the three apps, not a lockfile-only change. A minor bump of Next can still change build output and defaults, so it should be followed by a full build, a lint run and a manual smoke test of login, `/dashboard` and `/transactions`.
  - Directly relevant to this project: several advisories are **Middleware / Proxy bypasses** (GHSA-26hh-7cqf-hhc6, GHSA-492v-c6pp-mqqv, GHSA-267c-6grr-h53f, GHSA-6gpp-xcg3-4w24). The shell uses `src/proxy.ts` as the only guard for `/dashboard` and `/transactions`. GHSA-6gpp-xcg3-4w24 specifically targets App Router apps built with Turbopack, which is this setup.
  - The critical RCE advisories target the Image Optimization API (AVIF/SVG), `next/og`, `use cache` and Windows-hosted servers. The apps do not use `next/image`, `next/og` or `use cache`, and production runs on Linux containers. The Image Optimization endpoint is still enabled by default, so this lowers the likelihood but does not remove the exposure.
- **`next-auth` 5.0.0-beta.31 → 5.0.0-beta.32** (fixes `next-auth` and `@auth/core`). It stays inside the declared ranges (`"beta"` in dashboard/transactions, `"^5.0.0-beta.31"` in the shell), so it is a lockfile update. It is still a pre-release, so it should be tested like any other auth change.
  - Directly relevant: GHSA-8fpg-xm3f-6cx3 (critical) says configuration errors can populate the `auth` object with an error, so **existence-based checks fail open**. `apps/shell/src/proxy.ts` uses exactly this pattern: `const isAuthenticated = !!req.auth`.
- **Dev tooling, lockfile-only:** `storybook` and `@storybook/addon-vitest` (→ ≥ 10.6.2), `vitest`, `@vitest/*` (→ ≥ 4.1.12), `vite` (→ > 8.1.5), `esbuild` (→ ≥ 0.28.1), `ws`, `image-size`, `@babel/core`, `browserslist`, `baseline-browser-mapping`, `brace-expansion`, `js-yaml`, `zod`, `nanoid` and `source-map-js`. All are `fixAvailable: true` inside the current ranges. The Storybook/Vitest items are the ones in the "Accept with justification" group below, so updating them is optional but cheap.

### Major update needed

None. No fix reported by npm requires a major version bump.

### No fix available

None. Every vulnerable package has a fix available.

### Accept with justification

These items never reach the deployed apps. They can be accepted if the update is postponed, with the justification below. A lockfile refresh still fixes all of them without a major bump, so the recommendation is to update rather than accept.

- **Storybook and Vitest browser mode** (`storybook`, `@storybook/addon-vitest`, `vitest`, `@vitest/browser`, `@vitest/browser-playwright`, `@vitest/coverage-v8`, `@vitest/mocker`, `ws`, `image-size`): shell only, used for the component docs and story tests. Several of these are **critical** (code injection from malicious websites or from the local network into the Storybook dev server, RCE through the Vitest browser-mode API). The risk exists only while `storybook dev` or browser-mode tests are running on a developer machine. Mitigation until updated: do not expose port 6006 or the Vitest browser server on the network, and close them when not in use.
- **Vite and esbuild** (`vite`, `esbuild`): dev server and Storybook builder in the shell. Several advisories are Windows-specific (`launch-editor`, `server.fs.deny` bypass), which matches the development machine. Same mitigation: dev server only, not exposed.
- **Lint tooling** (`brace-expansion`, `js-yaml`, `zod`, `@babel/core`, `browserslist`): DoS or file-read issues triggered by malicious input files. ESLint only reads this repository's own code.
- **Build-time CSS tooling** (`postcss`, `nanoid`, `source-map-js`, `baseline-browser-mapping`): listed by `--omit=dev` because they are production dependencies of `next` and `@tailwindcss/postcss`. They only process the project's own CSS at build time. The `postcss` advisories inside `next` are fixed by the `next` update above.

## Appendix: advisories per package

### `@auth/core` (critical)

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-7rqj-j65f-68wh](https://github.com/advisories/GHSA-7rqj-j65f-68wh) | critical | `>=0.1.0 <0.41.3` | Auth.js: Email normalizer validates the address before Unicode normalization, allowing a homoglyph @ bypass |
| [GHSA-xmf8-cvqr-rfgj](https://github.com/advisories/GHSA-xmf8-cvqr-rfgj) | high | `>=0.1.0 <0.41.3` | Auth.js: getToken() throws an uncaught exception on malformed Bearer authorization headers |
| [GHSA-x445-f3h2-j279](https://github.com/advisories/GHSA-x445-f3h2-j279) | moderate | `<=0.41.2` | Auth.js: OAuth state, nonce, and PKCE check cookies are not bound to the provider that created them |

### `@storybook/addon-vitest` (critical)

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-f2ph-cmg5-wxc8](https://github.com/advisories/GHSA-f2ph-cmg5-wxc8) | critical | `>=10.0.0 <10.6.2` | Storybook: Missing origin validation in Storybook preview allows code injection from malicious websites |
| [GHSA-px85-f4q5-jh77](https://github.com/advisories/GHSA-px85-f4q5-jh77) | high | `>=10.0.0 <10.6.2` | Storybook dev server vulnerable to code injection from the local network |

### `@vitest/browser` (critical)

Inherited from: `@vitest/mocker`, `vitest`.

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-2h32-95rg-cppp](https://github.com/advisories/GHSA-2h32-95rg-cppp) | critical | `>=4.0.17 <4.1.6` | Vitest browser mode serves unsanitized otelCarrier query parameter as inline script |
| [GHSA-p63j-vcc4-9vmv](https://github.com/advisories/GHSA-p63j-vcc4-9vmv) | critical | `>=4.0.0 <4.1.10` | @vitest/browser: Browser Mode provider commands bypass the file-access permission gate |
| [GHSA-g8mr-85jm-7xhm](https://github.com/advisories/GHSA-g8mr-85jm-7xhm) | critical | `>=4.0.0 <=4.1.7` | Vitest Browser: Exposed Browser Mode API Can Proxy CDP and Overwrite Config Files, Leading to RCE |

### `@vitest/browser-playwright` (critical)

Inherited from: `@vitest/browser`, `@vitest/mocker`, `vitest`.

### `@vitest/coverage-v8` (critical)

Inherited from: `@vitest/browser`, `vitest`.

### `next` (critical)

Inherited from: `postcss`, `sharp`.

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36) | critical | `>=16.0.0 <16.3.3` | Next.js: Unauthenticated Remote Code Execution on windows-hosted servers |
| [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) | critical | `>=16.0.0 <16.3.3` | Next.js: Unauthenticated Remote Code Execution in Image Optimization API when AVIF files are used |
| [GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j) | critical | `>=16.2.0 <16.3.6` | Next.js: Remote Code Execution in next/og ImageResponse |
| [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw) | critical | `>=16.0.0 <=16.4.0` | Next.js: Unauthenticated Remote Code Execution in Image Optimization API when SVG files are used |
| [GHSA-673q-mjm6-r5xr](https://github.com/advisories/GHSA-673q-mjm6-r5xr) | critical | `>=16.0.0 <=16.4.0` | Next.js: Unauthenticated Remote Code Execution in `use cache` functions returning typed arrays |
| [GHSA-8h8q-6873-q5fj](https://github.com/advisories/GHSA-8h8q-6873-q5fj) | high | `>=16.0.0 <16.2.5` | Next.js Vulnerable to Denial of Service with Server Components |
| [GHSA-26hh-7cqf-hhc6](https://github.com/advisories/GHSA-26hh-7cqf-hhc6) | high | `>=16.0.0 <16.2.6` | Next.js has a Middleware / Proxy bypass in App Router applications via segment-prefetch routes - Incomplete Fix Follow-Up |
| [GHSA-mg66-mrh9-m8jx](https://github.com/advisories/GHSA-mg66-mrh9-m8jx) | high | `>=16.0.0 <16.2.5` | Next.js vulnerable to Denial of Service via connection exhaustion in applications using Cache Components |
| [GHSA-c4j6-fc7j-m34r](https://github.com/advisories/GHSA-c4j6-fc7j-m34r) | high | `>=16.0.0 <16.2.5` | Next.js vulnerable to server-side request forgery in applications using WebSocket upgrades |
| [GHSA-492v-c6pp-mqqv](https://github.com/advisories/GHSA-492v-c6pp-mqqv) | high | `>=16.0.0 <16.2.5` | Next.js has a Middleware / Proxy bypass through dynamic route parameter injection |
| [GHSA-267c-6grr-h53f](https://github.com/advisories/GHSA-267c-6grr-h53f) | high | `>=16.0.0 <16.2.5` | Next.js has a Middleware / Proxy bypass in App Router applications via segment-prefetch routes |
| [GHSA-36qx-fr4f-26g5](https://github.com/advisories/GHSA-36qx-fr4f-26g5) | high | `>=16.0.0 <16.2.5` | Next.js has a Middleware / Proxy bypass in Pages Router applications using i18n |
| [GHSA-6gpp-xcg3-4w24](https://github.com/advisories/GHSA-6gpp-xcg3-4w24) | high | `>=16.0.0 <16.2.11` | Next.js: Middleware / Proxy bypass in App Router applications using Turbopack and single locale |
| [GHSA-m99w-x7hq-7vfj](https://github.com/advisories/GHSA-m99w-x7hq-7vfj) | high | `>=16.0.0 <16.2.11` | Next.js: Denial of Service in App Router using Server Actions |
| [GHSA-89xv-2m56-2m9x](https://github.com/advisories/GHSA-89xv-2m56-2m9x) | high | `>=16.0.0 <16.2.11` | Next.js: Server-Side Request Forgery in Server Actions on custom servers |
| [GHSA-p9j2-gv94-2wf4](https://github.com/advisories/GHSA-p9j2-gv94-2wf4) | high | `>=16.0.0 <16.2.11` | Next.js: Server-Side Request Forgery in rewrites via attacker-controlled destination hostname |
| [GHSA-cjq9-62q9-8jv4](https://github.com/advisories/GHSA-cjq9-62q9-8jv4) | high | `>=16.0.0 <16.3.8` | Next.js has Server-Side Request Forgery in Image Optimization |
| [GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r) | high | `>=16.0.0 <=16.4.0` | Next.js: Denial of Service in App Router using Server Actions |
| [GHSA-ffhc-5mcf-pf4q](https://github.com/advisories/GHSA-ffhc-5mcf-pf4q) | moderate | `>=16.0.0 <16.2.5` | Next.js vulnerable to cross-site scripting in App Router applications using CSP nonces |
| [GHSA-gx5p-jg67-6x7h](https://github.com/advisories/GHSA-gx5p-jg67-6x7h) | moderate | `>=16.0.0 <16.2.5` | Next.js has cross-site scripting in beforeInteractive scripts with untrusted input |
| [GHSA-h64f-5h5j-jqjh](https://github.com/advisories/GHSA-h64f-5h5j-jqjh) | moderate | `>=16.0.0 <16.2.5` | Next.js has a Denial of Service in the Image Optimization API |
| [GHSA-wfc6-r584-vfw7](https://github.com/advisories/GHSA-wfc6-r584-vfw7) | moderate | `>=16.0.0 <16.2.5` | Next.js vulnerable to cache poisoning in React Server Component responses |
| [GHSA-68g3-v927-f742](https://github.com/advisories/GHSA-68g3-v927-f742) | moderate | `>=16.0.0 <16.2.11` | Next.js: Cache confusion of response bodies for requests with bodies |
| [GHSA-4633-3j49-mh5q](https://github.com/advisories/GHSA-4633-3j49-mh5q) | moderate | `>=16.0.0 <16.2.11` | Next.js: Cache confusion of response bodies for requests with bodies containing invalid UTF-8 byte sequences |
| [GHSA-4c39-4ccg-62r3](https://github.com/advisories/GHSA-4c39-4ccg-62r3) | moderate | `>=16.0.0 <16.2.11` | Next.js: Unbounded Server Action payload in Edge runtime |
| [GHSA-q8wf-6r8g-63ch](https://github.com/advisories/GHSA-q8wf-6r8g-63ch) | moderate | `>=16.0.0 <16.2.11` | Next.js: Denial of Service in the Image Optimization API using SVGs |
| [GHSA-955p-x3mx-jcvp](https://github.com/advisories/GHSA-955p-x3mx-jcvp) | moderate | `>=16.0.0 <16.2.11` | Next.js: Unauthenticated disclosure of internal Server Function endpoints |
| [GHSA-4jqv-mc3x-m676](https://github.com/advisories/GHSA-4jqv-mc3x-m676) | moderate | `>=16.0.0 <16.3.8` | Next.js has cache poisoning of SSG and ISR pages in self-hosted applications |
| [GHSA-f87g-xv8r-7p7x](https://github.com/advisories/GHSA-f87g-xv8r-7p7x) | moderate | `>=16.0.0 <16.3.8` | Next.js has information disclosure in App Router metadata image routes via dynamicParams bypass |
| [GHSA-mcj8-r9mp-w47p](https://github.com/advisories/GHSA-mcj8-r9mp-w47p) | moderate | `>=16.0.0 <16.3.8` | Next.js has cache poisoning in SSG/ISR rendering that leads to cross-user content substitution and persistent denial of service |
| [GHSA-3g8h-86w9-wvmq](https://github.com/advisories/GHSA-3g8h-86w9-wvmq) | low | `>=16.0.0 <16.2.5` | Next.js's Middleware / Proxy redirects can be cache-poisoned |
| [GHSA-vfv6-92ff-j949](https://github.com/advisories/GHSA-vfv6-92ff-j949) | low | `>=16.0.0 <16.2.5` | Next.js vulnerable to cache poisoning via collisions in React Server Component cache-busting |
| [GHSA-39w2-rjm5-chcv](https://github.com/advisories/GHSA-39w2-rjm5-chcv) | low | `>=16.0.0 <16.3.8` | Next.js has information disclosure in development server's Model Context Protocol endpoint |

### `next-auth` (critical)

Inherited from: `@auth/core`.

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-8fpg-xm3f-6cx3](https://github.com/advisories/GHSA-8fpg-xm3f-6cx3) | critical | `>=5.0.0-beta.0 <=5.0.0-beta.31` | Auth.js: Configuration errors can cause existence-based auth checks to fail open (auth object populated with an error) |
| [GHSA-7rqj-j65f-68wh](https://github.com/advisories/GHSA-7rqj-j65f-68wh) | critical | `>=5.0.0-beta.1 <=5.0.0-beta.31` | Auth.js: Email normalizer validates the address before Unicode normalization, allowing a homoglyph @ bypass |
| [GHSA-xmf8-cvqr-rfgj](https://github.com/advisories/GHSA-xmf8-cvqr-rfgj) | high | `>=5.0.0-beta.0 <=5.0.0-beta.31` | Auth.js: getToken() throws an uncaught exception on malformed Bearer authorization headers |
| [GHSA-x445-f3h2-j279](https://github.com/advisories/GHSA-x445-f3h2-j279) | moderate | `>=5.0.0-beta.1 <=5.0.0-beta.31` | Auth.js: OAuth state, nonce, and PKCE check cookies are not bound to the provider that created them |

### `storybook` (critical)

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-f2ph-cmg5-wxc8](https://github.com/advisories/GHSA-f2ph-cmg5-wxc8) | critical | `>=10.0.0 <10.6.2` | Storybook: Missing origin validation in Storybook preview allows code injection from malicious websites |
| [GHSA-px85-f4q5-jh77](https://github.com/advisories/GHSA-px85-f4q5-jh77) | high | `>=10.0.0 <10.6.2` | Storybook dev server vulnerable to code injection from the local network |

### `vitest` (critical)

Inherited from: `@vitest/browser-playwright`, `@vitest/coverage-v8`, `@vitest/mocker`.

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) | moderate | `>=2.1.0 <4.1.11` | Vitest: Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock |

### `brace-expansion` (high)

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) | high | `<1.1.16` | brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups |
| [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) | high | `>=3.0.0 <5.0.7` | brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups |
| [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) | high | `<1.1.17` | brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash |
| [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) | high | `>=4.0.0 <5.0.8` | brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash |
| [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) | high | `>=4.0.0 <5.0.9` | brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation |
| [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) | high | `<1.1.18` | brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation |
| [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) | high | `<1.1.20` | brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion |
| [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) | high | `>=4.0.0 <5.0.11` | brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion |
| [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) | high | `<1.1.19` | brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion |
| [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) | high | `>=4.0.0 <5.0.10` | brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion |
| [GHSA-jxxr-4gwj-5jf2](https://github.com/advisories/GHSA-jxxr-4gwj-5jf2) | moderate | `>=5.0.0 <5.0.6` | brace-expansion: Large numeric range defeats documented `max` DoS protection |
| [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) | moderate | `<1.1.21` | brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service |
| [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) | moderate | `>=4.0.0 <5.0.12` | brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service |

### `browserslist` (high)

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) | high | `<=4.28.6` | Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM |
| [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g) | high | `<=4.28.6` | Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats) |

### `image-size` (high)

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) | high | `>=1.2.0 <=2.0.2` | image-size: JXL and HEIF parsers allow denial of service through infinite loops |
| [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) | high | `>=0.6.3 <=2.0.2` | image-size: ICNS parser allows denial of service through an infinite loop |

### `js-yaml` (high)

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m) | high | `>=4.0.0 <4.3.0` | js-yaml: YAML merge-key chains can force quadratic CPU consumption |
| [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) | high | `>=4.0.0 <4.3.1` | JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported |
| [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) | high | `>=4.0.0 <4.3.2` | js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources |
| [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68) | moderate | `>=4.0.0 <=4.1.1` | JS-YAML: Quadratic-complexity DoS in merge key handling via repeated aliases |

### `nanoid` (high)

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) | high | `<3.3.16` | nanoid: non-secure generators can loop indefinitely with negative size |
| [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) | high | `<3.3.18` | nanoid: custom generators can loop indefinitely when size is zero |
| [GHSA-xwg4-73v4-xw9w](https://github.com/advisories/GHSA-xwg4-73v4-xw9w) | high | `<3.3.12` | nanoid: Integer Overflow or Wraparound |

### `postcss` (high)

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) | high | `<=8.5.11` | PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments |
| [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) | high | `<=8.5.17` | PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure |
| [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) | moderate | `<8.5.10` | PostCSS has XSS via Unescaped </style> in its CSS Stringify Output |
| [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) | moderate | `<=8.5.22` | PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset |

### `sharp` (high)

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) | high | `<0.35.0` | sharp inherited vulnerabilities in libvips: CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 |
| [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) | high | `<0.35.4` | sharp: Vulnerabilities in libheif: GHSA-g89c-p67h-r497 and GHSA-2jg2-4ch7-h545 |
| [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) | high | `<0.35.5` | sharp : Vulnerability in librsvg dependency CVE-2026-96889 |

### `source-map-js` (high)

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) | high | `>=1.0.0 <1.2.2` | source-map-js allows event-loop denial of service through indexed source-map section offsets |

### `vite` (high)

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm) | high | `>=8.0.0 <=8.1.5` | launch-editor: `fs.existsSync()` existence check can be bypassed on Windows |
| [GHSA-v6wh-96g9-6wx3](https://github.com/advisories/GHSA-v6wh-96g9-6wx3) | moderate | `>=8.0.0 <=8.0.15` | launch-editor: NTLMv2 hash disclosure via UNC path handling on Windows |
| [GHSA-698v-4r3x-3vcv](https://github.com/advisories/GHSA-698v-4r3x-3vcv) | moderate | `>=8.0.0 <=8.1.5` | launch-editor: escapeCmdArgs() omits % escaping on Windows |
| [GHSA-r825-w8mm-5pxw](https://github.com/advisories/GHSA-r825-w8mm-5pxw) | moderate | `>=8.0.0 <=8.1.5` | launch-editor: Editor CLI flag misinterpretation causing arbitrary command execution for some editors |
| [GHSA-rq7h-c2jc-7f22](https://github.com/advisories/GHSA-rq7h-c2jc-7f22) | moderate | `>=8.0.0 <=8.1.5` | Vite: Files outside `server.fs.allow` could be served when project paths match system paths on non-Windows machine |
| [GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) | moderate | `>=8.0.0 <=8.0.15` | vite: `server.fs.deny` bypass on Windows alternate paths |
| [GHSA-9jrq-w75r-8gcw](https://github.com/advisories/GHSA-9jrq-w75r-8gcw) | low | `>=8.0.0 <=8.1.5` | Vite: Cross origin script execution through Vite custom middleware |

### `ws` (high)

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) | high | `>=8.0.0 <8.21.0` | ws: Memory exhaustion DoS from tiny fragments and data chunks |
| [GHSA-58qx-3vcg-4xpx](https://github.com/advisories/GHSA-58qx-3vcg-4xpx) | moderate | `>=8.0.0 <8.20.1` | ws: Uninitialized memory disclosure |

### `zod` (high)

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) | high | `<4.6.6` | Zod can exhaust memory while validating oversized constrained collections |

### `@vitest/mocker` (moderate)

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) | moderate | `>=2.1.0 <4.1.11` | Vitest: Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock |
| [GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) | moderate | `>=2.1.0-beta.7 <4.1.12` | Vitest: Code injection via unauthenticated manual mock registration |

### `baseline-browser-mapping` (moderate)

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-w5vr-8v7q-w6rv](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) | moderate | `>=2.0.0 <2.11.0` | baseline-browser-mapping process termination on invalid input causes denial of service |

### `@babel/core` (low)

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8) | low | `<=7.29.0` | @babel/core: Arbitrary File Read via sourceMappingURL Comment |

### `esbuild` (low)

| Advisory | Severity | Affected range | Title |
|---|---|---|---|
| [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr) | low | `>=0.27.3 <0.28.1` | esbuild allows arbitrary file read when running the development server on Windows |

## Resolution

Applied on 2026-10-29. No `npm audit fix --force` was used and no major version was installed.

### What was updated

Runtime (`package.json` of shell, dashboard and transactions, exact versions):

| Package | Before | After |
|---|---|---|
| `next` | `16.2.4` | `16.4.3` |
| `eslint-config-next` | `16.2.4` | `16.4.3` |
| `next-auth` | `"^5.0.0-beta.31"` (shell), `"beta"` (dashboard, transactions), installed 5.0.0-beta.31 | `5.0.0-beta.32` in all three |

Pulled in by `npm install` as a result: `@auth/core` 0.41.2 → 0.41.3, `sharp` 0.34.5 → 0.35.5 (plus the `@img/sharp-*` binaries), `postcss` 8.5.10 → 8.5.23 (the copy bundled inside `next`, 8.4.31, was removed), `nanoid` 3.3.11 → 3.3.20, `jose` 6.2.3 → 6.2.14, `oauth4webapi` 3.8.6 → 3.8.8 and `@next/*` 16.2.4 → 16.4.3. `npm ls next next-auth` shows a single installed version of each: `next@16.4.3` and `next-auth@5.0.0-beta.32`.

Dev-only (`npm audit fix`, lockfile only, no `package.json` changed):

| Package | Before | After |
|---|---|---|
| `vite` | 8.0.10 | 8.3.5 |
| `@babel/core` (and the `@babel/*` helpers) | 7.29.0 | 7.29.7 |
| `brace-expansion` | 1.1.14 / 5.0.5 | 1.1.21 / 5.0.12 |
| `browserslist` | 4.28.2 | 4.29.5 |
| `baseline-browser-mapping` | 2.10.20 | 2.11.34 |
| `js-yaml` | 4.1.1 | 4.3.2 |
| `zod` | 4.3.6 | 4.6.7 |
| `ws` | 8.20.0 | 8.22.0 |
| `image-size` | 2.0.2 | 2.0.4 |
| `source-map-js` | 1.2.1 | 1.2.2 |
| `rolldown` (Vite dependency) | 1.0.0-rc.17 | 1.2.16 |

Minor transitive refreshes in the same run: `caniuse-lite`, `electron-to-chromium`, `node-releases`, `update-browserslist-db`, `tinyglobby`, `@oxc-project/types` and `@rolldown/*`. Vite also now has its own nested `postcss` 8.5.32 and `lightningcss` 1.33.0.

### `npm audit` after the update

| Audit | Critical | High | Moderate | Low | Total |
|---|---|---|---|---|---|
| `npm audit` (full), before | 9 | 11 | 2 | 2 | 24 |
| `npm audit` (full), after runtime update + `npm audit fix` | 6 | 0 | 1 | 1 | 8 |
| `npm audit` (full), after the Storybook/Vitest update (final) | 0 | 0 | 0 | 0 | **0** |
| `npm audit --omit=dev`, before | 3 | 4 | 1 | 0 | 8 |
| `npm audit --omit=dev`, after (final) | 0 | 0 | 0 | 0 | **0** |

All **runtime-app** vulnerabilities were resolved by the runtime update. The remaining dev-only ones were resolved by the Storybook/Vitest update below.

### Change in `apps/shell/src/proxy.ts`

```diff
-  const isAuthenticated = !!req.auth
+  // Require a user, not just an auth object: an auth object can be populated
+  // with an error and fail open (defense in depth, GHSA-8fpg-xm3f-6cx3)
+  const isAuthenticated = !!req.auth?.user
```

GHSA-8fpg-xm3f-6cx3 (critical, fixed in next-auth 5.0.0-beta.32) describes configuration errors that fill the `auth` object with an error, so checks that only test whether `auth` exists fail open. The proxy is the only guard of `/dashboard` and `/transactions`. Even with the patched version, it now requires a real user before letting a request through.

### Storybook and Vitest update (dev-only follow-up)

After the runtime update and `npm audit fix`, 8 dev-only vulnerabilities were left in the shell: `storybook`, `@storybook/addon-vitest`, `vitest`, `@vitest/browser`, `@vitest/browser-playwright`, `@vitest/coverage-v8` (critical), `@vitest/mocker` (moderate) and `esbuild` (low). `npm audit fix` reported `fixAvailable: true` but left them unchanged in two runs. The fixed `@storybook/addon-vitest` requires `storybook ^10.6.2` as a peer, so the whole Storybook family has to move together, and the `vitest` / `@vitest/*` family is versioned in lockstep. `npm audit fix` does not perform that coordinated update.

The ranges in `apps/shell/package.json` were raised to the lowest versions that fix every advisory, staying within the current majors:

| Package | Before | After (range) | Installed |
|---|---|---|---|
| `storybook`, `@storybook/addon-a11y`, `@storybook/addon-docs`, `@storybook/addon-onboarding`, `@storybook/addon-vitest`, `@storybook/nextjs-vite`, `eslint-plugin-storybook` | `^10.3.6` | `^10.6.2` | 10.6.5 (all) |
| `vitest`, `@vitest/browser-playwright`, `@vitest/coverage-v8` | `^4.1.5` | `^4.1.12` | 4.1.12 (all, including the transitive `@vitest/browser`, `@vitest/mocker`, `@vitest/runner`, `@vitest/snapshot`, `@vitest/spy`, `@vitest/utils`) |
| `@chromatic-com/storybook` | `^5.1.2` | `^5.2.1` | 5.6.0 |
| `esbuild` (transitive) | 0.27.7 | n/a | 0.28.2 |

- The ranges start at the lowest fixed version (10.6.2 / 4.1.12), as in the rest of the file. npm resolves `^10.6.2` to the latest 10.x patch, so the Storybook family is installed at 10.6.5 and all of its packages share that version.
- `@chromatic-com/storybook` 5.1.2 declares `storybook` up to `^10.4.0-0` in its peer range. npm kept an old `storybook@10.3.6` hoisted at the root just for it, which kept one critical advisory open. 5.2.1 is the lowest version whose peer range includes `^10.6.0-0`.
- `storybook` 10.6.5 depends on `@vitest/expect` 3.2.4 internally (for `storybook/test`), so a 3.2.4 copy of `@vitest/expect`, `@vitest/spy`, `@vitest/utils` and `@vitest/pretty-format` stays nested under it. npm does not report any advisory for it.
- After `npm install`, one more `npm audit fix` (lockfile only, no `package.json` change) updated `esbuild` to 0.28.2 and removed the stale `storybook@10.3.6`.
- **Lockfile placement fix.** The incremental updates left `storybook` hoisted at the root while `@storybook/nextjs-vite` and the addons were nested in `apps/shell/node_modules`, even though nothing at the root conflicted with them. `storybook build` then failed with `SB_CORE-SERVER_0002 (CriticalPresetLoadError)`: the root `storybook` could not import `@storybook/nextjs-vite`. `npm dedupe` did not move them. The fix was to remove only the Storybook, Vitest and Chromatic entries from `package-lock.json` and run `npm install` again, which placed them all at the root. No `package.json` changed and no other package version changed.
- `npm run build-storybook` (shell): exit code 0, "Storybook build completed successfully". The only output besides the file list is Vite's `MODULE_LEVEL_DIRECTIVE` notice about `'use client'` in Next.js modules, which is expected when bundling Next components outside Next. The generated `apps/shell/storybook-static/` (gitignored) was deleted afterwards, because the shell's ESLint config does not ignore it.

### `@next/next/no-location-assign-relative-destination` warnings

This rule is new in `eslint-config-next` 16.4.3. It flags `location.href = '<relative URL>'` and `location.assign('<relative URL>')`, because a full page load to an internal page throws away the client state and the App Router's soft navigation. The suggested alternatives are `redirect()` or `useRouter().push()`.

The rule reports only when the assigned value has a static string prefix that is relative, meaning it has no `scheme:` and no `//`. All four warnings were navigations across zones, where a full page load is required:

- `apps/shell/src/app/(public)/components/ModalLogin.tsx:43` and `ModalCadastro.tsx:39`: shell → `/dashboard`
- `apps/dashboard/src/components/layout/Header.tsx:19` and `apps/transactions/src/components/layout/Header.tsx:19`: zone → `/` after logout

Each one keeps the original relative string and gets an explicit, justified suppression on the line before it:

```diff
+    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- cross-zone navigation requires a full page load
     window.location.href = '/dashboard'
```

```diff
+    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- cross-zone navigation requires a full page load
     window.location.href = '/'
```

The destination and the behavior are unchanged.

An earlier version of this step used an absolute URL instead (`new URL('/dashboard', window.location.origin).href`). It resolved to the same address, but it only got around the rule's detection: the rule ignores values that are not a static relative string, so it no longer reported the line, without the rule actually allowing cross-zone navigation. That change was reverted. The suppression states the intent and the reason on each line, and it stays visible to ESLint (`eslint --report-unused-disable-directives` will flag it if the navigation ever changes). A shared cross-zone navigation helper would centralize these four cases and is a good candidate for the refactor.

### Validation (final)

- `npx turbo lint --continue`: exit code 0, 6 of 6 tasks, **0 errors and 0 warnings**. Per zone with `eslint . -f json`: shell 62 files, dashboard 57, transactions 43, all clean.
- `npm audit`: 0 vulnerabilities. `npm audit --omit=dev`: 0 vulnerabilities.
- `npm run build`: exit code 0, 3 of 3 apps built with `Next.js 16.4.3 (Turbopack)`. The route tables are the same as in the baseline: same routes, same static/dynamic markers, `/sobre` still `1h / 1y`, `ƒ Proxy (Middleware)` still present.
- New client JS baseline recorded in `docs/fase4/baseline.md`, in the "Client JS size (Next 16.4.3, refactor baseline)" section.

### Next.js 16.2 → 16.4 release notes: items that may affect this project

Sources: the Next.js 16.3 and 16.4 blog posts, the 16.3 Turbopack and Instant Navigations posts, and the GitHub release pages v16.3.0 to v16.4.3. The full text of the v16.3.0 and v16.4.0 release pages could only be read in part (the first ~39k characters of each), so items from the rest of those pages are marked **unverified**.

- **Strict route matching enabled by default (v16.4.0, #97397, unverified).** This could affect routing in a multi-zone setup with `basePath` and `beforeFiles` rewrites. It is the main item to check with a manual smoke test: login → `/dashboard`, `/dashboard/account`, `/transactions`, and the redirect to `/` when logged out.
- **Proxy/middleware:** "Don't load the app-page runtime in proxy.ts (#100423)" (v16.4.3); "detect proxy.ts correctly with compound pageExtensions (#93246)" (v16.4.0); and, unverified, "Turbopack: Fix middleware matcher suffix (#93590)" and "Turbopack: Match proxy matchers with webpack implementation (#93594)" (v16.3.0). The last two touch matcher behavior under Turbopack, which is this project's setup. The matcher in `proxy.ts` uses plain paths (`/dashboard`, `/dashboard/:path*`, ...), and the build still lists the proxy, but this also belongs in the smoke test.
- **Rewrites/basePath (v16.3.0, unverified):** "Preserve basePath in redirect destinations (#95608)" and "Update the URL when a client navigation redirects to a rewritten route (#95207)". These are fixes, but they touch the zones' `basePath` and the shell rewrites.
- **Turbopack build:** the filesystem cache for `next build` is now on by default (16.3 blog). It lives in `.next/cache`. The Turbopack hash encoding changed from base40 to base38 (v16.3.0), and production builds use export mangling and shorter CSS Module class names (16.4 blog). Chunk file names and sizes change, so the client-JS size table in `baseline.md` must be measured again before comparing "after" numbers.
- **Prefetch:** `prefetchInlining` is on by default (v16.3.0), and segment prefetch cache misses return 404 instead of 204 (v16.3.0). Both are internal to App Router navigation.
- **Caching / `revalidate` / `force-dynamic`:** Cache Components and Partial Prefetching stay **opt-in** (`cacheComponents`, `partialPrefetching`) and are announced as defaults for Next.js 17. This project does not enable them, so `export const revalidate = 3600` (`/sobre`) and `dynamic = 'force-dynamic'` (`/dashboard/account`) keep their current behavior. No release note mentions `force-dynamic`. One unverified v16.3.0 item, "fetch: respect HTTP Cache-Control headers with TTL-based invalidation (#93228)", may affect the `fetch(..., { next: { revalidate: 3600 } })` in `/sobre`.
- **`'use client'` root layouts:** no release note targets them.
- **Other default-on changes:** `experimental.agentUpgrade` defaults to `'security'` (16.4) and only prints upgrade reminders. React 19.3 ships with Next 16.4, but the apps pin `react`/`react-dom` 19.2.4 and the build passed.
- **Not read:** the Next.js blog announces an upcoming November 2026 security release. Plan another `npm audit` when it ships.
