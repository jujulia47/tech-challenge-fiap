# Phase 4: baseline (Step 0.1)

**Date:** 2026-10-29

This is a diagnosis of the current state, taken before any refactoring. No errors were fixed. They are only recorded here.

Environment: Node 20 via nvm4w, npm 11.12.1, turbo 2.9.18 and Next.js 16.2.4 (Turbopack), on Windows 11.

---

## Lint

Command: `npm run lint` at the root (`turbo lint`). It exited with **code 2**.

By default, turbo stops at the first failure, so the shell did not finish in the first run. To get a result for every workspace, `npx turbo lint --continue` was also run. The results below come from both runs.

| Workspace | `lint` script | Result |
|---|---|---|
| `@bytebank/shell` | `eslint` | ✅ Passed, with 0 errors and 0 warnings |
| `@bytebank/design-system` | `eslint src/` | ❌ Failed |
| `@bytebank/dashboard` | none | ⚪ Not run (no `lint` script) |
| `@bytebank/transactions` | none | ⚪ Not run (no `lint` script) |
| `@bytebank/types` | none | ⚪ Not run (no `lint` script) |
| `@bytebank/utils` | none | ⚪ Not run (no `lint` script) |

### Failure: `@bytebank/design-system`

- **File:** `packages/design-system/` (the package has no config file).
- **Reason:** ESLint 9 requires a flat config, and the package has none.

```text
ESLint: 9.39.4

ESLint couldn't find an eslint.config.(js|mjs|cjs) file.

From ESLint v9.0.0, the default configuration file is now eslint.config.js.
```

Note: dashboard and transactions have never been linted, because they have no `lint` script and no `eslint.config.*`.

---

## Build and bundle size

Command: `npm run build` at the root (`turbo build`). It exited with **code 0** and took 13.9 s, with no cache.

| App | Result | Compile | TypeScript |
|---|---|---|---|
| `@bytebank/shell` | ✅ Success | 4.4s | 4.4s |
| `@bytebank/dashboard` | ✅ Success | 5.4s | 3.3s |
| `@bytebank/transactions` | ✅ Success | 4.5s | 3.0s |

The packages (`design-system`, `types` and `utils`) have no `build` script.

### Route tables printed by Next

> ⚠️ Next.js 16.2.4 with Turbopack **does not print the `Size` and `First Load JS` columns**. The output only has the `Route` column, plus `Revalidate` and `Expire` for the shell. The tables below are copied exactly as printed.

**shell**

```text
@bytebank/shell:build: Route (app)                  Revalidate  Expire
@bytebank/shell:build: ┌ ○ /
@bytebank/shell:build: ├ ○ /_not-found
@bytebank/shell:build: ├ ƒ /api/auth/[...nextauth]
@bytebank/shell:build: ├ ○ /forgot-password
@bytebank/shell:build: ├ ○ /icon.svg
@bytebank/shell:build: └ ○ /sobre                           1h      1y
@bytebank/shell:build: 
@bytebank/shell:build: 
@bytebank/shell:build: ƒ Proxy (Middleware)
@bytebank/shell:build: 
@bytebank/shell:build: ○  (Static)   prerendered as static content
@bytebank/shell:build: ƒ  (Dynamic)  server-rendered on demand
```

**dashboard** (basePath `/dashboard`)

```text
@bytebank/dashboard:build: Route (app)
@bytebank/dashboard:build: ┌ ○ /
@bytebank/dashboard:build: ├ ○ /_not-found
@bytebank/dashboard:build: ├ ƒ /account
@bytebank/dashboard:build: ├ ƒ /api/auth/[...nextauth]
@bytebank/dashboard:build: ├ ○ /cards
@bytebank/dashboard:build: ├ ○ /coming-soon
@bytebank/dashboard:build: ├ ○ /investments
@bytebank/dashboard:build: ├ ○ /services
@bytebank/dashboard:build: └ ○ /transfers
@bytebank/dashboard:build: 
@bytebank/dashboard:build: 
@bytebank/dashboard:build: ○  (Static)   prerendered as static content
@bytebank/dashboard:build: ƒ  (Dynamic)  server-rendered on demand
```

**transactions** (basePath `/transactions`)

```text
@bytebank/transactions:build: Route (app)
@bytebank/transactions:build: ┌ ○ /
@bytebank/transactions:build: ├ ○ /_not-found
@bytebank/transactions:build: └ ƒ /api/auth/[...nextauth]
@bytebank/transactions:build: 
@bytebank/transactions:build: 
@bytebank/transactions:build: ○  (Static)   prerendered as static content
@bytebank/transactions:build: ƒ  (Dynamic)  server-rendered on demand
```

### Client JS size (Next 16.2.4, pre-upgrade)

Because Next did not print sizes, the `.js` files in `apps/<app>/.next/static/chunks/` were summed right after the build. Gzip was computed with `zlib` at the default level. The total covers every chunk of the app, not the First Load of a single route.

