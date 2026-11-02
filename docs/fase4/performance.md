# Phase 4: performance (Step 6a)

The main result: the First Load JS of `/dashboard` fell by 34%, from 279.4 KB to 185.4 KB gzip, because Recharts left the first load. The other routes barely changed: the lazy modals move the moment of a small download, they do not shrink the page.

## First Load JS: before and after

Next.js 16 with Turbopack does not print this column, so it was calculated from the build manifests: the root main files, plus the chunks of the page, of its layouts and of the root `not-found`. Sizes are gzip, with `zlib` at the default level. The polyfill chunk (38.7 KB) is left out, because it is `nomodule` and modern browsers skip it.

The method was checked against the real pages: the `<script>` tags in the HTML of `/`, `/dashboard` and `/transactions` give the same numbers as the table. "Before" is the previous commit, built with the same method.

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

### Why only one route improved

The modals are small: most have 0.5 to 3 KB of their own code, and the largest is signup. What they share stays in the first load for other reasons:

- The root layout of each app has `SessionProvider` and `IdleSessionGuard`, so `next-auth/react` and `Modal` load on every route.
- `Select`, `Input` and `Button` are also used by the forms of the pages.

More chunks also compress a little worse, and `next/dynamic` adds its own runtime. That is the increase of about 1 KB in the shell and in the extract. The modals stayed lazy anyway, as a price accepted for code that most visits never open. There is no gain in the first load to report there.

## What became lazy

| Code | Size (gzip) | Loaded when |
|---|---|---|
| Recharts, in `FinancialCharts` | 94.7 KB | The dashboard opens, in parallel with the data |
| `ModalTransactionDetail`, one component in the design system since step 6b | 0.6 to 1 KB | First opened, or on intent |
| `ModalEditTransaction` | about 1 KB | First opened, or on intent |
| `ModalConfirmDelete` | 0.5 KB | First opened, or on intent |
| `AttachmentViewer` | 0.8 KB | First opened, or on intent |
| `ModalLogin` | about 3 KB | First opened, or on intent |
| `ModalCadastro`, with `PasswordField` | up to about 15 KB | First opened, or on intent |

Not lazy, on purpose:

- **`PasswordField` on `/redefinir-senha`:** the field is the page, so it would only arrive later.
- **The logout modal:** `Modal` and `Button` are in the first load anyway, so there is nothing left to split.
- **`rxjs` (32.3 KB in the extract):** the search runs as soon as the page opens.
- **"Esqueci a senha":** it is a page, not a modal. It already loads on its own.

### Two details of the lazy modals

`MountOnceOpen`, now used inside `lazyModal`, keeps a modal unmounted until it first opens. `next/dynamic` starts the download when the component renders, so a modal that is always mounted would download at once.

After the first opening the modal stays mounted. Unmounting it on close would lose its state, and the countdown of a blocked login lives there.

`@bytebank/design-system` got `"sideEffects": false` and an export for `ModalConfirmDelete`. Without the export, the dynamic import would bring the whole barrel.

### No jump when the chart arrives

`ChartsSkeleton` has the same titles and heights as the charts. The numbers given to Recharts come from the same file, so they do not drift apart. It also replaces the old "Carregando gráficos..." line, which was shorter than the charts and made the page jump too.

## What is preloaded

| Signal | What | Why |
|---|---|---|
| Pointer or focus on a button that opens a modal | The chunk of that modal | The time between the intent and the click pays for the download, so the modal opens at once |
| Pointer or focus on 3 meses, 6 meses or Tudo | `getChartData` of that period, with `usePrefetch` | The click reads the cache and sends no request |
| Next.js, when the link appears | `prefetch` on the menu links of the dashboard zone and on `/sobre` | Few pages, all small, and the click keeps the document |

The pointer events cover mouse, pen and touch, and focus covers the keyboard.

The prefetch uses `chartDataFilters`, the same function as the query, because the RTK Query cache only matches on equal arguments. It also carries the active type filter, since the click would ask for it. The data stays in the cache for the default 60 s, and a write invalidates it.

The chunk of the charts is preloaded when the card mounts, so it does not wait for the data to arrive before starting.

### Between zones: no preload

Moving between shell, dashboard and transactions is a full page load, and it was left that way:

- **The HTML cannot be reused.** With the nonce, every page answers `Cache-Control: no-store`, so a `<link rel="prefetch">` of the document would be thrown away. Keeping it would also mean reusing a nonce, which must be unique per response.
- **The chunks are per zone.** They live under `/dashboard/_next` and `/transactions/_next`, so the same code at another URL is another download. Preloading them would cost up to about 190 KB on visits that may never cross, on every page with a menu.
- **Speculation rules** would run the other zone in the background, with its requests and its session checks, for a navigation that is already fast.

## The trade from step 3.3: no page is static

The CSP nonce only exists per request, so all three root layouts call `connection()`, and every page is rendered on demand. The build table shows `ƒ` on every route.

