const MINUTE_MS = 60_000

// Why these: docs/fase4/security.md
export const LOGIN_BY_EMAIL = { maxHits: 5, windowMs: 15 * MINUTE_MS }
export const LOGIN_BY_IP = { maxHits: 20, windowMs: 15 * MINUTE_MS }
export const REGISTER_BY_IP = { maxHits: 10, windowMs: 60 * MINUTE_MS }

// The counters in Postgres. One name, one count: the login and the password change share
// loginByEmail, so 5 guesses spread over both still block.
export const LIMIT_NAMESPACES = {
  loginByEmail: 'login-email',
  loginByIp: 'login-ip',
  registerByIp: 'register-ip',
  resetRequestByEmail: 'reset-request-email',
  resetRequestByIp: 'reset-request-ip',
} as const
