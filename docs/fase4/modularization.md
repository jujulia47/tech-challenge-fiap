# Phase 4: modularization (Steps 1.4a and 1.4b)

**Date:** 2026-10-30

The three apps now consume `@bytebank/utils`, `@bytebank/types` and `@bytebank/design-system`, and their local copies are gone. Step 1.4a covers utilities and types, and step 1.4b covers the UI components.

## Why

- **One source of truth.** The same utilities existed in four places: `packages/utils` and a copy in each app (`transactions.ts` in three). The packages had no consumers, and the copies were what actually ran.
- **The `cn` bug existed in 4 copies.** `tailwind-merge` dropped the design system typography tokens when a text color followed. With copies, the fix would have had to be applied four times. It now lives in one file.

## What each app consumes

| App | `@bytebank/utils` | `@bytebank/types` |
|---|---|---|
| shell | `cn`, `formatCents` (11 files) | nothing directly (it is a dependency of `@bytebank/utils`) |
| dashboard | `cn`, `formatCents`, `getFirstName`, `groupByMonth`, `capitalizeMonth`, `TRANSACTION_OPTIONS` (16 files) | `Transaction`, `TransactionType` (9 files) |
| transactions | `cn`, `formatCents`, `getFirstName`, `groupByMonth`, `capitalizeMonth`, `TRANSACTION_OPTIONS` (15 files) | `Transaction`, `TransactionType` (8 files) |

51 files had their imports swapped. In `components/ui` (18 files) only the import line changed: `@/lib/utils/cn` became `@bytebank/utils`. Step 1.4b then removed those local components.

## Removed copies

Before the removal, each copy was compared with its package. They only differed in the type import of `transactions.ts` (and line endings), so there was no behavior difference.

```text
apps/shell/src/lib/utils/cn.ts
apps/shell/src/lib/utils/currency.ts
apps/shell/src/lib/utils/user.ts
apps/dashboard/src/lib/utils/cn.ts
apps/dashboard/src/lib/utils/currency.ts
apps/dashboard/src/lib/utils/transactions.ts
apps/dashboard/src/lib/utils/user.ts
apps/transactions/src/lib/utils/cn.ts
apps/transactions/src/lib/utils/currency.ts
apps/transactions/src/lib/utils/transactions.ts
apps/transactions/src/lib/utils/user.ts
apps/dashboard/src/types/transaction.ts
apps/transactions/src/types/transaction.ts
```

## The `cn` fix

`packages/utils/src/cn.ts` uses `extendTailwindMerge` to add the design system typography tokens to the `font-size` class group:

`text-meta`, `text-meta-semibold`, `text-body`, `text-body-semibold`, `text-nav`, `text-nav-bold`, `text-label`, `text-heading`, `text-display`, `text-icon-xs`, `text-icon-sm`, `text-icon-md`

These are the utilities that set `font-size` in the `@layer utilities` block of `globals.css` (they are not in `@theme`). That block is identical in the three apps. Color tokens such as `text-inverse` and `text-primary-800` were not touched, so they stay in the color group. `cn.test.ts` compares its token list with `globals.css`, so a token added to the CSS but not to `cn.ts` fails the test.

| Call | Before | After |
|---|---|---|
| `cn('text-body-semibold', 'text-inverse')` | `text-inverse` | `text-body-semibold text-inverse` |
| `cn('text-icon-sm', 'text-success')` | `text-success` | `text-icon-sm text-success` |
| `cn('text-body', 'text-meta')` | `text-meta` | `text-meta` |
| `cn('text-success', 'text-inverse')` | `text-inverse` | `text-inverse` |
| `cn('text-heading', 'text-sm')` | `text-heading text-sm` | `text-sm` |

**This is the one intended visual change of this step.** Components that combine a typography token with a color in `cn()`, such as `Button`, `Select`, `Input` and `Toast`, get their typography back. Text size and weight may look different from before, and that is the correct design. The Lighthouse and bundle baselines were measured with the bug present.

`tailwind-merge` also treats `font-size` as conflicting with `leading-*`, so a `leading-*` class placed before a typography token in the same `cn()` call is dropped. No `cn()` call does this today: the `leading-*` classes in the apps are in plain `className` strings.

## `transpilePackages`

All three `next.config.ts` files list `@bytebank/design-system`, `@bytebank/types` and `@bytebank/utils`.

