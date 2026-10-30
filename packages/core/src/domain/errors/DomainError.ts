export type DomainErrorCode =
  | 'MONEY_INVALID_CENTS'
  | 'CALENDAR_DATE_INVALID_FORMAT'
  | 'CALENDAR_DATE_INVALID_VALUE'
  | 'TRANSACTION_INVALID_ID'
  | 'TRANSACTION_INVALID_USER_ID'
  | 'TRANSACTION_INVALID_TYPE'
  | 'TRANSACTION_INVALID_AMOUNT'

export class DomainError extends Error {
  readonly code: DomainErrorCode

  constructor(code: DomainErrorCode, message: string) {
    super(message)
    this.name = 'DomainError'
    this.code = code
  }
}
