export type DomainErrorCode =
  | 'MONEY_INVALID_CENTS'
  | 'CALENDAR_DATE_INVALID_FORMAT'
  | 'CALENDAR_DATE_INVALID_VALUE'
  | 'TRANSACTION_INVALID_ID'
  | 'TRANSACTION_INVALID_USER_ID'
  | 'TRANSACTION_INVALID_TYPE'
  | 'TRANSACTION_INVALID_AMOUNT'
  | 'USER_INVALID_ID'
  | 'USER_INVALID_NAME'
  | 'USER_INVALID_EMAIL'
  | 'USER_INVALID_PASSWORD_HASH'
  | 'USER_INVALID_SESSIONS_VALID_AFTER'
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_TOO_LONG'
  | 'PASSWORD_TOO_COMMON'
  | 'PASSWORD_HAS_PERSONAL_CONTEXT'

export class DomainError extends Error {
  readonly code: DomainErrorCode

  constructor(code: DomainErrorCode, message: string) {
    super(message)
    this.name = 'DomainError'
    this.code = code
  }
}
