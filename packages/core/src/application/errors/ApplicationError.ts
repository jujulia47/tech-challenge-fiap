export type ApplicationErrorCode = 'TRANSACTION_NOT_FOUND' | 'TRANSACTION_DATE_IN_FUTURE'

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode

  constructor(code: ApplicationErrorCode, message: string) {
    super(message)
    this.name = 'ApplicationError'
    this.code = code
  }
}
