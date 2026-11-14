// The server entry of the bff: composition and handlers. A client component that imports it fails
// the build. The browser uses @bytebank/bff/client, which has no such import.
import 'server-only'

export { createUseCases } from './composition/createUseCases'
export type { UseCaseDependencies, UseCases } from './composition/createUseCases'
export { createJsonServerUseCases, createStoredUseCases } from './composition/createJsonServerUseCases'
export type { JsonServerUseCasesOptions, StoredUseCasesOptions } from './composition/createJsonServerUseCases'
export { createDataAdapters, readDataBackend } from './composition/dataAdapters'
export type { DataAdapters, DataBackend, RateLimitOptions } from './composition/dataAdapters'
export { createLazyAccountHandlers } from './composition/createLazyAccountHandlers'
export { createSessionRevocation, getSessionRevocation } from './composition/sessionRevocation'
export type { SessionRevocation } from './composition/sessionRevocation'
export { createLazyTransactionHandlers } from './composition/createLazyTransactionHandlers'
export { createAuthUseCases, createJsonServerAuthUseCases } from './composition/createJsonServerAuthUseCases'
export type { AuthUseCases, AuthUseCasesOptions, JsonServerAuthOptions } from './composition/createJsonServerAuthUseCases'
export { createPasswordResetHandlers } from './http/createPasswordResetHandlers'
export type { PasswordResetHandlers, PasswordResetHandlersOptions } from './http/createPasswordResetHandlers'
export { clientIp } from './http/clientIp'
export { createAccountHandlers } from './http/createAccountHandlers'
export { createEndSessionsHandler } from './http/createEndSessionsHandler'
export type { EndSessionsHandlerOptions } from './http/createEndSessionsHandler'
export type { AccountHandlers, AccountHandlersOptions } from './http/createAccountHandlers'
export { createRegisterHandler } from './http/createRegisterHandler'
export type { RegisterHandlerOptions } from './http/createRegisterHandler'
export { createTransactionHandlers } from './http/createTransactionHandlers'
export type {
  Logger,
  TransactionHandlers,
  TransactionHandlersOptions,
} from './http/createTransactionHandlers'
