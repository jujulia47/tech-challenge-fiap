# Phase 4: testing (Step 0.5)

**Date:** 2026-10-29

## Strategy

The first tests are **characterization tests**. They record what the code does today, including odd or questionable behavior, instead of what it should do. They do not fix anything. When a test asserts behavior that looks like a bug, it is marked with:

```ts
// Characterization: current behavior, see docs/fase4/testing.md
```

and listed under [Questionable behaviors](#questionable-behaviors).

They come before the refactor on purpose. The Phase 4 refactor (Clean Architecture, moving logic out of components, shared packages) will move this code around. With the current behavior pinned down, any change in output during the refactor shows up as a failing test. If the change is intended (for example, fixing one of the questionable behaviors), the test is updated in the same change, together with this document. If it is not intended, it is a regression.

## How to run

From the repository root:

| Script | Command | Use |
|---|---|---|
| `npm test` | `vitest run` | Run the unit tests once |
| `npm run test:watch` | `vitest` | Re-run on file changes during development |
| `npm run test:coverage` | `vitest run --coverage` | Run once and print coverage (v8) |

Configuration is in `vitest.config.mts` at the root:

- project name `unit`, environment `node`;
- `include: ['packages/**/src/**/*.test.ts']`;
- coverage via `@vitest/coverage-v8`, limited to `packages/utils/src/**/*.ts` (test files excluded), with `text` and `json-summary` reporters. The JSON summary is written to `/coverage`, which is gitignored and in `.dockerignore`.

The shell's `apps/shell/vitest.config.ts` (project `storybook`, browser mode with Playwright) is separate and unchanged. The root config does not include any story or anything under `apps/shell/.storybook`.

`vitest` and `@vitest/coverage-v8` are declared in the root `devDependencies` with the same range as the shell (`^4.1.12`, installed 4.1.12). Nothing new was downloaded.

Tests import `describe`, `it`, `expect` and `expectTypeOf` explicitly from `'vitest'` (no `globals: true`). Test files live next to the module they test and go through the same ESLint config (root `eslint.config.mjs`) and `tsc -p packages/utils` as the rest of the package.

## Scope

**Tested now:** every export of `packages/utils/src`.

| Module | Exports | Test file |
|---|---|---|
| `cn.ts` | `cn` | `cn.test.ts` |
| `currency.ts` | `formatCents` | `currency.test.ts` |
| `transactions.ts` | `TRANSACTION_OPTIONS`, `capitalizeMonth`, `groupByMonth` | `transactions.test.ts` |
| `user.ts` | `getFirstName` | `user.test.ts` |
| `index.ts` | barrel for all of the above | `index.test.ts` (public API surface) |

The sample data in `transactions.test.ts` uses the same seven transactions as `apps/shell/db.json`, in the same order and format (`amount: "R$ 150,00"`, `date: "18/11/2022"`, `month: "novembro"`).

**Left for later:** logic that lives inside components or hooks and cannot be imported on its own yet. It will be tested once the Block 1 refactor extracts it into the domain layer.

- `parseBRL` and the period filter (`3m` / `6m` / `tudo`), plus the per-month and per-type aggregation in `apps/dashboard/src/components/dashboard/CardCharts.tsx`.
- The search, type/month filters and pagination in `apps/transactions/src/app/page.tsx`.
- Form validation, category suggestion and the attachment size check in `CardNewTransaction.tsx`. Also the amount parsing in `ModalEditTransaction.tsx` (`.replace('R$ ', '')...`).
- `useCurrencyInput`, `useBalance` and `useToast` (React hooks, which need a component test environment).
- The `packages/design-system` components (they need a DOM environment, such as jsdom or happy-dom, which is not installed).

## Copies vs packages

`packages/utils/src` was compared with the local copies in the apps (line endings ignored):

| Module | `apps/shell/src/lib/utils` | `apps/dashboard/src/lib/utils` | `apps/transactions/src/lib/utils` |
|---|---|---|---|
| `cn.ts` | identical | identical | identical |
| `currency.ts` | identical | identical | identical |
| `user.ts` | identical | identical | identical |
| `transactions.ts` | not present | import differs | import differs |
| `index.ts` | not present | not present | not present |

The only difference is the first line of `transactions.ts`:

```diff
- import type { Transaction } from '@bytebank/types'      // packages/utils
+ import type { Transaction } from '@/types/transaction'  // dashboard and transactions copies
```

The two `Transaction` types are also identical apart from whitespace: `packages/types/src/transaction.ts` got `attachment?: string` in step 0.2. Since the runtime logic is the same, **the tests describe the behavior of the copies the apps use today as well**. That includes the `cn` typography issue below, which affects the running apps.

## Questionable behaviors

Each item matches one test marked `// Characterization: current behavior, see docs/fase4/testing.md`.

### `cn` (`cn.test.ts`)

1. **"drops a custom typography token when a text color follows it".** `cn('text-body-semibold', 'text-inverse')` returns `'text-inverse'`, and the same happens with `text-body` + `text-primary-800` and `text-meta` + `text-error`. `tailwind-merge` does not know the design system's custom `text-*` font-size tokens, so it treats them as text colors and keeps only the last one. **This is a visible bug in the running apps:** `Button` passes `text-body-semibold` and then a variant with `text-*` color through `cn`, so buttons lose their typography token. `Select` and `Input` do the same.
2. **"drops a custom icon size token when a text color follows it".** `cn('text-icon-sm', 'text-success')` returns `'text-success'`, for the same reason. It affects icon sizes combined with a text color.
3. **"treats two custom typography tokens as conflicting and keeps the last one".** `cn('text-body', 'text-meta')` returns `'text-meta'`. That happens to be correct, but only by accident: both tokens are seen as colors, not as font sizes. The real fix for all three items is to register the custom tokens with `extendTailwindMerge`.

### `formatCents` (`currency.test.ts`)

4. **"formats negative zero as "-0,00"".** `formatCents(-0)` returns `'-0,00'`. Negative zero can come out of arithmetic, for example `-1 * 0`.
5. **"rounds fractional cents half away from zero instead of rejecting them".** `formatCents(0.5)` returns `'0,01'` and `formatCents(150.5)` returns `'1,51'`. The function expects integer cents but silently rounds non-integers.
6. **"returns locale output for non-finite input instead of throwing".** `formatCents(NaN)` returns `'NaN'` and `formatCents(Infinity)` returns `'∞'`. Invalid input reaches the UI as text instead of failing.
7. **"loses precision near Number.MAX_SAFE_INTEGER because it divides by 100".** `formatCents(9007199254740991)` returns `'90.071.992.547.409,90'`, not `…,91`. Floating-point division loses the last cent at this size. This is far beyond realistic amounts, but it shows that money is handled as floating point.

### `transactions.ts` (`transactions.test.ts`)

8. **"types option values as plain string, not as TransactionType".** `TRANSACTION_OPTIONS` is not `as const` or typed as `TransactionType`, so `option.value` is `string`. That is why the forms need `type as TransactionType` casts. The runtime values do cover the seven types exactly once (a separate, non-characterization test checks this).
9. **"does not trim, so a leading space prevents capitalization".** `capitalizeMonth(' novembro')` returns `' novembro'`. Minor, but the month comes from stored data.
10. **"orders groups by position in the array, not by date".** `groupByMonth` reverses the array and groups by first appearance. Group order and the order inside each group therefore depend on insertion order (the json-server order), not on `date`. With the `db.json` data the result looks chronological (newest month first) only because the records were inserted in date order.
11. **"merges the same month of different years into one group".** Grouping uses only the month name (`month: "novembro"`), so November 2022 and November 2026 end up in the same group, shown under one "Novembro" heading.
12. **"treats month names with different casing as different groups".** `"novembro"` and `"Novembro"` become two groups. All stored months are lowercase today, because they come from `toLocaleDateString('pt-BR', { month: 'long' })`.
13. **"groups by the stored month field, even when it does not match the date".** `month` is denormalized: it is stored separately from `date` and never checked against it. `CardNewTransaction` also sets `month` from the creation date, not from the chosen `transactionDate`, so a transaction backdated to another month is grouped under the month it was created.

### `getFirstName` (`user.test.ts`)

14. **"splits only on the space character, not on tabs or line breaks".** `getFirstName('Ana\tMaria')` returns `'Ana\tMaria'`. It splits on `' '` instead of on any whitespace.

## Coverage

`npm run test:coverage` (v8), `packages/utils/src`:

| File | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `cn.ts` | 100% (1/1) | 100% (0/0) | 100% (1/1) | 100% (1/1) |
| `currency.ts` | 100% (1/1) | 100% (0/0) | 100% (1/1) | 100% (1/1) |
| `index.ts` | 100% (0/0) | 100% (0/0) | 100% (0/0) | 100% (0/0) |
| `transactions.ts` | 100% (7/7) | 100% (2/2) | 100% (4/4) | 100% (7/7) |
| `user.ts` | 100% (1/1) | 100% (0/0) | 100% (1/1) | 100% (1/1) |
| **Total** | **100% (10/10)** | **100% (2/2)** | **100% (7/7)** | **100% (10/10)** |

Line coverage is a weak signal for code this small: 100% only means every line ran. The value of these tests is in the asserted edge cases above. In the terminal, the `text` reporter hides files at 100%, so the per-file numbers come from `coverage/coverage-summary.json`.

Result: 5 test files, 52 tests, all passing.

## Config file extension

The root config is `vitest.config.mts`, not `.ts`. The root `package.json` has no `"type": "module"`, so a `.ts` config with ESM syntax made Vite print a notice ("uses ESM syntax in a file loaded as CommonJS", unsupported by the planned `configLoader: 'native'` default). The `.mts` extension marks the file as ESM explicitly. The file was renamed in step 0.6 without content changes, and the notice is gone.

The tests also run in CI on every push and pull request to `main`. See `docs/fase4/ci.md`.
