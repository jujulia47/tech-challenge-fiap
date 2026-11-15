# Baseline before the refactor

This page records the state of the project before any change of Phase 4, measured on 2026-10-29 with Next.js 16.2.4 on Windows 11. The results after the work are in [performance.md](performance.md), [accessibility.md](accessibility.md) and [ci.md](ci.md).

## Lint, build and TypeScript

`npm run lint` failed. The design system had no ESLint 9 flat config, and the dashboard and transactions zones had never been linted, since they had no `lint` script and no config. Only the shell passed.

`npm run build` passed for the three apps, but no app imported `@bytebank/*`: they all ran their own copies of the components, helpers and types. That is why the broken packages did not break the build.

`packages/utils` did not compile. Its `tsconfig` inherited the `@/` alias of the shell, so `@/app/dashboard/types/transaction` resolved inside `apps/shell` and was not found. Nine `@/` imports in eight package files tied the packages to the structure of one app.

## Client JavaScript

Next.js 16 with Turbopack does not print the size of each route, so the `.js` files under `apps/<app>/.next/static/chunks/` were summed after the build, gzipped with `zlib`. These are the totals after the dependency upgrade to Next.js 16.4.3 ([ci.md](ci.md#dependency-audit)), the reference for the comparison:

| App | JS files | Total (gzip) | Largest chunk (gzip) |
|---|---|---|---|
| shell | 12 | 194.2 KB | 70.3 KB |
| dashboard | 16 | 306.4 KB | 98.4 KB |
| transactions | 11 | 191.7 KB | 70.3 KB |

The largest dashboard chunk existed only in that app and was most likely Recharts, which `CardCharts.tsx` imported statically. The First Load JS of each route, measured later with the same method, is in [performance.md](performance.md#lazy-loading).

## Lighthouse

Lighthouse 13.5.0 in Chrome DevTools, Navigation mode, on the production build in Docker, in an incognito window, logged in. "Clear storage" was unchecked to keep the session, so the HTTP cache was warm. Mobile is the emulated Moto G Power with simulated Slow 4G. One run per page and device, after the upgrade to Next.js 16.4.3. The reports are in [lighthouse/before/](lighthouse/before/), as `dashboard-desktop.pdf`, `dashboard-mobile.pdf`, `transactions-desktop.pdf` and `transactions-mobile.pdf`.

| Page | Device | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|---|
| /dashboard | Mobile | 98 | 88 | 100 | 80 |
| /transactions | Mobile | 99 | 88 | 100 | 80 |
| /dashboard | Desktop | 100 | 92 | 100 | 80 |
| /transactions | Desktop | 100 | 92 | 100 | 80 |

| Page | Device | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|
| /dashboard | Mobile | 0.7 s | 0.7 s | 160 ms | 0.024 |
| /transactions | Mobile | 0.7 s | 0.7 s | 130 ms | 0.024 |
| /dashboard | Desktop | 0.2 s | 0.4 s | 0 ms | 0.026 |
| /transactions | Desktop | 0.2 s | 0.2 s | 0 ms | 0 |

An earlier run on Next.js 16.2.4 gave the same scores within one or two points. Its reports were not kept.

Lighthouse reported these issues on both pages:

- No effective CSP, HSTS, COOP or clickjacking protection.
- Insufficient contrast on the active menu link, the month headings of the statement, the secondary texts and the labels on gray cards.
- On mobile, focusable elements inside an `aria-hidden` element: the closed menu drawer.
- No `<title>` and no meta description.
- Render-blocking requests, unused JavaScript and CSS, font display, and layout shifts on the dashboard.

The headers, the contrast, the drawer, the titles and the layout shifts were fixed later ([security.md](security.md#security-headers-and-csp), [accessibility.md](accessibility.md), [performance.md](performance.md)).
