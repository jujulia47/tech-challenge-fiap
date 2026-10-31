import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createIdleMonitor, idleStateAt, type IdleChannel, type IdleMessage, type IdleState } from './idleMonitor'

const MINUTE = 60_000
const times = { timeoutMs: 10 * MINUTE, warningMs: MINUTE }

// Tabs that share one channel, like localStorage does: nobody hears their own message
function sharedChannel() {
  let stored: IdleMessage | null = null
  const listeners = new Set<(message: IdleMessage) => void>()
  return (): IdleChannel => {
    let own: ((message: IdleMessage) => void) | undefined
    return {
      post(message) {
        stored = message
        for (const listener of listeners) if (listener !== own) listener(message)
      },
      subscribe(listener) {
        own = listener
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      lastActivityAt: () => (stored && stored.type !== 'expired' ? stored.at : null),
    }
  }
}

function tab(channel: IdleChannel, renewEveryMs = 5 * MINUTE) {
  const states: IdleState[] = []
  const onExpire = vi.fn()
  const onRenew = vi.fn()
  const monitor = createIdleMonitor({
    ...times,
    renewEveryMs,
    channel,
    onChange: state => states.push(state),
    onExpire,
    onRenew,
  })
  return { monitor, states, onExpire, onRenew, last: () => states.at(-1) }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('idleStateAt', () => {
  it.each([
    [0, { phase: 'active' }],
    [9 * MINUTE - 1, { phase: 'active' }],
    [9 * MINUTE, { phase: 'warning', remainingSeconds: 60 }],
    [10 * MINUTE - 500, { phase: 'warning', remainingSeconds: 1 }],
    [10 * MINUTE, { phase: 'expired' }],
  ])('after %d ms', (elapsed, state) => {
    expect(idleStateAt(0, elapsed, times)).toEqual(state)
  })
})

describe('createIdleMonitor', () => {
  it('stays quiet before the warning', () => {
    const { states, onExpire } = tab(sharedChannel()())

    vi.advanceTimersByTime(9 * MINUTE - 1_000)

    expect(states).toEqual([])
    expect(onExpire).not.toHaveBeenCalled()
  })

  it('warns one minute before and counts down', () => {
    const { last } = tab(sharedChannel()())

    vi.advanceTimersByTime(9 * MINUTE)
    expect(last()).toEqual({ phase: 'warning', remainingSeconds: 60 })

    vi.advanceTimersByTime(45_000)
    expect(last()).toEqual({ phase: 'warning', remainingSeconds: 15 })
  })

  it('expires once, without an answer, and stops', () => {
    const { onExpire } = tab(sharedChannel()())

    vi.advanceTimersByTime(30 * MINUTE)

    expect(onExpire).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('restarts the count on activity', () => {
    const { monitor, states } = tab(sharedChannel()())

    vi.advanceTimersByTime(8 * MINUTE)
    monitor.recordActivity()
    vi.advanceTimersByTime(8 * MINUTE)

    expect(states).toEqual([])
  })

  it('ignores activity during the warning: only the button answers it', () => {
    const { monitor, onExpire } = tab(sharedChannel()())

    vi.advanceTimersByTime(9 * MINUTE + 1_000)
    monitor.recordActivity()
    vi.advanceTimersByTime(MINUTE)

    expect(onExpire).toHaveBeenCalledOnce()
  })

  it('keeps the session with the button, and renews it', () => {
    const { monitor, onExpire, onRenew, last } = tab(sharedChannel()())

    vi.advanceTimersByTime(9 * MINUTE + 1_000)
    monitor.stayConnected()

    expect(last()).toEqual({ phase: 'active' })
    expect(onRenew).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(8 * MINUTE)
    expect(onExpire).not.toHaveBeenCalled()
  })

  it('expires at once after the computer slept, even if the first event is activity', () => {
    const { monitor, onExpire } = tab(sharedChannel()())

    vi.setSystemTime(Date.now() + 60 * MINUTE)
    monitor.recordActivity()

    expect(onExpire).toHaveBeenCalledOnce()
  })

  it('renews the session while in use, at most once per period', () => {
    const { monitor, onRenew } = tab(sharedChannel()())

    for (let minute = 0; minute < 12; minute += 1) {
      vi.advanceTimersByTime(MINUTE)
      monitor.recordActivity()
    }

    expect(onRenew).toHaveBeenCalledTimes(2)
  })

  it('does not renew without activity', () => {
    const { onRenew } = tab(sharedChannel()())

    vi.advanceTimersByTime(8 * MINUTE)

    expect(onRenew).not.toHaveBeenCalled()
  })

  it('stops on demand', () => {
    const { monitor, onExpire } = tab(sharedChannel()())

    monitor.stop()
    monitor.stayConnected()
    monitor.recordActivity()
    vi.advanceTimersByTime(30 * MINUTE)

    expect(onExpire).not.toHaveBeenCalled()
  })

  describe('between tabs', () => {
    it('keeps a tab connected while another is in use', () => {
      const channel = sharedChannel()
      const used = tab(channel())
      const idle = tab(channel())

      for (let minute = 0; minute < 30; minute += 1) {
        vi.advanceTimersByTime(MINUTE)
        used.monitor.recordActivity()
      }

      expect(idle.states).toEqual([])
      expect(idle.onExpire).not.toHaveBeenCalled()
    })

    it('reads the activity it missed while frozen', () => {
      const channel = sharedChannel()
      const used = tab(channel())
      const frozen = tab({ ...channel(), subscribe: () => () => undefined })

      for (let minute = 0; minute < 30; minute += 1) {
        vi.advanceTimersByTime(MINUTE)
        used.monitor.recordActivity()
      }

      expect(frozen.onExpire).not.toHaveBeenCalled()
    })

    it('hides the warning of every tab when one answers it', () => {
      const channel = sharedChannel()
      const first = tab(channel())
      const second = tab(channel())

      vi.advanceTimersByTime(9 * MINUTE + 1_000)
      first.monitor.stayConnected()

      expect(second.last()).toEqual({ phase: 'active' })
    })

    it('ends every tab when one expires', () => {
      const channel = sharedChannel()
      const first = tab(channel())
      const second = tab(channel())

      vi.advanceTimersByTime(10 * MINUTE)

      expect(first.onExpire).toHaveBeenCalledOnce()
      expect(second.onExpire).toHaveBeenCalledOnce()
    })
  })
})
