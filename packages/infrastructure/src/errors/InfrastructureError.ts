export type InfrastructureErrorCode =
  | 'UPSTREAM_UNREACHABLE'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_BAD_STATUS'
  | 'UPSTREAM_INVALID_RESPONSE'
  | 'CORRUPTED_RECORD'

interface InfrastructureErrorDetails {
  code?: InfrastructureErrorCode
  status?: number
  url?: string
  cause?: unknown
}

// Response bodies never go into errors. Migration errors have no code: only the message is reported.
export class InfrastructureError extends Error {
  readonly code?: InfrastructureErrorCode
  readonly status?: number
  readonly url?: string

  constructor(message: string, details: InfrastructureErrorDetails = {}) {
    super(message, { cause: details.cause })
    this.name = 'InfrastructureError'
    this.code = details.code
    this.status = details.status
    this.url = details.url
  }
}
