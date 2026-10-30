# Phase 4: modularization (Step 1.4a)

**Date:** 2026-10-30

The three apps now consume `@bytebank/utils` and `@bytebank/types`, and their local copies are gone.

## Why

- **One source of truth.** The same utilities existed in four places: `packages/utils` and a copy in each app (`transactions.ts` in three). The packages had no consumers, and the copies were what actually ran.
- **The `cn` bug existed in 4 copies.** `tailwind-merge` dropped the design system typography tokens when a text color followed. With copies, the fix would have had to be applied four times. It now lives in one file.

## What each app consumes

| App | `@bytebank/utils` | `@bytebank/types` |
|---|---|---|
| shell | `cn`, `formatCents` (11 files) | nothing directly (it is a dependency of `@bytebank/utils`) |
| dashboard | `cn`, `formatCents`, `getFirstName`, `groupByMonth`, `capitalizeMonth`, `TRANSACTION_OPTIONS` (16 files) | `Transaction`, `TransactionType` (9 files) |
| transactions | `cn`, `formatCents`, `getFirstName`, `groupByMonth`, `capitalizeMonth`, `TRANSACTION_OPTIONS` (15 files) | `Transaction`, `TransactionType` (8 files) |

51 files had their imports swapped. In `components/ui` (18 files) only the import line changed: `@/lib/utils/cn` became `@bytebank/utils`. Those components are still local copies, which step 1.4b replaces with `@bytebank/design-system`.

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

All three `next.config.ts` files list `@bytebank/types` and `@bytebank/utils`.

**It is not required with this setup.** The Next.js 16.4.3 docs (`transpilePackages` page, shipped in `node_modules/next/dist/docs`) say: "Turbopack transpiles workspace packages (npm, pnpm, or Yarn workspaces) in your monorepo automatically under both routers. Webpack does the same for the App Router." It is needed for `node_modules` dependencies that ship raw TypeScript or JSX, and for webpack with the Pages Router. These apps use Turbopack and the App Router. The entries are kept as an explicit record of which workspace packages each app compiles, and they are harmless.

## Validation

- `npm test`, `npx turbo lint --continue`, `npm run build`: all pass.
- `npm run build-storybook` passes, since the shell stories render the changed components.
- `docker compose build` passes for the three images, including a real `npm ci` with the `packages/core` and `packages/infrastructure` `COPY` lines.
- No occurrence of `@/lib/utils` or `@/types/transaction` remains in `apps/`.
