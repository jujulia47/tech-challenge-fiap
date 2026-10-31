import { ApplicationError } from './ApplicationError'

export class RateLimitedError extends ApplicationError {
  readonly retryAfterMs: number

  constructor(retryAfterMs: number) {
    super('RATE_LIMITED', 'Too many attempts')
    this.name = 'RateLimitedError'
    this.retryAfterMs = retryAfterMs
  }
}
