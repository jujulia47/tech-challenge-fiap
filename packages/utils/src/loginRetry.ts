const SECOND_MS = 1_000
const MINUTE_SECONDS = 60
const CODE_PREFIX = 'rate_limited_'

// Auth.js hands only a short code to the browser, so the wait travels inside it
export function rateLimitCode(retryAfterMs: number): string {
  return `${CODE_PREFIX}${Math.ceil(retryAfterMs / SECOND_MS)}`
}

export function retryAfterMsFrom(code: string | undefined): number | null {
  if (!code?.startsWith(CODE_PREFIX)) return null
  const seconds = Number(code.slice(CODE_PREFIX.length))
  return Number.isInteger(seconds) && seconds > 0 ? seconds * SECOND_MS : null
}

export interface RetryWait {
  value: number
  unit: 'minute' | 'second'
}

// Minutes from one minute on, seconds below it. Always rounded up: the screen must never
// promise less time than what is left.
export function retryWait(remainingMs: number): RetryWait {
  const seconds = Math.ceil(Math.max(remainingMs, 0) / SECOND_MS)
  return seconds >= MINUTE_SECONDS
    ? { value: Math.ceil(seconds / MINUTE_SECONDS), unit: 'minute' }
    : { value: seconds, unit: 'second' }
}

// How long until the text of retryWait changes, so that the counter follows the end of the block:
// once a minute while it shows minutes, once a second below one minute
export function msUntilNextChange(remainingMs: number): number {
  const remaining = Math.max(remainingMs, 1)
  const wait = retryWait(remaining)
  if (wait.unit === 'second') return remaining % SECOND_MS || SECOND_MS
  // "1 minuto" holds until 59 seconds are left; "n minutos" until n - 1 minutes are left
  const next = wait.value === 1 ? (MINUTE_SECONDS - 1) * SECOND_MS : (wait.value - 1) * MINUTE_SECONDS * SECOND_MS
  return remaining - next
}

export function retryMessage(remainingMs: number): string {
  const { value, unit } = retryWait(remainingMs)
  const word = unit === 'minute' ? (value === 1 ? 'minuto' : 'minutos') : value === 1 ? 'segundo' : 'segundos'
  return `Muitas tentativas. Tente novamente em ${value} ${word}`
}