**It is not required with this setup.** The Next.js 16.4.3 docs (`transpilePackages` page, shipped in `node_modules/next/dist/docs`) say: "Turbopack transpiles workspace packages (npm, pnpm, or Yarn workspaces) in your monorepo automatically under both routers. Webpack does the same for the App Router." It is needed for `node_modules` dependencies that ship raw TypeScript or JSX, and for webpack with the Pages Router. These apps use Turbopack and the App Router. The entries are kept as an explicit record of which workspace packages each app compiles, and they are harmless.

## Validation

- `npm test`, `npx turbo lint --continue`, `npm run build`: all pass.
- `npm run build-storybook` passes, since the shell stories render the changed components.
- `docker compose build` passes for the three images, including a real `npm ci` with the `packages/core` and `packages/infrastructure` `COPY` lines.
- No occurrence of `@/lib/utils` or `@/types/transaction` remains in `apps/`.

## Design system (step 1.4b)

The apps import the nine UI components from `@bytebank/design-system`: `Button`, `Checkbox`, `Input`, `Link`, `Modal`, `ModalConfirmDelete`, `ProfileMenu`, `Select` and `Toast`. 30 files changed, with imports merged into one line per file: 21 app files and the 9 stories, which stay in `apps/shell/src/components/ui` as the documentation of the package.

In the three `Header` files only the import line changed, plus the `items` prop in the dashboard and transactions.

### Removed copies

`Button.tsx`, `Checkbox.tsx`, `Input.tsx`, `Link.tsx`, `Modal.tsx`, `ModalConfirmDelete.tsx`, `ProfileMenu.tsx`, `Select.tsx` and `Toast.tsx` were removed from each of these folders (27 files):

```text
apps/shell/src/components/ui/
apps/dashboard/src/components/ui/
apps/transactions/src/components/ui/
```

The last two folders were empty afterwards and were removed too.

### Differences found between the copies

Seven of the nine components were identical to the package (`ModalConfirmDelete` only differed in import paths). Two had real differences:

| Component | Difference | Decision |
|---|---|---|
| `ProfileMenu` | Links differed per app | New `items` prop, see below |
| `Toast` | `aria-live="assertive"` in the dashboard, `"polite"` elsewhere | Package version (`polite`), as `CLAUDE.md` requires. It only affects screen readers in the dashboard. |

### Navigation between zones

`next/link` adds the `basePath` of the current app, and it can only do client-side navigation inside that app. So:

- **Inside a zone:** `next/link` with a path relative to the zone (`/account` in the dashboard becomes `/dashboard/account`).
- **Between zones:** a plain `<a href>` or `window.location` with the absolute path, which does a full page load. Login and logout work this way too.

`ProfileMenu` receives `items`, each one `{ label, href, crossZone? }`, and renders `next/link` or `<a>` according to `crossZone`:

| App | Items | `crossZone` |
|---|---|---|
| shell | Default (`/dashboard/account`, `/dashboard/coming-soon`) | no |
| dashboard | `/account`, `/coming-soon` | no |
| transactions | `/dashboard/account`, `/dashboard/coming-soon` | yes |

**Bug fixed:** in the transactions zone, "Minha conta" and "Configurações" pointed to `/account` and `/coming-soon`, which the `basePath` turned into `/transactions/account` and `/transactions/coming-soon`. Those routes do not exist. They now go to the dashboard zone with a full page load.

Known limits: the shell default still uses `next/link` to reach another zone, as it did before. The active item highlight compares `usePathname()` with `href`, so it never matches for the cross-zone items of the transactions zone, which is expected because those pages are not in that zone.

### `@source`

The apps import the components from another workspace package, so their classes are no longer in the app folders. Tailwind v4 only generates CSS for classes it finds in the files it scans: by default it starts at the current working directory, so `packages/design-system` is not scanned. The components would render without those styles, and the build would still pass.

Each `globals.css` now has this line, right after `@import "tailwindcss";`:

```css
@source "../../../../packages/design-system/src";
```

