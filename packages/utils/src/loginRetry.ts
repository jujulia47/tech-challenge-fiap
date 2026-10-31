const MINUTE_MS = 60_000
const CODE_PREFIX = 'rate_limited_'

// Auth.js hands only a short code to the browser, so the wait travels inside it
export function rateLimitCode(retryAfterMs: number): string {
  return `${CODE_PREFIX}${Math.ceil(retryAfterMs / 1_000)}`
}

export function retryAfterMsFrom(code: string | undefined): number | null {
  if (!code?.startsWith(CODE_PREFIX)) return null
  const seconds = Number(code.slice(CODE_PREFIX.length))
  return Number.isInteger(seconds) && seconds > 0 ? seconds * 1_000 : null
}

// Rounds up: the screen must never promise less time than what is left
export function minutesLeft(remainingMs: number): number {
  return Math.ceil(remainingMs / MINUTE_MS)
}

// How long until minutesLeft changes, so that the counter follows the end of the block
export function msUntilNextMinute(remainingMs: number): number {
  return remainingMs % MINUTE_MS || MINUTE_MS
}

export function retryMessage(minutes: number): string {
  return `Muitas tentativas. Tente novamente em ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
}
