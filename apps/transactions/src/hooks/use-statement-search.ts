'use client'

import { useEffect, useState } from 'react'
import { BehaviorSubject, Subject } from 'rxjs'
import type { TransactionDTO } from '@bytebank/core'
import { createStatementSearch, useObservable } from '@bytebank/store'
import type { StatementFilters } from '@bytebank/utils'

const NO_FILTERS: StatementFilters = { type: '', month: '' }
const NO_RESULTS: TransactionDTO[] = []
const FIRST_PAGE = 1

function createSearch() {
  const inputs = {
    text$: new BehaviorSubject(''),
    filters$: new BehaviorSubject(NO_FILTERS),
    transactions$: new BehaviorSubject<readonly TransactionDTO[]>(NO_RESULTS),
    pageRequests$: new Subject<number>(),
  }
  return { inputs, outputs: createStatementSearch(inputs) }
}

// Connects the screen to the pipeline: the fields feed the inputs, and the outputs come back as values
export function useStatementSearch(transactions: readonly TransactionDTO[]) {
  const [{ inputs, outputs }] = useState(createSearch)
  const [text, setText] = useState('')
  const [filters, setFilters] = useState(NO_FILTERS)

  const results = useObservable(outputs.results$, NO_RESULTS)
  const page = useObservable(outputs.page$, FIRST_PAGE)

  useEffect(() => inputs.transactions$.next(transactions), [inputs, transactions])

  function changeText(value: string) {
    setText(value)
    inputs.text$.next(value)
  }

  function changeFilters(changes: Partial<StatementFilters>) {
    const next = { ...filters, ...changes }
    setFilters(next)
    inputs.filters$.next(next)
  }

  return {
    text,
    filters,
    results,
    page,
    changeText,
    changeFilters,
    changePage: (value: number) => inputs.pageRequests$.next(value),
  }
}
