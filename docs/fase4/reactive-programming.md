# Phase 4: reactive programming (Block 5)

The search of the transactions zone is an RxJS pipeline. Each input is a stream of values over time, and the screen only feeds the inputs and shows the outputs.

## The flow

| Part | Where |
|---|---|
| Pure filter, with the comparison rule | `filterTransactions` in `@bytebank/utils` |
| Pipeline: inputs to outputs, with no React | `createStatementSearch` in `@bytebank/store` |
| React bridge, generic | `useObservable` in `@bytebank/store` |
| Connection with the screen | `use-statement-search.ts` in the transactions zone |

```text
text$           ──trim──debounceTime(300)──startWith──distinctUntilChanged──skip(1)──share──┐
                                                                                            │
filters$        ──distinctUntilChanged──────────────────────────────────────────────────┐   │
                                                                                        │   │
transactions$   ─────────────────────────────────────────────────────────────────────┐  │   │
                                                                                     ▼  ▼   ▼
                                                                     combineLatest + filterTransactions
                                                                                     │
                                                                                     ▼
                                                                                  results$

any change of the search or of a filter ──map(() => 1)──┐
                                                        ├──merge──startWith(1)──▶ page$
pageRequests$ ──────────────────────────────────────────┘
```

## Why each operator

| Operator | Why |
|---|---|
| `map(trim)` | Spaces around the text do not change the search |
| `debounceTime(300)` | Waits for a pause, so the list does not filter at each key |
| `startWith('')` | The list appears at once: `combineLatest` needs one value from each input, and the first text would only come after the debounce |
| `distinctUntilChanged` | The same text after a pause changes nothing, so nothing is redone or announced |
| `skip(1)` | The initial value is not a change, so it must not touch the page |
| `share` | The results and the page use one debounce, so they change together |
| `combineLatest` | Any input can change on its own, and the result always uses the latest of the three |
| `merge` | The page has two sources: a change of the query, which goes to 1, and a click on the pagination |

The filters skip the debounce because a choice in a select is one deliberate action, with no keys to wait for.

A change in the list does not go back to page 1, so that editing a transaction keeps the person where they were.

The subscription lives as long as the screen. `useObservable` uses `useSyncExternalStore`: React subscribes on mount and cancels on unmount.

## What the marble tests prove

`TestScheduler` runs the pipeline in virtual time, so 300 ms take no real time and the moment of each emission is exact to the millisecond.

| Test | What it proves |
|---|---|
| The debounce waits | The result comes exactly 300 ms after the text, not before |
| Fast typing | Three keys give one emission, 300 ms after the last |
| A repeated text | Typing the same text after a pause, or only adding spaces, emits nothing |
| A filter | The result changes in the same millisecond |
| A list change | The result is calculated again, keeping the search |
| The page | It goes to 1 when the settled search or a filter changes, and stays when only the list changes |

The rule itself is tested apart, in `filterTransactions.test.ts`, with no time involved.

`useObservable` is tested through `createObservableStore`, which holds the subscription: it subscribes once and cancels on the function React calls on unmount. The project has no DOM for tests, so the part that React plays, calling that function on a real unmount, is not tested here: it relies on the contract of `useSyncExternalStore`.
