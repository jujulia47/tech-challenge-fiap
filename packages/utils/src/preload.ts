export interface Preloadable<T> {
  load: () => Promise<T>
  preload: () => void
}

export interface IntentHandlers {
  onPointerEnter: () => void
  onFocus: () => void
}

// One download per chunk, however many times the pointer passes. A failure is forgotten,
// so that the next attempt can try again.
export function preloadable<T>(loader: () => Promise<T>): Preloadable<T> {
  let pending: Promise<T> | null = null

  function load(): Promise<T> {
    pending ??= loader().catch((error: unknown) => {
      pending = null
      throw error
    })
    return pending
  }

  return {
    load,
    // Only a head start: the real load reports the failure, if it happens again
    preload: () => void load().catch(() => undefined),
  }
}

// The two signs that a click may come. The pointer covers mouse, pen and touch; focus covers the keyboard.
export function onIntent(action: () => void): IntentHandlers {
  return { onPointerEnter: action, onFocus: action }
}
