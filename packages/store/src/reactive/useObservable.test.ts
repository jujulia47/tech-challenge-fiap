import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { BehaviorSubject, Observable, Subject } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { createObservableStore, useObservable } from './useObservable'

describe('createObservableStore', () => {
  it('starts with the initial value', () => {
    expect(createObservableStore(new Subject<number>(), 7).getSnapshot()).toBe(7)
  })

  it('does not subscribe before the mount', () => {
    const subscribed = vi.fn()

    createObservableStore(new Observable<number>(subscribed), 0)

    expect(subscribed).not.toHaveBeenCalled()
  })

  it('updates the value and warns React on each emission', () => {
    const source$ = new Subject<number>()
    const store = createObservableStore(source$, 0)
    const onChange = vi.fn()

    store.subscribe(onChange)
    source$.next(1)
    source$.next(2)

    expect(store.getSnapshot()).toBe(2)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('receives what a BehaviorSubject already holds on subscribing', () => {
    const store = createObservableStore(new BehaviorSubject(5), 0)

    store.subscribe(() => undefined)

    expect(store.getSnapshot()).toBe(5)
  })

  it('cancels the subscription when React unmounts', () => {
    const torndown = vi.fn()
    const source$ = new Observable<number>(() => torndown)
    const unsubscribe = createObservableStore(source$, 0).subscribe(() => undefined)

    unsubscribe()

    expect(torndown).toHaveBeenCalledOnce()
  })

  it('stops listening after the unmount', () => {
    const source$ = new Subject<number>()
    const onChange = vi.fn()
    const unsubscribe = createObservableStore(source$, 0).subscribe(onChange)

    unsubscribe()
    source$.next(1)

    expect(source$.observed).toBe(false)
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('useObservable', () => {
  function Value({ source$ }: { source$: Observable<number> }) {
    return createElement('p', null, useObservable(source$, 9))
  }

  it('renders the initial value on the server, with no subscription', () => {
    const subscribed = vi.fn()

    const html = renderToStaticMarkup(createElement(Value, { source$: new Observable<number>(subscribed) }))

    expect(html).toBe('<p>9</p>')
    expect(subscribed).not.toHaveBeenCalled()
  })
})