Median of 25 requests to the shell in Docker, on the same machine, with no network:

| Resource | First byte | `Cache-Control` |
|---|---|---|
| `/` | 15.3 ms | `no-store` |
| `/sobre` | 17.5 ms | `no-store` |
| `/forgot-password` | 13.2 ms | `no-store` |
| A static chunk | 5.4 ms | `public, immutable` |

Rendering adds about 10 ms here. These numbers are the best case, with no network and a warm server. In production the real cost is what they do not show: a CDN cannot answer for these pages, so every visit reaches the server, and a serverless function can start cold. That has not been measured.

It stayed that way because it protects something more important. The nonce is what lets the CSP refuse any script that was not sent by the server, without `unsafe-inline`, and this is a bank: an injected script could read a balance or act in the session. The pages are small and most of them need the session anyway, so few of them could be cached by a CDN. The JS and CSS chunks stay immutable and cached.

The dynamic chunks work with the nonce because of `'strict-dynamic'`: a script with the nonce can load others. No CSP violation appeared in the browser run.

## Limits

- A chunk that fails to download no longer takes the page down: since step 6b, `lazyPart` and `lazyModal` show "Não foi possível carregar esta parte." with "Tentar novamente". The Turbopack runtime forgets a failed chunk, but React.lazy keeps the failure, so a retry creates a new lazy component.
- The first opening on a slow connection, without a previous intent, shows nothing until the chunk arrives. The focus stays on the button until then.

## LCP on mobile: a fair comparison (Step 6c)

A manual Lighthouse run gave an LCP of 2.6 s on `/dashboard` and 3.2 s on `/transactions`, against 0.7 s in `baseline.md`. Most of that distance is the method: the baseline ran with a warm HTTP cache. With the same method there was no regression. With a cold cache there was one, and it was fixed in part.

### Method

`baseline.md` records Lighthouse 13.5.0 in DevTools, Navigation mode, on a production build in Docker, in an incognito window, logged in, with "Clear storage" unchecked, so the HTTP cache was warm. Mobile is the emulated Moto G Power with simulated Slow 4G, and each page had a single run.

Here: Lighthouse 13.5.0 by command line, with `--disable-storage-reset` for the warm cache and without it for the cold one. The session survives both. Same simulation (150 ms RTT, 1.6 Mbps, CPU 4x), logged in, 3 runs, median. The baseline commit, `8afbc65`, ran in Docker from a copy, on the same machine, on the same day.

### Mobile, median of 3

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

Runs of the cold LCP on `/transactions` after the fixes: 2.21, 2.57 and 1.73 s, so this page still varies. An earlier build with the same fixes gave 1.73, 1.87 and 1.89 s.

Desktop after the fixes, median of 3: LCP of 0.21 s and 0.20 s with a warm cache, and 0.58 s and 0.43 s with a cold one. Performance is 100 in all four. The desktop was not measured on the baseline commit in this step.

### Cause

Nothing got slower for real on this machine. The LCP observed with no simulation stayed between 99 and 272 ms on both versions, and the highest value is from the baseline. The difference is in what the simulation charges for, on a cold cache:

- **The LCP element was an icon.** It was `account_circle` on the dashboard and `arrow_drop_down` on the extract, on the baseline commit too. An icon depends on the font, of 126 KB, which is the largest download of the page.
- **The FCP jumped between two levels.** About 0.8 to 1.1 s or about 1.8 to 2.0 s, even with no code change between runs. The baseline had one such run too, of 1.86 s. The likely reason, inferred from this pattern and not from the code of the simulator, is that it counts a download when it ends before the local first paint. Our local paint moved from about 110 ms to about 140 ms, so more downloads, the font among them, fall before it.
- **What moved it:** the CSS grew from 47 KB to 76 KB, and the HTML from 9 KB to 19 KB, with the inline data of the dynamic render and the nonce on each tag.

### What was fixed

| Fix | Effect | Mobile cold LCP |
|---|---|---|
| Starting point | | 3.09 s / 2.73 s |
| CSS: `include: modal, progress` in daisyUI | 76 KB to 34 KB on the dashboard, 64 KB to 28 KB on the extract. No reliable gain alone: the runs still jumped (1.87, 3.11, 1.88 s) | 1.88 s / 2.89 s |
| Icon font: subset, preload and `display: block` | 125 KB to 3 KB. The runs became stable, and the LCP element became real content: the balance and the title | 2.03 s / 1.87 s |

The cold download of the dashboard fell from 480 KB to 349 KB, and that of the extract from 369 KB to 242 KB.

The CSS had grown because Tailwind reads words such as `menu`, `tab` and `list` in the code as classes, and daisyUI answers with a whole component. The project only uses `modal` and `progress`.

The nonce stayed. Against the baseline, the cold LCP is still 0.25 s higher on the dashboard and 0.46 s on the extract, which the variation of that page makes hard to pin down. What remains is the HTML per request and the text font, of 24 KB. Critical CSS was left out: with 8 KB of CSS, it would add a step to the build for little.