| App | JS files | Total (raw) | Total (gzip) | Largest chunk (raw / gzip) |
|---|---|---|---|---|
| shell | 14 | 714.3 KB | 215.5 KB | 222.2 KB / 69.3 KB |
| dashboard | 17 | 1070.9 KB | 314.7 KB | 361.8 KB / 98.6 KB |
| transactions | 12 | 675.9 KB | 202.7 KB | 222.2 KB / 69.3 KB |

- The largest dashboard chunk (361.8 KB raw / 98.6 KB gzip) only exists in that app. The likely but unverified explanation is Recharts, which is statically imported in `CardCharts.tsx`.
- The 222.2 KB chunk is identical in all three apps. It is probably the React/Next runtime.

### Client JS size (Next 16.4.3, refactor baseline)

After the dependency upgrade in step 0.4. Turbopack changed chunk hashing and name mangling in 16.3/16.4, so this is the reference for the refactor comparison.

Same method as above: all `.js` files in `apps/<app>/.next/static/chunks/`, summed right after `npm run build`, with gzip computed by `zlib` at the default level.

| App | JS files | Total (raw) | Total (gzip) | Largest chunk (raw / gzip) |
|---|---|---|---|---|
| shell | 12 | 628.3 KB | 194.2 KB | 224.4 KB / 70.3 KB |
| dashboard | 16 | 1022.0 KB | 306.4 KB | 358.0 KB / 98.4 KB |
| transactions | 11 | 618.1 KB | 191.7 KB | 224.4 KB / 70.3 KB |

- The largest dashboard chunk (358.0 KB raw / 98.4 KB gzip) still only exists in that app. The likely Recharts explanation above still applies and is still unverified.
- The 224.4 KB chunk is again identical in all three apps.

### Warnings

- The build emitted no warnings.
- Informational output with no impact: all three apps load `.env.local` (`- Environments: .env.local`), and daisyUI 5.5.19 prints the banner `/*! 🌼 daisyUI 5.5.19 */`.
- Outside the build, npm reported that a new major version is available (11.12.1 → 12.2.1).

> The build passes despite the package errors (see the sections below) because **no app imports `@bytebank/*`**. A search for `from '@bytebank/` in `apps/` found nothing. The apps use local copies of the components, utils and types.

---

## TypeScript in packages

| Command | Exit code | Result |
|---|---|---|
| `npx tsc --noEmit -p packages/utils` | 2 | ❌ 1 error |
| `npx tsc --noEmit -p packages/types` | 0 | ✅ No errors |

### Error in `packages/utils`

```text
packages/utils/src/transactions.ts(1,34): error TS2307: Cannot find module '@/app/dashboard/types/transaction' or its corresponding type declarations.
```

**Reason:** the package `tsconfig` inherits `paths: { "@/*": ["./src/*"] }` from `apps/shell/tsconfig.json`. That path resolves to `apps/shell/src/`, where `app/dashboard/types/transaction` does not exist. The type should come from `@bytebank/types`.

---

## @/ imports in packages

| File | Line | Import |
|---|---|---|
| `packages/utils/src/transactions.ts` | 1 | `import type { Transaction } from '@/app/dashboard/types/transaction'` |
| `packages/design-system/src/Button.tsx` | 1 | `import { cn } from '@/lib/utils/cn'` |
| `packages/design-system/src/Checkbox.tsx` | 1 | `import { cn } from '@/lib/utils/cn'` |
| `packages/design-system/src/Input.tsx` | 1 | `import { cn } from '@/lib/utils/cn'` |
| `packages/design-system/src/Link.tsx` | 4 | `import { cn } from '@/lib/utils/cn'` |
| `packages/design-system/src/ModalConfirmDelete.tsx` | 3 | `import { Button } from '@/components/ui/Button'` |
| `packages/design-system/src/ModalConfirmDelete.tsx` | 4 | `import { Modal } from '@/components/ui/Modal'` |
| `packages/design-system/src/Select.tsx` | 4 | `import { cn } from '@/lib/utils/cn'` |
| `packages/design-system/src/Toast.tsx` | 1 | `import { cn } from '@/lib/utils/cn'` |

There are **9 imports in 8 files**: 1 in `utils` and 8 in `design-system`. There are none in `types`.

All of them rely on the `@/` alias of the consuming app or of the shell, through tsconfig inheritance. This couples the packages to an app's internal structure. If an app starts importing `@bytebank/design-system` or `@bytebank/utils`, these imports will fail or resolve to the wrong file.

---

## Lighthouse (before)

Measured on Next 16.2.4, before the dependency upgrade (step 0.4). Kept for reference; the refactor comparison uses the re-measurement below.

### Methodology
- Lighthouse 13.5.0 in Chrome DevTools, Navigation mode.
- Devices: Mobile (emulated Moto G Power, simulated Slow 4G) and Desktop (emulated desktop, default desktop throttling).
- Production build via `docker compose up --build`, accessed at `http://localhost:3000`.
- Incognito window, no extensions, logged-in user.
- "Clear storage" UNCHECKED to keep the session. As a result, the HTTP cache was warm: JS bundles were served from cache, so bundle size must be compared using the build output table, not Lighthouse.
- The "after" measurement must follow exactly the same methodology.
- Date: 2026-10-29. Full (expanded) reports in `docs/fase4/lighthouse/before/`, one PDF per page and device.

