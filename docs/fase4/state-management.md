# Phase 4: state management (Steps 2.4b and 2.5a)

**Date:** 2026-10-30

Both zones keep server data in RTK Query, built by the same factory: `createTransactionsApi(basePath)`, in `packages/store` (`@bytebank/store`).

| Zone | API | Hooks used |
|---|---|---|
| dashboard | `createTransactionsApi('/dashboard')` | Balance, statement, chart data, create, update, delete |
| transactions | `createTransactionsApi('/transactions')` | Transactions, update, delete |

## Why RTK Query

- **The server computes everything.** The balance, the statement and the charts come from the BFF, so the client has nothing to calculate and no copy to keep in sync.
- **Refreshing after a write is one declaration.** An invalidated tag reads the data again, in every screen that uses it, with no manual dispatch.
- **It removes hand-written code.** The slice, the Context, the loaders in the layouts and the `useTransactions` hooks are gone, along with their loading and error flags.
- **It comes with `@reduxjs/toolkit`,** which was already installed.

## Where the code lives

`@bytebank/store` holds `createTransactionsApi` and `createTransactionsStore`. It is its own package because it depends on Redux and React, and `@bytebank/bff` must not: the bff also runs on the server. The dependency points one way: `store → bff/client`.

Each zone only has `store/transactionsApi.ts`, which picks the `basePath` and the hooks it uses, plus `store/store.ts` and `store/ReduxProvider.tsx`.

## One HTTP client

`createApi` uses `fakeBaseQuery`, and each endpoint calls `createTransactionsClient(basePath)` from `@bytebank/bff/client` in its `queryFn`. There is no second HTTP client, so the 401 redirect and the error codes are the same in both zones. Errors are reduced to `{ code }`, because Redux keeps plain objects only.

## Tags

| Tag | Provided by | Used on the screen by |
|---|---|---|
| `Transactions` | `getTransactions` | The transactions page |
| `Balance` | `getBalance` | `DashboardWelcome` |
| `Statement` | `getStatement` | The dashboard page, `CardStatement` |
| `ChartData` | `getChartData` | `CardCharts` |

## What each mutation invalidates

| Mutation | `Transactions` | `Balance` | `Statement` | `ChartData` |
|---|---|---|---|---|
| `createTransaction` | ✓ | ✓ | ✓ | ✓ |
| `updateTransaction` | ✓ | ✓ | ✓ | ✓ |
| `deleteTransaction` | ✓ | ✓ | ✓ | ✓ |

All three invalidate everything, because every one of them can change every result. Only queries with a mounted screen are read again.

**Invalidation also happens after a failed mutation,** which is what `invalidatesTags` does when it is an array. A 502 can mean a timeout, and then the write may have been applied, so the screen must not keep showing the old state.

## Order

The client never sorts or inserts. After a create, the refetch brings the list in the order of the core. A backdated transaction was confirmed in a browser to land in its place.

## What stays local

Search, filters and pagination of the transactions page are local state of the screen, over the list that the query returns. A refetch keeps them: editing with a filter on keeps the filter. The search will get RxJS in Block 5.

## The zones do not share a store

Each zone is a separate Next.js app, and moving between them is a full page load, so each one starts with an empty cache and reads from the server. A change in one zone is therefore always visible when arriving at the other.

## Notes

- `data` keeps the previous result while new arguments load, so the charts do not blink when the period or the type changes.
- `type` narrows the bars only. The pie stays complete, because it is what the type is chosen from.
- The store is created once per module and queries only run in the browser, so nothing from one user stays on the server.
- A 401 redirects once per failed request. After a write, the refetches also answer 401, so a navigation to `/` can replace the previous one. The user still ends on `/`.
