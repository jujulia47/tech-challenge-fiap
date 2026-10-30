# Phase 4: lint diagnosis for the zones (Step 0.3)

**Date:** 2026-10-29

This step turns ESLint on for `apps/dashboard` and `apps/transactions`, which had never been linted. It is a diagnosis only: no lint error was fixed and no `.ts`/`.tsx` file was changed.

## Setup

- `apps/dashboard/eslint.config.mjs` and `apps/transactions/eslint.config.mjs` were created with the same base as `apps/shell/eslint.config.mjs`: `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript` and the same `globalIgnores`. The Storybook part was left out.
- Both `package.json` files got a `"lint": "eslint"` script. Both also declare `eslint` (`^9`) and `eslint-config-next` (`16.2.4`) in devDependencies, the same versions as the shell. Both packages were already installed through hoisting, so `npm install` downloaded nothing ("up to date").

### Config isolation

The `eslint --debug` output shows that each zone loads its own config file, with the zone folder as base path:

| Workspace | Config file loaded | Plugins |
|---|---|---|
| dashboard | `apps/dashboard/eslint.config.mjs` | react, react-hooks, import, jsx-a11y, @next/next, @typescript-eslint |
| transactions | `apps/transactions/eslint.config.mjs` | react, react-hooks, import, jsx-a11y, @next/next, @typescript-eslint |
| shell | `apps/shell/eslint.config.mjs` | the same set, plus storybook |
| packages/* | `eslint.config.mjs` (root) | @typescript-eslint, react-hooks |

The root `eslint.config.mjs` is not applied to the zones. It also has `globalIgnores(['apps/**'])` as an extra safeguard.

## Results

`npx turbo lint --continue` exited with **code 1**. 5 of 6 tasks passed, and `@bytebank/transactions#lint` failed because of 1 error. The shell, design-system, types and utils still report 0 problems.

The details below come from `npx eslint . --format json`, run inside each zone folder.

| Zone | Files linted | Errors | Warnings | Suppressed |
|---|---|---|---|---|
| dashboard | 57 | 0 | 3 | 1 |
| transactions | 43 | 1 | 0 | 1 |
| **Total** | **100** | **1** | **3** | **2** |

### dashboard

| Rule | Count | Severity | Affected files |
|---|---|---|---|
| `@next/next/no-img-element` | 3 | warning | `src/components/dashboard/CardNewTransaction.tsx:149`, `src/components/dashboard/ModalTransactionDetail.tsx:50`, `src/components/dashboard/ModalTransactionDetail.tsx:89` |

- `@next/next/no-img-element`: **behavior risk**. The three `<img>` tags render user-uploaded attachments as base64 `data:` URLs: the upload preview, the thumbnail in the detail modal and the full-size view. `next/image` does not optimize `data:` URLs, so a migration would need `unoptimized` plus explicit `width`/`height` or `fill`. That changes layout and sizing (`max-h-32`, `max-h-[60vh]`, `object-contain`). The alternative is a justified `eslint-disable`, which keeps behavior unchanged.

### transactions

| Rule | Count | Severity | Affected files |
|---|---|---|---|
| `react-hooks/set-state-in-effect` | 1 | error | `src/app/page.tsx:28` |

- `react-hooks/set-state-in-effect`: **behavior risk**. Line 28 is `useEffect(() => { setPage(1); setSearchQuery('') }, [filterType, filterMonth])`. It resets the page and clears the search whenever a filter changes. The fix (moving the reset into the filter `onChange` handlers or deriving state) changes when and how the reset happens. This page is also the search/filter/pagination code that Phase 4 will refactor.

### Duplicates between zones

No **reported** problem is duplicated. `CardNewTransaction.tsx` and `ModalTransactionDetail.tsx` differ between the zones, and only the dashboard copies use `<img>`. The dashboard has no equivalent of the `set-state-in-effect` in `transactions/src/app/page.tsx`.

The only **duplicate** is the suppressed one below: `ModalEditTransaction.tsx` is byte-for-byte identical in both zones.

## Already suppressed

| Zone | File | Line | Rule | Justification |
|---|---|---|---|---|
| dashboard | `src/components/dashboard/ModalEditTransaction.tsx` | 26 (applies to 27) | `react-hooks/set-state-in-effect` | "populates form fields when target transaction changes; refactor to key-based remount tracked as tech debt" |
| transactions | `src/components/dashboard/ModalEditTransaction.tsx` | 26 (applies to 27) | `react-hooks/set-state-in-effect` | "populates form fields when target transaction changes; refactor to key-based remount tracked as tech debt" |

- Classification: **duplicate** (identical file in both zones) and **behavior risk** (the suggested key-based remount changes when form state is reset).
- ESLint reports both directives as active suppressions (`kind: "directive"`). Neither one is unused.
- No other `eslint-disable` comments exist in `apps/dashboard` or `apps/transactions`.

## Summary by classification

| Classification | Rules |
|---|---|
| safe fix | none |
| behavior risk | `react-hooks/set-state-in-effect` (transactions `page.tsx:28`, plus the 2 suppressed occurrences), `@next/next/no-img-element` (3 in dashboard) |
| duplicate | `react-hooks/set-state-in-effect` in `ModalEditTransaction.tsx` (suppressed, both zones) |

## Resolution

Applied after the diagnosis above. Only the three files below were changed, and each one kept its original line ending (CRLF for `page.tsx`, LF for the two dashboard files).

### `react-hooks/set-state-in-effect` in `apps/transactions/src/app/page.tsx`

- The `useEffect` that ran `setPage(1); setSearchQuery('')` after `filterType` or `filterMonth` changed was removed, along with the now-unused `useEffect` import.
- The reset moved into two event handlers, `handleFilterTypeChange` and `handleFilterMonthChange`. Each one updates its filter, calls `setPage(1)` and calls `setSearchQuery('')`. The `<Select>` components now use these handlers in `onChange`.
- This is the pattern React recommends ("you might not need an effect"). The user sees the same result: changing a filter goes back to page 1 and clears the search. The difference is one render less, because the reset happens in the same batched update instead of in a second render triggered by the effect.
- Each handler starts with a guard (`if (value === filterType) return` and `if (value === filterMonth) return`). The `Select` component calls `onChange` even when the user picks the option that is already selected, and the old effect did not run in that case because its dependencies did not change. The guard keeps that original behavior: re-selecting the same option resets nothing.

### `@next/next/no-img-element` in the dashboard

- All three warnings were suppressed with a justified directive: `eslint-disable-next-line @next/next/no-img-element -- attachment is a base64 data URL; next/image does not optimize data URLs`.
- `ModalTransactionDetail.tsx:50`: the `<img>` is a child of `<button>`, so the directive is a JSX comment (`{/* ... */}`).
- `CardNewTransaction.tsx:149` and `ModalTransactionDetail.tsx:89`: the `<img>` is the only element inside a parenthesized expression (`cond && (` and `? (`). A `{/* ... */}` there would add a second sibling JSX node without a wrapper, which is a syntax error. The same text is used as a JavaScript line comment (`// ...`), which is valid in that position. ESLint reports all three as active directives.
- No markup, attributes or behavior changed.

### `react-hooks/set-state-in-effect` in `ModalEditTransaction.tsx` (both zones)

- The existing suppression was kept as technical debt. The edit form will be rewritten during the Phase 4 refactor, and that is when the key-based remount (or an equivalent) should replace the effect.

### Final totals

`npx turbo lint --continue`: exit code 0, 6 of 6 tasks successful. `npm run build`: exit code 0, 3 of 3 apps built.

| Zone | Files linted | Errors | Warnings | Suppressed |
|---|---|---|---|---|
| dashboard | 57 | 0 | 0 | 4 (3 `no-img-element`, 1 `set-state-in-effect`) |
| transactions | 43 | 0 | 0 | 1 (`set-state-in-effect`) |
| **Total** | **100** | **0** | **0** | **5** |
