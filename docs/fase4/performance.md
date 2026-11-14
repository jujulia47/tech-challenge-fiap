# Performance: lazy loading, preloading and cache

Requirements: lazy loading and preloading, and cache. The main result: the First Load JS of `/dashboard` fell by 34%, from 279.4 KB to 185.4 KB gzip, because Recharts left the first load. Lighthouse went to 100 in accessibility and SEO on every page and device, with performance between 96 and 100 ([below](#lighthouse-before-and-after)). The measurements before the refactor are in [baseline.md](baseline.md), and the PDF reports in [lighthouse/](lighthouse/).

## Lazy loading

| Code | Size (gzip) | Loaded when |
|---|---|---|
| Recharts, in `FinancialCharts` | 94.7 KB | The dashboard opens, in parallel with the data |
| `ModalTransactionDetail` | 0.6 to 1 KB | First opened, or on intent |
| `ModalEditTransaction` | about 1 KB | First opened, or on intent |
| `ModalConfirmDelete` | 0.5 KB | First opened, or on intent |
| `AttachmentViewer` | 0.8 KB | First opened, or on intent |
| `ModalLogin` | about 3 KB | First opened, or on intent |
| `ModalCadastro`, with `PasswordField` | up to about 15 KB | First opened, or on intent |

How it works (`packages/design-system/src/lazy.tsx`, `transactionModals.ts`):

- `lazyModal` and `lazyPart` wrap `next/dynamic`. `MountOnceOpen` keeps a modal unmounted until it first opens, because `next/dynamic` starts the download when the component renders, so an always-mounted modal would download at once. After the first opening the modal stays mounted: unmounting it on close would lose its state, such as the countdown of a blocked login.
- `@bytebank/design-system` has `"sideEffects": false` and its own export for `ModalConfirmDelete`, so a dynamic import does not bring the whole barrel.
- **A chunk that fails does not take the page down.** `ChunkBoundary` shows "Não foi possível carregar esta parte." with "Tentar novamente". The Turbopack runtime forgets a failed chunk, but React.lazy keeps the failure, so a retry creates a new lazy component.
- **No jump when the chart arrives.** `ChartsSkeleton` has the same titles and heights as the charts, from the same constants given to Recharts.

Not lazy, on purpose:

- **`PasswordField` on `/redefinir-senha`:** the field is the page, so it would only arrive later.
- **The logout modal:** `Modal` and `Button` are in the first load anyway.
- **`rxjs` (32.3 KB in the extract):** the search runs as soon as the page opens.
- **"Esqueci a senha":** it is a page, so it already loads on its own.

## Preloading

| Signal | What | Why |
|---|---|---|
| Pointer or focus on a button that opens a modal | The chunk of that modal | The time between the intent and the click pays for the download, so the modal opens at once |
| Pointer or focus on 3 meses, 6 meses or Tudo | `getChartData` of that period, with `usePrefetch` | The click reads the cache and sends no request |
| The chart card mounts | The chunk of the charts | It does not wait for the data before starting |
| A menu link appears | Next.js `prefetch` on the menu links of the dashboard zone and on `/sobre` | Few pages, all small, and the click keeps the document |

The pointer events cover mouse, pen and touch, and focus covers the keyboard. The prefetch of the chart uses `chartDataFilters`, the same function as the query, because the RTK Query cache only matches equal arguments; it also carries the active type filter.

**Between zones: no preload.** Moving between shell, dashboard and transactions is a full page load, and it stays that way:

- **The HTML cannot be reused.** With the nonce, every page answers `Cache-Control: no-store`, so a prefetched document would be thrown away, and reusing it would mean reusing a nonce.
- **The chunks are per zone**, under `/dashboard/_next` and `/transactions/_next`. Preloading them would cost up to about 190 KB on visits that may never cross, on every page with a menu.
- **Speculation rules** would run the other zone in the background, with its requests and session checks, for a navigation that is already fast.

## Cache

| What | Cache | Why |
|---|---|---|
| Server data in the browser | RTK Query, 60 s by default, invalidated by every write ([state-management.md](state-management.md)) | The screens share one copy; a write refreshes every screen that uses it |
| A prefetched chart period | The same RTK Query entry | The click reuses it |
| API responses | `Cache-Control: no-store`, errors included | Financial data stays out of shared and browser caches ([bff.md](bff.md#security-rules)) |
| HTML pages | `no-store`, rendered per request | The CSP nonce ([below](#no-page-is-static)) |
| JS, CSS and font chunks | `public, immutable` | Content-hashed names, so they never go stale |

### No page is static

The CSP nonce only exists per request ([security.md](security.md#security-headers-and-csp)), so the three root layouts call `connection()` and every page is rendered on demand: the build table shows `ƒ` on every route.

Median of 25 requests to the shell in Docker, on the same machine, with no network:

| Resource | First byte | `Cache-Control` |
|---|---|---|
| `/` | 15.3 ms | `no-store` |
| `/sobre` | 17.5 ms | `no-store` |
| `/forgot-password` | 13.2 ms | `no-store` |
| A static chunk | 5.4 ms | `public, immutable` |

Rendering adds about 10 ms here, in the best case. In production the real cost is what this does not show: a CDN cannot answer for these pages, so every visit reaches the server, and a serverless function can start cold. That has not been measured.

It stays that way because it protects something more important. The nonce lets the CSP refuse any script the server did not send, without `unsafe-inline`, and this is a bank: an injected script could read a balance or act in the session. Most pages need the session anyway, so few could be cached by a CDN. The dynamic chunks work with the nonce because of `'strict-dynamic'`, and no CSP violation appears in the browser.

## First Load JS: before and after

Next.js 16 with Turbopack does not print this column, so it was calculated from the build manifests: the root main files, plus the chunks of the page, its layouts and the root `not-found`. Sizes are gzip, with `zlib` at the default level. The polyfill chunk (38.7 KB) is left out, because it is `nomodule` and modern browsers skip it. The method was checked against the `<script>` tags in the HTML of `/`, `/dashboard` and `/transactions`. "Before" is the commit before lazy loading, built with the same method.

| App | Route | Before | After | Difference |
|---|---|---|---|---|
| shell | `/` | 158.1 KB | 159.2 KB | +1.1 KB |
| shell | `/sobre` | 157.7 KB | 158.5 KB | +0.8 KB |
| shell | `/forgot-password` | 158.1 KB | 159.7 KB | +1.6 KB |
| shell | `/redefinir-senha` | 158.2 KB | 160.8 KB | +2.6 KB |
| shell | `/_not-found` | 154.6 KB | 152.9 KB | -1.7 KB |
| dashboard | `/` | 279.4 KB | 185.4 KB | **-94.0 KB (-34%)** |
| dashboard | `/account` | 179.9 KB | 179.1 KB | -0.8 KB |
| dashboard | `/cards` | 181.5 KB | 180.2 KB | -1.3 KB |
| dashboard | `/coming-soon` | 179.3 KB | 178.0 KB | -1.3 KB |
| dashboard | `/investments` | 180.3 KB | 179.0 KB | -1.3 KB |
| dashboard | `/services` | 180.3 KB | 179.0 KB | -1.3 KB |
| dashboard | `/transfers` | 179.3 KB | 178.0 KB | -1.3 KB |
| dashboard | `/_not-found` | 179.3 KB | 178.0 KB | -1.3 KB |
| transactions | `/` | 188.3 KB | 189.1 KB | +0.8 KB |
| transactions | `/_not-found` | 184.7 KB | 183.6 KB | -1.1 KB |

All the chunks of each app, loaded or not:

| App | Before | After |
|---|---|---|
| shell | 12 files, 207.0 KB | 19 files, 231.5 KB |
| dashboard | 15 files, 320.9 KB | 21 files, 326.3 KB |
| transactions | 11 files, 230.4 KB | 15 files, 230.0 KB |

**Why only one route improved.** The modals are small (0.5 to 3 KB of their own code, the largest being the registration), and what they share stays in the first load for other reasons: the root layout of each app has `SessionProvider` and `IdleSessionGuard`, so `next-auth/react` and `Modal` load everywhere, and `Select`, `Input` and `Button` are used by the forms of the pages. More chunks also compress a little worse, and `next/dynamic` adds its runtime: that is the increase of about 1 KB in the shell and the extract. The modals stayed lazy anyway, as a price accepted for code that most visits never open.

## LCP on mobile: a fair comparison

A manual Lighthouse run after lazy loading gave an LCP of 2.6 s on `/dashboard` and 3.2 s on `/transactions`, against 0.7 s in the baseline. Most of that distance was the method: the baseline ran with a warm HTTP cache. With the same method there was no regression; with a cold cache there was one, and it was fixed in part.

**Method.** The baseline: Lighthouse 13.5.0 in DevTools, Navigation mode, production build in Docker, incognito, logged in, "Clear storage" unchecked (warm cache), Moto G Power with simulated Slow 4G, one run per page. Here: Lighthouse 13.5.0 by command line, with `--disable-storage-reset` for the warm cache and without it for the cold one; the session survives both. Same simulation (150 ms RTT, 1.6 Mbps, CPU 4x), logged in, 3 runs, median. The baseline commit, `8afbc65`, ran in Docker from a copy, on the same machine, on the same day.

| Page | Cache | Metric | Baseline `8afbc65` | Before the fixes | After the fixes |
|---|---|---|---|---|---|
| `/dashboard` | Warm | LCP | 0.85 s | 0.79 s | 0.75 s |
| `/transactions` | Warm | LCP | 0.74 s | 0.67 s | 0.69 s |
| `/dashboard` | Cold | LCP | 1.76 s | **3.09 s** | **2.01 s** |
| `/transactions` | Cold | LCP | 1.75 s | **2.73 s** | **2.21 s** |
| `/dashboard` | Cold | FCP | 0.80 s | 1.98 s | 1.08 s |
| `/transactions` | Cold | FCP | 0.80 s | 1.68 s | 0.77 s |
| `/dashboard` | Cold | Performance | 98 | 88 | 99 |
| `/transactions` | Cold | Performance | 99 | 95 | 99 |

Runs of the cold LCP on `/transactions` after the fixes: 2.21, 2.57 and 1.73 s, so this page still varies; an earlier build with the same fixes gave 1.73, 1.87 and 1.89 s. Desktop after the fixes, median of 3: LCP of 0.21 s and 0.20 s with a warm cache, 0.58 s and 0.43 s with a cold one, and performance 100 in all four (the desktop was not measured on the baseline commit here).

**Cause.** Nothing got slower for real: the LCP observed with no simulation stayed between 99 and 272 ms on both versions, the highest on the baseline. The difference was in what the simulation charges for, on a cold cache:

- **The LCP element was an icon**, `account_circle` on the dashboard and `arrow_drop_down` on the extract, on the baseline too. An icon depends on the font, then 126 KB, the largest download of the page.
- **The FCP jumped between two levels**, about 0.8 to 1.1 s or about 1.8 to 2.0 s, with no code change between runs (the baseline had one such run too, of 1.86 s). The likely reason, inferred from the pattern and not from the code of the simulator, is that it counts a download when it ends before the local first paint; the local paint moved from about 110 to about 140 ms, so more downloads, the font among them, fell before it.
- **What moved it:** the CSS grew from 47 KB to 76 KB, and the HTML from 9 KB to 19 KB, with the inline data of the dynamic render and the nonce on each tag.

**What was fixed.**

| Fix | Effect | Mobile cold LCP (dashboard / extract) |
|---|---|---|
| Starting point | | 3.09 s / 2.73 s |
| CSS: `include: modal, progress` in daisyUI | 76 KB to 34 KB on the dashboard, 64 KB to 28 KB on the extract. No reliable gain alone: the runs still jumped (1.87, 3.11, 1.88 s) | 1.88 s / 2.89 s |
| Icon font: subset, preload and `display: block` | 125 KB to 3 KB. The runs became stable, and the LCP element became real content: the balance and the title | 2.03 s / 1.87 s |

The cold download of the dashboard fell from 480 KB to 349 KB, and that of the extract from 369 KB to 242 KB. The CSS had grown because Tailwind reads words such as `menu`, `tab` and `list` in the code as classes, and daisyUI answers with a whole component; the project only uses `modal` and `progress`.

The nonce stayed. Against the baseline, the cold LCP is still 0.25 s higher on the dashboard and 0.46 s on the extract, which the variation of that page makes hard to pin down. What remains is the HTML per request and the text font, of 24 KB. Critical CSS was left out: with 8 KB of CSS, it would add a build step for little.

## Icon font

The apps load a subset of Material Icons with the 38 icons in use. The list is `packages/design-system/fonts/icons.txt`, and the script `packages/design-system/scripts/subset-icons.py`. The source font comes from `@fontsource/material-icons`, which is why that package stays.

To use a new icon:

1. Add its name to `icons.txt`.
2. Run this at the root of the repository, with `npm install` done. It needs Docker; nothing is installed on the machine or in the project.

   ```sh
   docker run --rm -v "${PWD}:/work" -w /work python:3.12-alpine sh -c "pip install --quiet --root-user-action=ignore --disable-pip-version-check fonttools brotli && python packages/design-system/scripts/subset-icons.py"
   ```

   In Git Bash on Windows, put `MSYS_NO_PATHCONV=1` before `docker`. In PowerShell it runs as it is.

3. Commit `material-icons-subset.woff2`, `icons.txt` and `icons.built.txt`.

`iconFont.test.ts` fails when the code uses an icon that is not in the list, or when the list changed and the font was not generated again, and its message points here. The script refuses a name that Material Icons does not have, and refuses to save a font that lost a ligature, because that icon would show as text. The font loads through `next/font/local`, which adds the preload with the nonce, with `display: block`: with `swap`, the name of the icon shows as text on a slow connection. All icons are `aria-hidden` ([accessibility.md](accessibility.md)).

## Lighthouse: before and after

Lighthouse 13.5.0 in DevTools, Navigation mode, on the production build in Docker, logged in. Mobile is the emulated Moto G Power with Slow 4G; desktop uses the desktop throttling. 3 runs per page and device, and each cell is the median of its metric across the 3 runs, so one row may mix runs. "Before" is "Lighthouse (refactor baseline, Next 16.4.3)" in [baseline.md](baseline.md), a single run with a warm cache, with its reports in [lighthouse/before/](lighthouse/before/).

**The PDF kept for each page and device is the median run**, in [lighthouse/after/](lighthouse/after/), with the same four names as the "before" folder: the run whose Performance score is the median of the 3, and on a tie the one with the median LCP (on a full tie, the first run). The tables below keep the medians of every metric and all the runs, so a cell may differ from the kept PDF. The kept runs: dashboard mobile run 3 (96), transactions mobile run 1 (99), dashboard desktop run 1 and transactions desktop run 1 (all three runs of each desktop page scored 100; dashboard desktop runs 1 and 3 tied on every metric, and the three transactions desktop runs tied on LCP).

| Page | Device | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|---|
| /dashboard | Mobile | 98 → **96** | 88 → **100** | 100 → **100** | 80 → **100** |
| /transactions | Mobile | 99 → **99** | 88 → **100** | 100 → **100** | 80 → **100** |
| /dashboard | Desktop | 100 → **100** | 92 → **100** | 100 → **100** | 80 → **100** |
| /transactions | Desktop | 100 → **100** | 92 → **100** | 100 → **100** | 80 → **100** |

| Page | Device | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|
| /dashboard | Mobile | 0.7 s → **1.1 s** | 0.7 s → **2.3 s** | 160 ms → **130 ms** | 0.024 → **0.004** |
| /transactions | Mobile | 0.7 s → **1.1 s** | 0.7 s → **2.0 s** | 130 ms → **10 ms** | 0.024 → **0** |
| /dashboard | Desktop | 0.2 s → **0.3 s** | 0.4 s → **0.6 s** | 0 ms → **0 ms** | 0.026 → **0.001** |
| /transactions | Desktop | 0.2 s → **0.2 s** | 0.2 s → **0.4 s** | 0 ms → **0 ms** | 0 → **0** |

The three runs, in the order they were made (run 1, 2, 3):

| Page | Device | Performance | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|
| /dashboard | Mobile | 91, 98, 96 | 0.8, 1.1, 1.1 s | 2.3, 2.3, 2.5 s | 310, 60, 130 ms | 0.003, 0.004, 0.004 |
| /transactions | Mobile | 99, 98, 100 | 1.1, 1.1, 1.1 s | 2.0, 2.3, 1.7 s | 10, 10, 10 ms | 0, 0, 0 |
| /dashboard | Desktop | 100, 100, 100 | 0.3, 0.3, 0.3 s | 0.6, 0.5, 0.6 s | 0, 0, 0 ms | 0.001, 0.001, 0.001 |
| /transactions | Desktop | 100, 100, 100 | 0.3, 0.3, 0.2 s | 0.4, 0.4, 0.4 s | 0, 0, 0 ms | 0, 0, 0 |

**Reading the LCP.** The mobile LCP of these runs, 2.3 s and 2.0 s, matches the cold cache case of the comparison above (2.01 s and 2.21 s after the fixes, against 3.09 s and 2.73 s before them). The baseline had a warm cache, where the same code gives 0.75 s and 0.69 s. So the higher LCP and FCP in this table compare a cold cache with a warm one, not one version of the code with another; the fair comparison is [the one above](#lcp-on-mobile-a-fair-comparison). The desktop values, 0.6 s and 0.4 s, are also close to the cold desktop (0.58 s and 0.43 s); this one is an inference from the numbers, since the reports do not record the cache.

The other columns do not depend on the cache: accessibility went from 88 and 92 to 100, SEO from 80 to 100 with the titles and descriptions ([accessibility.md](accessibility.md)), and TBT and CLS fell on mobile.

## How to validate

- **First Load JS:** `npm run build`, then sum the chunks listed for each route in `apps/<app>/.next` manifests, gzipped; or compare the `<script>` tags of the page HTML.
- **Lazy modals:** DevTools → Network, filter JS: opening the dashboard downloads no modal chunk; hovering "Ver detalhes" downloads it before the click.
- **Chart prefetch:** hover "6 meses": a `chart-data?period=6` request goes out; the click sends none.
- **Lighthouse:** Docker build, incognito, logged in, mobile and desktop, as described above.
- **Headers:** `curl -sI http://localhost:3000/` shows `no-store`; a chunk under `/_next/static` shows `immutable`.

## Known limits

- The first opening of a modal on a slow connection, with no intent before, shows nothing until the chunk arrives. The focus stays on the button until then.
- The cost of the per-request render in production (cold starts, no CDN for HTML) has not been measured.
