export type IdleState = { phase: 'active' } | { phase: 'warning'; remainingSeconds: number } | { phase: 'expired' }

export type IdleMessage = { type: 'activity' | 'continue' | 'expired'; at: number }

export interface IdleTimes {
  timeoutMs: number
  warningMs: number
}

// What connects the tabs of the app
export interface IdleChannel {
  post(message: IdleMessage): void
  subscribe(listener: (message: IdleMessage) => void): () => void
  // Read on every tick: a frozen background tab may have missed the messages
  lastActivityAt(): number | null
}

export interface IdleMonitorOptions extends IdleTimes {
  renewEveryMs: number
  channel: IdleChannel
  onChange(state: IdleState): void
  onExpire(): void
  onRenew(): void
}

export interface IdleMonitor {
  recordActivity(): void
  stayConnected(): void
  stop(): void
}

const TICK_MS = 1_000
const POST_EVERY_MS = 1_000

export function idleStateAt(lastActivityAt: number, now: number, { timeoutMs, warningMs }: IdleTimes): IdleState {
  const remainingMs = lastActivityAt + timeoutMs - now
  if (remainingMs <= 0) return { phase: 'expired' }
  if (remainingMs > warningMs) return { phase: 'active' }
  return { phase: 'warning', remainingSeconds: Math.ceil(remainingMs / 1_000) }
}

function isSameState(a: IdleState, b: IdleState): boolean {
  if (a.phase === 'warning' && b.phase === 'warning') return a.remainingSeconds === b.remainingSeconds
  return a.phase === b.phase
}

export function createIdleMonitor({
  timeoutMs,
  warningMs,
  renewEveryMs,
  channel,
  onChange,
  onExpire,
  onRenew,
}: IdleMonitorOptions): IdleMonitor {
  let lastActivityAt = Date.now()
  let lastRenewAt = lastActivityAt
  let lastPostAt = 0
  let state: IdleState = { phase: 'active' }
  let running = true

  function stop(): void {
    running = false
    clearInterval(interval)
    unsubscribe()
  }

  function expire(): void {
    stop()
    onExpire()
  }

  function tick(): void {
    if (!running) return
    lastActivityAt = Math.max(lastActivityAt, channel.lastActivityAt() ?? 0)
    const next = idleStateAt(lastActivityAt, Date.now(), { timeoutMs, warningMs })
    if (next.phase === 'expired') {
      channel.post({ type: 'expired', at: Date.now() })
      expire()
      return
    }
    if (!isSameState(state, next)) {
      state = next
      onChange(next)
    }
  }

  function renew(at: number): void {
    lastRenewAt = at
    onRenew()
  }

  const interval = setInterval(tick, TICK_MS)
  const unsubscribe = channel.subscribe(message => {
    if (!running) return
    if (message.type === 'expired') {
      expire()
      return
    }
    lastActivityAt = Math.max(lastActivityAt, message.at)
    tick()
  })

  return {
    recordActivity() {
      tick()
      // During the warning only the button counts, so a moved mouse does not hide it
      if (!running || state.phase !== 'active') return
      const at = Date.now()
      lastActivityAt = at
      if (at - lastPostAt >= POST_EVERY_MS) {
        lastPostAt = at
        channel.post({ type: 'activity', at })
      }
      if (at - lastRenewAt >= renewEveryMs) renew(at)
    },

    stayConnected() {
      if (!running) return
      const at = Date.now()
      lastActivityAt = at
      channel.post({ type: 'continue', at })
      renew(at)
      tick()
    },

    stop,
  }
}
