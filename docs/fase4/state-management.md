# State management

Both zones keep server data in RTK Query, built by one factory: `createTransactionsApi(basePath)` in `@bytebank/store` (`packages/store`).

| Zone | API | Hooks used |
|---|---|---|
| dashboard | `createTransactionsApi('/dashboard')` | Balance, statement, chart data, create, update, delete |
| transactions | `createTransactionsApi('/transactions')` | Transactions, update, delete |

## Why RTK Query

The balance, the statement and the charts are computed by the bff, so the client has nothing to calculate and no copy to keep in sync. Refreshing after a write is one declaration: an invalidated tag reads the data again in every screen that shows it. RTK Query replaced a Redux slice, a React Context, the loaders of the layouts and the `useTransactions` hooks, with their loading and error flags. It also came with `@reduxjs/toolkit`, which the project already had.

## Where the code lives

`@bytebank/store` holds `createTransactionsApi`, `createTransactionsStore`, `createTransactionsProvider` and the RxJS search of the extract. It is its own package because it depends on Redux and React, which the bff must not, since the bff runs on the server. The dependency points one way: `store → bff/client`. Each zone only has `store/transactionsApi.ts`, which calls the factories with its basePath and picks its hooks.

`createApi` uses `fakeBaseQuery`, and each endpoint calls `createTransactionsClient(basePath)` from `@bytebank/bff/client`. There is only one HTTP client, so the 401 redirect and the error codes behave the same in both zones. Errors become `{ code }`, because Redux keeps plain objects.

## Tags and invalidation

| Tag | Provided by | Shown by |
|---|---|---|
| `Transactions` | `getTransactions` | The transactions page |
| `Balance` | `getBalance` | `DashboardWelcome` |
| `Statement` | `getStatement` | The dashboard page, `CardStatement` |
| `ChartData` | `getChartData` | `CardCharts` |

`createTransaction`, `updateTransaction` and `deleteTransaction` each invalidate all four tags, since any write can change any result. Only queries with a mounted screen are read again. Invalidation also happens after a failed write, because a 502 can mean a timeout after which the write was applied.

The client never sorts or inserts. After a write the refetch brings the list in the order of the core, so a backdated transaction lands in its place.

## What stays local

Search, filters and pagination of the extract are local state over the list the query returns, run by an RxJS pipeline ([reactive-programming.md](reactive-programming.md)). A refetch keeps them, so editing with a filter on keeps the filter.

The zones share no store. Each one is a separate app, and moving between them loads the page again, so each starts with an empty cache and a change made in one zone always shows in the other.

While new arguments load, `data` keeps the previous result, so the charts do not blink when the period or the type changes. The store is created once per module and queries run only in the browser, so nothing from one user stays on the server.

## How to validate

- `npm test` runs the factory with a simulated `fetch`: every endpoint, the tags and the invalidation ([testing.md](testing.md)).
- DevTools → Network: create a transaction on the dashboard, and the balance, the statement and the charts are read again once each, with no reload. A chart period already hovered sends no request when clicked.
- The Redux DevTools extension shows the `transactionsApi` slice with its queries and tags.
