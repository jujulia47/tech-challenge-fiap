interface InfrastructureErrorDetails {
  status?: number
  url?: string
}

// Carries the status and URL only: response bodies never go into errors
export class InfrastructureError extends Error {
  readonly status?: number
  readonly url?: string

  constructor(message: string, details: InfrastructureErrorDetails = {}) {
    super(message)
    this.name = 'InfrastructureError'
    this.status = details.status
    this.url = details.url
  }
}
