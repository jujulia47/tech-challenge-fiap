import type { IdleChannel, IdleMessage } from './idleMonitor'

const STORAGE_KEY = 'bytebank:idle'

function parse(value: string | null): IdleMessage | null {
  if (!value) return null
  try {
    return JSON.parse(value) as IdleMessage
  } catch {
    return null
  }
}

// localStorage reaches the tabs of every zone, which share the origin of the shell. It holds
// only a timestamp. Without it (blocked storage) each tab simply counts on its own.
export function createStorageIdleChannel(): IdleChannel {
  return {
    post(message) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(message))
      } catch {
        // Storage blocked
      }
    },

    subscribe(listener) {
      function handleStorage(event: StorageEvent) {
        if (event.key !== STORAGE_KEY) return
        const message = parse(event.newValue)
        if (message) listener(message)
      }
      window.addEventListener('storage', handleStorage)
      return () => window.removeEventListener('storage', handleStorage)
    },

    lastActivityAt() {
      try {
        const message = parse(window.localStorage.getItem(STORAGE_KEY))
        return message && message.type !== 'expired' ? message.at : null
      } catch {
        return null
      }
    },
  }
}
