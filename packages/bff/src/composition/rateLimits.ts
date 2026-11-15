const MINUTE_MS = 60_000

type Env = Record<string, string | undefined>

export interface RateLimit {
  maxHits: number
  windowMs: number
}

// Why these: docs/fase4/security.md
export const LOGIN_BY_EMAIL: RateLimit = { maxHits: 5, windowMs: 15 * MINUTE_MS }
export const LOGIN_BY_IP: RateLimit = { maxHits: 20, windowMs: 15 * MINUTE_MS }
export const REGISTER_BY_IP: RateLimit = { maxHits: 10, windowMs: 60 * MINUTE_MS }
// The reset requests keep their own window: RATE_LIMIT_WINDOW_SECONDS is about the login only
export const RESET_REQUEST_BY_EMAIL: RateLimit = { maxHits: 5, windowMs: 15 * MINUTE_MS }
export const RESET_REQUEST_BY_IP: RateLimit = { maxHits: 20, windowMs: 15 * MINUTE_MS }

// The counters in Postgres. One name, one count: the login and the password change share
// loginByEmail, so 5 guesses spread over both still block.
export const LIMIT_NAMESPACES = {
  loginByEmail: 'login-email',
  loginByIp: 'login-ip',
  registerByIp: 'register-ip',
  resetRequestByEmail: 'reset-request-email',
  resetRequestByIp: 'reset-request-ip',
} as const

export interface LoginLimits {
  byEmail: RateLimit
  byIp: RateLimit
}

// RATE_LIMIT_WINDOW_SECONDS shortens the block of the login, and of the password change, which
// counts with the login, for a demonstration. Like the idle times, it can only shorten: a value
// above the default, empty or not a positive integer is ignored. The number of attempts stays.
export function readLoginLimits(env: Env): LoginLimits {
  const raw = env.RATE_LIMIT_WINDOW_SECONDS
  const seconds = Number(raw)
  const valid = Boolean(raw) && Number.isInteger(seconds) && seconds > 0
  const window = (limit: RateLimit): RateLimit =>
    valid && seconds * 1_000 < limit.windowMs ? { ...limit, windowMs: seconds * 1_000 } : limit
  return { byEmail: window(LOGIN_BY_EMAIL), byIp: window(LOGIN_BY_IP) }
}
