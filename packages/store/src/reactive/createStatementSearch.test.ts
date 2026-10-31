import type { TransactionDTO } from '@bytebank/core'
import { map, NEVER, type Observable, of } from 'rxjs'
import { TestScheduler } from 'rxjs/testing'
import { describe, expect, it } from 'vitest'
import { createStatementSearch, type StatementSearchInputs } from './createStatementSearch'

const deposit: TransactionDTO = { id: 'dep', userId: 'u', type: 'deposit', amountInCents: 100, date: '2026-03-08' }
const payment: TransactionDTO = { id: 'pay', userId: 'u', type: 'payment', amountInCents: 200, date: '2026-01-15' }
const NO_FILTERS = { type: '', month: '' }

const ids = (results$: Observable<TransactionDTO[]>) => results$.pipe(map(list => list.map(item => item.id).join()))

// In run(), debounceTime follows virtual time, so these tests take no real time at all
function marbles(test: (helpers: Parameters<Parameters<TestScheduler['run']>[0]>[0]) => void): void {
  new TestScheduler((actual, expected) => expect(actual).toEqual(expected)).run(test)
}

function inputs(overrides: Partial<StatementSearchInputs>): StatementSearchInputs {
  return {
    text$: of(''),
    filters$: of(NO_FILTERS),
    transactions$: of([deposit, payment]),
    pageRequests$: NEVER,
    ...overrides,
  }
}

describe('createStatementSearch', () => {
  describe('results$', () => {
    it('shows the whole list at once, without waiting for the debounce', () => {
      marbles(({ expectObservable }) => {
        const { results$ } = createStatementSearch(inputs({ text$: NEVER }))

        expectObservable(ids(results$), '^ 500ms !').toBe('a', { a: 'dep,pay' })
      })
    })

    it('waits for the debounce before filtering', () => {
      marbles(({ cold, expectObservable }) => {
        const text$ = cold('- a', { a: 'Dep' })
        const { results$ } = createStatementSearch(inputs({ text$ }))

        expectObservable(ids(results$), '^ 500ms !').toBe('a 300ms b', { a: 'dep,pay', b: 'dep' })
      })
    })

    it('gives one emission for fast typing, after the last key', () => {
      marbles(({ cold, expectObservable }) => {
        const text$ = cold('- a 99ms b 99ms c', { a: 'P', b: 'Pa', c: 'Pag' })
        const { results$ } = createStatementSearch(inputs({ text$ }))

        expectObservable(ids(results$), '^ 800ms !').toBe('a 500ms b', { a: 'dep,pay', b: 'pay' })
      })
    })

    it('does not emit for a text repeated after a pause', () => {
      marbles(({ cold, expectObservable }) => {
        const text$ = cold('- a 399ms b', { a: 'Dep', b: 'Dep' })
        const { results$ } = createStatementSearch(inputs({ text$ }))

        expectObservable(ids(results$), '^ 1000ms !').toBe('a 300ms b', { a: 'dep,pay', b: 'dep' })
      })
    })

    it('does not emit when only the spaces around the text change', () => {
      marbles(({ cold, expectObservable }) => {
        const text$ = cold('- a 399ms b', { a: 'Dep', b: '  Dep ' })
        const { results$ } = createStatementSearch(inputs({ text$ }))

        expectObservable(ids(results$), '^ 1000ms !').toBe('a 300ms b', { a: 'dep,pay', b: 'dep' })
      })
    })

    it('changes at once with a filter', () => {
      marbles(({ cold, expectObservable }) => {
        const filters$ = cold('a 10ms b', { a: NO_FILTERS, b: { type: 'payment', month: '' } })
        const { results$ } = createStatementSearch(inputs({ text$: NEVER, filters$ }))

        expectObservable(ids(results$), '^ 500ms !').toBe('a 10ms b', { a: 'dep,pay', b: 'pay' })
      })
    })

    it('does not emit for the same filter again', () => {
      marbles(({ cold, expectObservable }) => {
        const filters$ = cold('a 10ms b', { a: NO_FILTERS, b: { ...NO_FILTERS } })
        const { results$ } = createStatementSearch(inputs({ text$: NEVER, filters$ }))

        expectObservable(ids(results$), '^ 500ms !').toBe('a', { a: 'dep,pay' })
      })
    })

    it('emits again when the list changes, keeping the search', () => {
      marbles(({ cold, expectObservable }) => {
        const text$ = cold('- a', { a: 'Dep' })
        const transactions$ = cold('a 500ms b', { a: [deposit, payment], b: [payment] })
        const { results$ } = createStatementSearch(inputs({ text$, transactions$ }))

        expectObservable(ids(results$), '^ 800ms !').toBe('a 300ms b 199ms c', { a: 'dep,pay', b: 'dep', c: '' })
      })
    })

    it('emits nothing until the list exists', () => {
      marbles(({ cold, expectObservable }) => {
        const transactions$ = cold('20ms a', { a: [deposit] })
        const { results$ } = createStatementSearch(inputs({ text$: NEVER, transactions$ }))

        expectObservable(ids(results$), '^ 100ms !').toBe('20ms a', { a: 'dep' })
      })
    })
  })

  describe('page$', () => {
    it('starts at 1 and follows the requests', () => {
      marbles(({ cold, expectObservable }) => {
        const pageRequests$ = cold('- 10ms a', { a: 3 })
        const { page$ } = createStatementSearch(inputs({ text$: NEVER, pageRequests$ }))

        expectObservable(page$, '^ 100ms !').toBe('a 10ms b', { a: 1, b: 3 })
      })
    })

    it('goes back to 1 when the settled search changes, not at each key', () => {
      marbles(({ cold, expectObservable }) => {
        const pageRequests$ = cold('5ms a', { a: 3 })
        const text$ = cold('10ms a', { a: 'Dep' })
        const { page$ } = createStatementSearch(inputs({ text$, pageRequests$ }))

        expectObservable(page$, '^ 500ms !').toBe('a 4ms b 304ms c', { a: 1, b: 3, c: 1 })
      })
    })

    it('goes back to 1 at once when a filter changes', () => {
      marbles(({ cold, expectObservable }) => {
        const pageRequests$ = cold('5ms a', { a: 3 })
        const filters$ = cold('a 9ms b', { a: NO_FILTERS, b: { type: '', month: '2026-03' } })
        const { page$ } = createStatementSearch(inputs({ text$: NEVER, filters$, pageRequests$ }))

        expectObservable(page$, '^ 100ms !').toBe('a 4ms b 4ms c', { a: 1, b: 3, c: 1 })
      })
    })

    it('keeps the page when only the list changes', () => {
      marbles(({ cold, expectObservable }) => {
        const pageRequests$ = cold('5ms a', { a: 3 })
        const transactions$ = cold('a 20ms b', { a: [deposit], b: [payment] })
        const { page$ } = createStatementSearch(inputs({ text$: NEVER, transactions$, pageRequests$ }))

        expectObservable(page$, '^ 100ms !').toBe('a 4ms b', { a: 1, b: 3 })
      })
    })
  })
})