The Tailwind docs say to "Use `@source` to explicitly register source paths relative to the stylesheet" ([detecting classes in source files](https://tailwindcss.com/docs/detecting-classes-in-source-files)). The file is in `apps/<app>/src/styles/`, so four levels up is the repository root.

**Proof.** Four classes that exist only in the design system, measured in the CSS generated by `npm run build`:

| Class | Why it was chosen | With `@source` | Without `@source` |
|---|---|---|---|
| `min-w-36` | `Button` width | found in the 3 apps | absent in the 3 apps |
| `disabled:cursor-not-allowed` | `Button` and `Input` disabled state | found in the 3 apps | absent in the 3 apps |
| `focus-within:outline-offset-2` | `Checkbox` focus | found in the 3 apps | absent in the 3 apps |
| `bg-text-primary/50` | `Modal` backdrop | found in the 3 apps | absent in the 3 apps |

| App | CSS with `@source` | CSS without `@source` |
|---|---|---|
| shell | 90.5 KB | 82.6 KB |
| dashboard | 55.5 KB | 43.9 KB |
| transactions | 53.4 KB | 39.9 KB |

The build passes in both cases, so **a missing `@source` only shows up visually**. The directive was restored and the check repeated. `min-w-36` was also confirmed in the CSS inside the three Docker images.

### `'use client'`

`Checkbox` and `Input` gained `'use client'`, because they define inline event handlers. `Button` and `Toast` did not need it: `Button` only forwards an `onClick` prop, `Toast` has no events, and the build passes.

### Tests

`ProfileMenu.test.ts` covers the default items, custom items, the active highlight and both link types, by rendering to static HTML with `react-dom/server` in the existing `node` environment. No configuration was added.

**Pending:** there is no DOM test environment, so interactions (clicks, closing on outside click, keyboard) and the other components have no tests. The cross-zone navigation itself was not exercised in a browser.

## Remaining duplication

Files that still exist in more than one app, as candidates for future steps. "Identical" ignores line endings.

**Identical copies:**

| File | Apps | Candidate destination |
|---|---|---|
| `hooks/use-currency-input.ts` | shell, dashboard, transactions | Package for shared hooks |
| `hooks/use-toast.ts` | shell, dashboard, transactions | Package for shared hooks, or the design system |
| `hooks/use-user.ts` | shell, dashboard, transactions | Package for shared hooks |
| `hooks/use-balance.ts` | dashboard, transactions | Package for shared hooks |
| `lib/api/transactions.ts` | dashboard, transactions | Replaced by `@bytebank/infrastructure` |
| `components/dashboard/ModalEditTransaction.tsx` | dashboard, transactions | Rewritten on top of the use cases |
| `components/dashboard/TransactionItem.tsx` | dashboard, transactions | Shared transaction UI |
| `components/dashboard/CardWelcome.tsx` | dashboard, transactions | Shared transaction UI |
| `components/layout/DashboardWelcome.tsx` | dashboard, transactions | Shared transaction UI |
| `app/api/auth/[...nextauth]/route.ts` | shell, dashboard, transactions | Thin re-export, can stay |
| `types/fontsource.d.ts` | shell, dashboard, transactions | A shared package |
| `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs` | shell, dashboard, transactions | `tsconfig.base.json` and shared config |

**Step 2.5b:** `@bytebank/types` was retired, `TransactionItem` moved to `@bytebank/design-system`, and the unused `DashboardWelcome.tsx`, `CardWelcome.tsx` and `use-balance.ts` of the transactions zone were removed. The mentions of `@bytebank/types` above record step 1.4a.

**Dead code removed in step 2.3:** the transactions copies of `CardNewTransaction.tsx` and `CardStatement.tsx`. A search confirmed that no file referred to them. The dashboard keeps its own copies, which are in use.

**Copies that have diverged:**

| File | Apps | Note |
|---|---|---|
| `components/layout/Header.tsx` | shell, dashboard, transactions | Different `signOut` and menu handling |
| `components/layout/MenuDrawer.tsx`, `MenuSidebar.tsx`, `MenuTabs.tsx`, `nav-items.ts` | shell, dashboard, transactions | Differ in zone paths, a good case for the same `crossZone` rule |
| `components/dashboard/ModalTransactionDetail.tsx` | dashboard, transactions | Should be one component |
| `lib/auth.ts` | shell, dashboard, transactions | Reads different environment variables |
| `styles/globals.css` | shell, dashboard, transactions | The tokens are identical, and the `.material-icons` class differs in the dashboard. Candidate for a shared stylesheet in the design system. |
| `app/not-found.tsx`, `app/layout.tsx` | shell, dashboard, transactions | Similar structure per zone |
