export { DomainError } from './domain/errors/DomainError'
export type { DomainErrorCode } from './domain/errors/DomainError'
export { Money } from './domain/value-objects/Money'
export { CalendarDate } from './domain/value-objects/CalendarDate'
export { TRANSACTION_TYPES, isTransactionType, transactionDirection } from './domain/transaction/TransactionType'
export type { TransactionDirection, TransactionType } from './domain/transaction/TransactionType'
export { Transaction } from './domain/transaction/Transaction'
export type {
  RawTransactionPrimitives,
  TransactionChanges,
  TransactionPrimitives,
  TransactionProps,
} from './domain/transaction/Transaction'
export {
  filterByPeriod,
  groupByMonth,
  sortNewestFirst,
  totalsByMonth,
  totalsByType,
} from './domain/transaction/aggregations'
export type { MonthGroup, MonthTotal, PeriodInMonths, TypeTotal } from './domain/transaction/aggregations'

export { User, normalizeEmail } from './domain/user/User'
export {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  findPasswordIssue,
  passwordLength,
} from './domain/user/passwordPolicy'
export type { PasswordContext, PasswordIssue } from './domain/user/passwordPolicy'
export type { UserProps } from './domain/user/User'

export { ApplicationError } from './application/errors/ApplicationError'
export type { ApplicationErrorCode } from './application/errors/ApplicationError'
export { RateLimitedError } from './application/errors/RateLimitedError'
export type { Clock } from './application/ports/Clock'
export type { CommonPasswordList } from './application/ports/CommonPasswordList'
export type { EmailMessage, EmailSender } from './application/ports/EmailSender'
export type {
  PasswordResetToken,
  PasswordResetTokenRepository,
  ResetTokenGenerator,
} from './application/ports/PasswordResetTokens'
export type { DataCipher } from './application/ports/DataCipher'
export type { IdGenerator } from './application/ports/IdGenerator'
export type { TransactionRepository } from './application/ports/TransactionRepository'
export type { PasswordHasher } from './application/ports/PasswordHasher'
export type { RateLimiter, RateLimitResult } from './application/ports/RateLimiter'
export type { UserRepository } from './application/ports/UserRepository'
export type { TransactionDTO } from './application/TransactionDTO'
export type { UserDTO } from './application/UserDTO'
export { AuthenticateUser } from './application/use-cases/AuthenticateUser'
export type { AuthenticateUserInput, LoginRateLimiters } from './application/use-cases/AuthenticateUser'
export { RegisterUser } from './application/use-cases/RegisterUser'
export type { RegisterUserInput } from './application/use-cases/RegisterUser'
export { RequestPasswordReset } from './application/use-cases/RequestPasswordReset'
export { ResetPassword } from './application/use-cases/ResetPassword'
export { ListTransactions } from './application/use-cases/ListTransactions'
export { CreateTransaction } from './application/use-cases/CreateTransaction'
export type { CreateTransactionInput } from './application/use-cases/CreateTransaction'
export { UpdateTransaction } from './application/use-cases/UpdateTransaction'
export type { UpdateTransactionInput } from './application/use-cases/UpdateTransaction'
export { DeleteTransaction } from './application/use-cases/DeleteTransaction'
export type { DeleteTransactionInput } from './application/use-cases/DeleteTransaction'
export { GetBalance } from './application/use-cases/GetBalance'
export type { BalanceDTO } from './application/use-cases/GetBalance'
export { GetStatement } from './application/use-cases/GetStatement'
export type { StatementDTO } from './application/use-cases/GetStatement'
export { GetChartData } from './application/use-cases/GetChartData'
export type { ChartDataDTO, GetChartDataInput } from './application/use-cases/GetChartData'
