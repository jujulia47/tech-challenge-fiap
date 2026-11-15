# Reactive programming

The search of the extract is an RxJS pipeline. Each input is a stream of values over time, and the screen only feeds the inputs and shows the outputs.

| Part | Where |
|---|---|
| The filter rule, pure | `filterTransactions` in `@bytebank/utils` |
| The pipeline, with no React | `createStatementSearch` in `@bytebank/store` |
| The React bridge | `useObservable` in `@bytebank/store` |
| The connection with the screen | `use-statement-search.ts` in the transactions zone |

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
| `debounceTime(300)` | The list filters after a pause, not at each key |
| `startWith('')` | The list shows at once, since `combineLatest` needs a value from each input |
| `distinctUntilChanged` | The same text after a pause changes nothing |
| `skip(1)` | The initial value is not a change, so it does not reset the page |
| `share` | The results and the page use one debounce and change together |
| `combineLatest` | Any input can change alone, and the result always uses the latest of the three |
| `merge` | The page has two sources: a new query sends it to 1, and the pagination moves it |

The filters skip the debounce, because choosing in a select is one deliberate action. A change in the list keeps the page, so editing a transaction leaves the person where they were. `useObservable` uses `useSyncExternalStore`, so React subscribes on mount and unsubscribes on unmount.

## Marble tests

`TestScheduler` runs the pipeline in virtual time, so the debounce takes no real time and each emission happens at an exact moment.

| Test | What it proves |
|---|---|
| The debounce waits | The result comes 300 ms after the text, not before |
| Fast typing | Three keys give one result, 300 ms after the last |
| A repeated text | The same text after a pause, or added spaces, emits nothing |
| A filter | The result changes at once |
| A list change | The result is computed again with the same search |
| The page | It goes to 1 when the search or a filter changes, and stays when only the list changes |

`filterTransactions.test.ts` tests the rule on its own. `useObservable` is tested through `createObservableStore`, which subscribes once and unsubscribes when React calls its cleanup.

## How to validate

- `npm test` runs the marble tests (`createStatementSearch.test.ts`) and the filter rule ([testing.md](testing.md)).
- In the extract, type in "Buscar": the list changes once, shortly after the last key. Add a space at the end and nothing changes. Change a filter and the list changes at once and goes back to page 1. Edit a transaction on page 2 and you stay on page 2.

## Known limits

The unit tests have no DOM, so a real unmount is not tested. `useObservable` relies on the contract of `useSyncExternalStore` for it.
