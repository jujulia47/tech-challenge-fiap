import type { TransactionDTO } from '@bytebank/core'
import { filterTransactions, type StatementFilters } from '@bytebank/utils'
import {
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  merge,
  type Observable,
  share,
  skip,
  startWith,
} from 'rxjs'

export const SEARCH_DEBOUNCE_MS = 300

// text$ and filters$ start with their current value, as a BehaviorSubject does
export interface StatementSearchInputs {
  text$: Observable<string>
  filters$: Observable<StatementFilters>
  transactions$: Observable<readonly TransactionDTO[]>
  pageRequests$: Observable<number>
}

export interface StatementSearchOutputs {
  results$: Observable<TransactionDTO[]>
  page$: Observable<number>
}

const isSameFilters = (a: StatementFilters, b: StatementFilters) => a.type === b.type && a.month === b.month

// Declares how inputs become outputs and runs nothing until someone subscribes.
// Why each operator: docs/fase4/reactive-programming.md
export function createStatementSearch({
  text$,
  filters$,
  transactions$,
  pageRequests$,
}: StatementSearchInputs): StatementSearchOutputs {
  const textChanges$ = text$.pipe(
    map(text => text.trim()),
    debounceTime(SEARCH_DEBOUNCE_MS),
    // The empty search is already on the screen, so the first pause changes nothing
    startWith(''),
    distinctUntilChanged(),
    skip(1),
    share(),
  )
  const settledFilters$ = filters$.pipe(distinctUntilChanged(isSameFilters))

  const results$ = combineLatest([textChanges$.pipe(startWith('')), settledFilters$, transactions$]).pipe(
    map(([text, filters, transactions]) => filterTransactions(transactions, { ...filters, text })),
  )

  // A changed list keeps the page: editing a transaction must not move the person away from it
  const page$ = merge(
    merge(textChanges$, settledFilters$.pipe(skip(1))).pipe(map(() => 1)),
    pageRequests$,
  ).pipe(startWith(1))

  return { results$, page$ }
}
