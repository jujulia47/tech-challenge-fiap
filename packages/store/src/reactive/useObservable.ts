'use client'

import { useMemo, useSyncExternalStore } from 'react'
import type { Observable } from 'rxjs'

export interface ObservableStore<T> {
  subscribe(onChange: () => void): () => void
  getSnapshot(): T
}

// Apart from the hook so that the subscription can be tested on its own
export function createObservableStore<T>(source$: Observable<T>, initialValue: T): ObservableStore<T> {
  let current = initialValue
  return {
    subscribe(onChange) {
      const subscription = source$.subscribe(value => {
        current = value
        onChange()
      })
      return () => subscription.unsubscribe()
    },
    getSnapshot: () => current,
  }
}

// React subscribes on mount and calls the returned function on unmount, so nothing leaks.
// Keep the observable stable between renders: a new one means a new subscription.
export function useObservable<T>(source$: Observable<T>, initialValue: T): T {
  const store = useMemo(() => createObservableStore(source$, initialValue), [source$, initialValue])
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => initialValue)
}
