export interface SessionPolicy {
  maxAgeSeconds: number
  updateAgeSeconds: number
  idleTimeoutSeconds: number
  idleWarningSeconds: number
}

// The only place with these values. Why these: docs/fase4/security.md
export const SESSION_POLICY: SessionPolicy = {
  maxAgeSeconds: 30 * 60,
  updateAgeSeconds: 5 * 60,
  idleTimeoutSeconds: 10 * 60,
  idleWarningSeconds: 60,
}

type Env = Record<string, string | undefined>

// A variable can only shorten a value: a mistake must never make the session last longer
function shortened(value: string | undefined, limit: number): number {
  const seconds = Number(value)
  return value && Number.isInteger(seconds) && seconds > 0 && seconds <= limit ? seconds : limit
}

export function readSessionPolicy(env: Env): SessionPolicy {
  const maxAgeSeconds = shortened(env.SESSION_MAX_AGE_SECONDS, SESSION_POLICY.maxAgeSeconds)
  const idleTimeoutSeconds = shortened(env.IDLE_TIMEOUT_SECONDS, SESSION_POLICY.idleTimeoutSeconds)
  const idleWarningSeconds = shortened(env.IDLE_WARNING_SECONDS, SESSION_POLICY.idleWarningSeconds)
  return {
    maxAgeSeconds,
    updateAgeSeconds: Math.min(SESSION_POLICY.updateAgeSeconds, Math.ceil(maxAgeSeconds / 3)),
    idleTimeoutSeconds,
    // The warning must fit inside the timeout
    idleWarningSeconds: idleWarningSeconds < idleTimeoutSeconds ? idleWarningSeconds : Math.ceil(idleTimeoutSeconds / 3),
  }
}
