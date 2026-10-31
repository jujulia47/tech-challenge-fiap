export type ApplicationErrorCode =
  | 'TRANSACTION_NOT_FOUND'
  | 'TRANSACTION_DATE_IN_FUTURE'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'RATE_LIMITED'
  | 'INVALID_RESET_TOKEN'

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode

  constructor(code: ApplicationErrorCode, message: string) {
    super(message)
    this.name = 'ApplicationError'
    this.code = code
  }
}
