# Performance: lazy loading, preloading and cache

Recharts and the modals left the first load, so the First Load JS of `/dashboard` fell from 279.4 KB to 185.4 KB gzip. Lighthouse went from 88 to 100 in accessibility and from 80 to 100 in SEO, with performance between 96 and 100 ([below](#lighthouse-before-and-after)). The starting point is in [baseline.md](baseline.md), and the reports in [lighthouse/](lighthouse/).

## Lazy loading

| Code | Size (gzip) | Loaded when |
|---|---|---|
| Recharts, in `FinancialCharts` | 94.7 KB | The dashboard opens, in parallel with the data |
| `ModalTransactionDetail`, `ModalEditTransaction`, `ModalConfirmDelete`, `AttachmentViewer` | 0.5 to 1 KB each | First opened, or on intent |
| `ModalLogin` | about 3 KB | First opened, or on intent |
| `ModalCadastro`, with `PasswordField` | up to about 15 KB | First opened, or on intent |

`lazyModal` and `lazyPart` (`packages/design-system/src/lazy.tsx`) wrap `next/dynamic`. `MountOnceOpen` keeps a modal unmounted until it first opens, because `next/dynamic` downloads as soon as the component renders. After that the modal stays mounted, so it keeps its state, such as the countdown of a blocked login. The design system declares `"sideEffects": false` and exports `ModalConfirmDelete` on its own, so a dynamic import does not pull the whole barrel.

A chunk that fails to download shows "Não foi possível carregar esta parte." with "Tentar novamente" (`ChunkBoundary`), and the rest of the page keeps working. `ChartsSkeleton` has the same titles and heights as the charts, so the page does not jump when they arrive.

The other routes barely changed, within about 2 KB either way. The root layout of each app already loads `SessionProvider`, `IdleSessionGuard` and `Modal`, and the forms use `Select`, `Input` and `Button`, so the small modals had little left to remove.

Some code stays in the first load on purpose. `PasswordField` on `/redefinir-senha` is the page itself. The logout modal only needs `Modal` and `Button`, which are already loaded. `rxjs` runs the search as soon as the extract opens.

## Preloading

| Signal | What | Why |
|---|---|---|
| Pointer or focus on a button that opens a modal | The chunk of that modal | The modal opens at once on the click |
| Pointer or focus on "3 meses", "6 meses" or "Tudo" | `getChartData` of that period, with `usePrefetch` | The click reads the cache and sends no request |
| The chart card mounts | The chunk of the charts | It does not wait for the data |
| A menu link appears | Next.js `prefetch` of the dashboard pages and `/sobre` | The pages are small, and the click keeps the document |

Pointer events cover mouse, pen and touch, and focus covers the keyboard. The chart prefetch uses `chartDataFilters`, the same function as the query, because RTK Query only matches equal arguments.

Moving between shell, dashboard and transactions stays a full page load with no preload. The HTML of each page has its own nonce and `no-store`, so a prefetched document would be thrown away. The chunks of each zone live under their own basePath, so preloading them would cost up to about 190 KB on visits that may never cross.

## Cache

| What | Cache | Why |
|---|---|---|
| Server data in the browser | RTK Query, 60 s, invalidated by every write ([state-management.md](state-management.md)) | One copy for every screen, refreshed after a write |
| A prefetched chart period | The same RTK Query entry | The click reuses it |
| API responses | `Cache-Control: no-store`, errors included | Financial data stays out of shared and browser caches |
| HTML pages | `no-store`, rendered per request | The CSP nonce ([below](#no-page-is-static)) |
| JS, CSS and font chunks | `public, immutable` | Their names change with their content |

### No page is static

The CSP nonce exists only per request ([security.md](security.md#security-headers-and-csp)), so the three root layouts call `connection()` and every route is rendered on demand. Locally the render adds only a few milliseconds. In production a CDN cannot answer for these pages and a serverless function can start cold, which has not been measured. It stays this way because the nonce lets the CSP refuse any script the server did not send, without `unsafe-inline`, and most pages need the session anyway. The chunks stay immutable, and `'strict-dynamic'` lets the nonced scripts load them.

## LCP on mobile: a fair comparison

The LCP of the "after" reports is higher than the baseline, but the two used different caches. The baseline ran with a warm HTTP cache and the "after" runs with a cold one. With the same warm cache the LCP did not regress (0.85 s before, 0.75 s after on `/dashboard`).

With a cold cache there was a real regression, and two changes reduced it. The LCP element was an icon, which waited for the 125 KB icon font, and the CSS had grown because Tailwind read words such as `menu` and `tab` in the code as daisyUI classes.

| Change | Effect |
|---|---|
| daisyUI limited to `modal` and `progress` | CSS from 76 KB to 34 KB on the dashboard |
| Icon font reduced to the icons in use, preloaded, with `display: block` | Font from 125 KB to 3 KB, and the LCP element became real content |

The cold mobile LCP of `/dashboard` went from 3.09 s to 2.01 s, against 1.76 s on the baseline. What remains is the HTML rendered per request and the 24 KB text font.

## Icon font

The apps load a subset of Material Icons with the 38 icons in use. The list is `packages/design-system/fonts/icons.txt`, and the script is `packages/design-system/scripts/subset-icons.py`. The source font comes from `@fontsource/material-icons`, which is why that package stays.

To use a new icon:

1. Add its name to `icons.txt`.
2. Run this at the root of the repository, after `npm install`. It needs Docker and installs nothing on the machine:

   ```sh
   docker run --rm -v "${PWD}:/work" -w /work python:3.12-alpine sh -c "pip install --quiet --root-user-action=ignore --disable-pip-version-check fonttools brotli && python packages/design-system/scripts/subset-icons.py"
   ```

   In Git Bash on Windows, put `MSYS_NO_PATHCONV=1` before `docker`. In PowerShell it runs as it is.

3. Commit `material-icons-subset.woff2`, `icons.txt` and `icons.built.txt`.

`iconFont.test.ts` fails when the code uses an icon missing from the list, or when the list changed and the font was not generated again, and its message points here. The script refuses a name that Material Icons does not have and refuses to save a font that lost a ligature. The font loads through `next/font/local` with `display: block`, because with `swap` the icon name shows as text on a slow connection. Every icon is `aria-hidden` ([accessibility.md](accessibility.md)).

## Lighthouse: before and after

Lighthouse 13.5.0 in DevTools, Navigation mode, on the production build in Docker, logged in. Mobile is the emulated Moto G Power with Slow 4G. "Before" is the refactor baseline on Next 16.4.3 ([baseline.md](baseline.md)). "After" is the median of three runs per page and device, and [lighthouse/after/](lighthouse/after/) keeps the median run, under the same file names as [lighthouse/before/](lighthouse/before/).

| Page | Device | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|---|
| /dashboard | Mobile | 98 → **96** | 88 → **100** | 100 → **100** | 80 → **100** |
| /transactions | Mobile | 99 → **99** | 88 → **100** | 100 → **100** | 80 → **100** |
| /dashboard | Desktop | 100 → **100** | 92 → **100** | 100 → **100** | 80 → **100** |
| /transactions | Desktop | 100 → **100** | 92 → **100** | 100 → **100** | 80 → **100** |

The higher mobile LCP of these reports (2.3 s and 2.0 s) is the cold cache explained [above](#lcp-on-mobile-a-fair-comparison). Accessibility and SEO reached 100 with the work in [accessibility.md](accessibility.md), and CLS fell to almost 0 on the three pages that had some.

## How to validate

- DevTools → Network, filtered by JS: opening the dashboard downloads no modal chunk, and hovering "Ver detalhes" downloads it before the click.
- Hover "6 meses": a `chart-data?period=6` request goes out, and the click sends none.
- `curl -sI http://localhost:3000/` shows `no-store`, and a chunk under `/_next/static` shows `immutable`.
- `npm run build`, then compare the `<script>` tags of `/dashboard` with the baseline.
- Run Lighthouse on the Docker build, logged in, as above.

## Known limits

- The first opening of a modal on a slow connection, with no hover or focus before it, shows nothing until the chunk arrives.
- The cost of rendering every page per request in production has not been measured.