### Scores
| Page | Device | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|---|
| /dashboard | Mobile | 99 | 88 | 100 | 80 |
| /transactions | Mobile | 100 | 88 | 100 | 80 |
| /dashboard | Desktop | 100 | 92 | 100 | 80 |
| /transactions | Desktop | 100 | 92 | 100 | 80 |

### Metrics
| Page | Device | FCP | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|---|---|
| /dashboard | Mobile | 0.7 s | 0.9 s | 120 ms | 0.024 | 0.8 s |
| /transactions | Mobile | 0.7 s | 0.9 s | 30 ms | 0 | 0.7 s |
| /dashboard | Desktop | 0.2 s | 0.4 s | 0 ms | 0.006 | 0.3 s |
| /transactions | Desktop | 0.2 s | 0.2 s | 0 ms | 0.011 | 0.2 s |

### Performance diagnostics
| Page | Device | JS execution time | Main-thread work | Long tasks | Legacy JS |
|---|---|---|---|---|---|
| /dashboard | Mobile | 1.3 s | 2.1 s | 6 | 14 KiB |
| /transactions | Mobile | not flagged | not flagged | 4 | 14 KiB |
| /dashboard | Desktop | 0.3 s | 0.5 s | not flagged | 14 KiB |
| /transactions | Desktop | 0.0 s | 0.3 s | not flagged | 14 KiB |

### Issues reported (to be addressed in upcoming blocks)
- Best Practices / Trust and Safety (unscored): no effective CSP against XSS, no HSTS, no COOP, no clickjacking protection (X-Frame-Options or CSP), no Trusted Types. Both pages, both devices.
- Accessibility:
  - Mobile only: aria-hidden="true" elements contain focusable descendants (likely the closed mobile MenuDrawer).
  - Both devices: insufficient background/foreground contrast. Failing elements include the active nav link (`text-success`), month headings in the statement (`text-meta-semibold text-success`), `text-text-secondary` texts and `text-primary-50` labels/headings on `bg-surface-form`.
  - Both devices: document has no `<title>`.
- SEO: document has no `<title>` and no meta description. Both pages, both devices.
- Performance:
  - Both pages: render-blocking requests, Legacy JavaScript (14 KiB), Reduce unused JavaScript/CSS, Font display (font-display swap/optional).
  - Desktop, both pages: forced reflow.
  - Layout shift culprits: /dashboard (mobile and desktop), /transactions (desktop).

## Lighthouse (refactor baseline, Next 16.4.3)

Measured after the dependency upgrade (step 0.4), with the same methodology as "Lighthouse (before)": single run per page and device, warm HTTP cache, logged-in user, incognito window, production build via Docker. This is the reference for the refactor comparison. Date: 2026-10-29. Full (expanded) reports in `docs/fase4/lighthouse/before-next-16.4/`, one PDF per page and device.

### Scores
| Page | Device | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|---|
| /dashboard | Mobile | 98 | 88 | 100 | 80 |
| /transactions | Mobile | 99 | 88 | 100 | 80 |
| /dashboard | Desktop | 100 | 92 | 100 | 80 |
| /transactions | Desktop | 100 | 92 | 100 | 80 |

### Metrics
| Page | Device | FCP | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|---|---|
| /dashboard | Mobile | 0.7 s | 0.7 s | 160 ms | 0.024 | 0.7 s |
| /transactions | Mobile | 0.7 s | 0.7 s | 130 ms | 0.024 | 0.7 s |
| /dashboard | Desktop | 0.2 s | 0.4 s | 0 ms | 0.026 | 0.3 s |
| /transactions | Desktop | 0.2 s | 0.2 s | 0 ms | 0 | 0.2 s |

### Performance diagnostics
| Page | Device | JS execution time | Main-thread work | Long tasks | Legacy JS |
|---|---|---|---|---|---|
| /dashboard | Mobile | 1.2 s | 2.1 s | 7 | 14 KiB |
| /transactions | Mobile | 0.3 s | 0.9 s | 4 | 14 KiB |
| /dashboard | Desktop | 0.3 s | 0.5 s | not flagged | 14 KiB |
| /transactions | Desktop | 0.0 s | 0.2 s | not flagged | 14 KiB |

### Issues reported
Same as "Lighthouse (before)": no new issues and none resolved by the upgrade. Forced reflow and layout shift culprits now also appear on mobile.

### Run-to-run variance
Small differences between single runs are measurement noise, not code changes. Example: /transactions Mobile TBT went from 30 ms to 130 ms and CLS from 0 to 0.024 between the two baselines, with no relevant code change on that page. Conclusions must rely on large differences and on bundle size measured on disk, which has no run-to-run variance.

### Methodology for the "after" measurement
- Same setup as above (Docker production build, incognito, logged in, "Clear storage" unchecked, expanded report).
- 3 runs per page and device; record the median of each metric.