### Icon font

The apps load a subset of Material Icons with the 38 icons in use. The list is `packages/design-system/fonts/icons.txt`, and the script is `packages/design-system/scripts/subset-icons.py`. The source font comes from `@fontsource/material-icons`, which is why that package stays in the project.

To use a new icon:

1. Add its name to `icons.txt`.
2. Run this at the root of the repository, with `npm install` done. It needs Docker, and nothing is installed on the machine or in the project.

```sh
docker run --rm -v "${PWD}:/work" -w /work python:3.12-alpine sh -c "pip install --quiet --root-user-action=ignore --disable-pip-version-check fonttools brotli && python packages/design-system/scripts/subset-icons.py"
```

In Git Bash on Windows, put `MSYS_NO_PATHCONV=1` before `docker`. In PowerShell it runs as it is.

3. Commit `material-icons-subset.woff2`, `icons.txt` and `icons.built.txt`.

`iconFont.test.ts` fails when the code uses an icon that is not in the list, or when the list changed and the font was not generated again. Its message points here. The script refuses a name that Material Icons does not have, and refuses to save a font that lost a ligature, because that icon would show as text.

The font loads through `next/font/local`, which adds the preload with the nonce. It uses `display: block`, because with `swap` the name of the icon shows as text on a slow connection.

## Lighthouse (depois)

Lighthouse 13.5.0 in DevTools, Navigation mode, on the production build in Docker, logged in. Mobile is the emulated Moto G Power with Slow 4G, and desktop uses the desktop throttling. There were 3 runs for each page and device, and each cell is the median of its metric across the 3 runs, so one row may mix runs. The 12 reports are in `docs/fase4/lighthouse/after/`. The baseline is "Lighthouse (refactor baseline, Next 16.4.3)" in `baseline.md`, with a single run.

### Scores

| Page | Device | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|---|
| /dashboard | Mobile | 98 → **96** | 88 → **100** | 100 → **100** | 80 → **100** |
| /transactions | Mobile | 99 → **99** | 88 → **100** | 100 → **100** | 80 → **100** |
| /dashboard | Desktop | 100 → **100** | 92 → **100** | 100 → **100** | 80 → **100** |
| /transactions | Desktop | 100 → **100** | 92 → **100** | 100 → **100** | 80 → **100** |

### Metrics

| Page | Device | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|
| /dashboard | Mobile | 0.7 s → **1.1 s** | 0.7 s → **2.3 s** | 160 ms → **130 ms** | 0.024 → **0.004** |
| /transactions | Mobile | 0.7 s → **1.1 s** | 0.7 s → **2.0 s** | 130 ms → **10 ms** | 0.024 → **0** |
| /dashboard | Desktop | 0.2 s → **0.3 s** | 0.4 s → **0.6 s** | 0 ms → **0 ms** | 0.026 → **0.001** |
| /transactions | Desktop | 0.2 s → **0.2 s** | 0.2 s → **0.4 s** | 0 ms → **0 ms** | 0 → **0** |

The runs, in the order of the files:

| Page | Device | Performance | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|
| /dashboard | Mobile | 91, 98, 96 | 0.8, 1.1, 1.1 s | 2.3, 2.3, 2.5 s | 310, 60, 130 ms | 0.003, 0.004, 0.004 |
| /transactions | Mobile | 99, 98, 100 | 1.1, 1.1, 1.1 s | 2.0, 2.3, 1.7 s | 10, 10, 10 ms | 0, 0, 0 |
| /dashboard | Desktop | 100, 100, 100 | 0.3, 0.3, 0.3 s | 0.6, 0.5, 0.6 s | 0, 0, 0 ms | 0.001, 0.001, 0.001 |
| /transactions | Desktop | 100, 100, 100 | 0.3, 0.3, 0.2 s | 0.4, 0.4, 0.4 s | 0, 0, 0 ms | 0, 0, 0 |

### Reading the LCP

The mobile LCP of these runs, 2.3 s and 2.0 s, matches the cold cache case of the 6c table: 2.01 s and 2.21 s after the fixes, against 3.09 s and 2.73 s before them. The baseline had a warm cache, where the same code gives 0.75 s and 0.69 s. So the higher LCP and FCP in the table above compare a cold cache with a warm one, not one version of the code with another. The fair comparison of LCP is the one in "LCP on mobile: a fair comparison (Step 6c)", where both versions were measured with the same cache.

The desktop values, 0.6 s and 0.4 s, are also close to the cold cache desktop of step 6c (0.58 s and 0.43 s). This one is an observation from the numbers: the reports do not record the cache.

The other columns do not depend on that. Accessibility went from 88 and 92 to 100 on every page and device. SEO went from 80 to 100, with the titles and descriptions of step 6b. TBT and CLS fell on mobile.
