const MINUTE_MS = 60_000

// Why these: docs/fase4/security.md
export const LOGIN_BY_EMAIL = { maxHits: 5, windowMs: 15 * MINUTE_MS }
export const LOGIN_BY_IP = { maxHits: 20, windowMs: 15 * MINUTE_MS }
export const REGISTER_BY_IP = { maxHits: 10, windowMs: 60 * MINUTE_MS }
