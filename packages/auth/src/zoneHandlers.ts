import 'server-only'
import { createLazyAccountHandlers, createLazyTransactionHandlers } from '@bytebank/bff'
import { auth } from './zone'

const sessionUserId = async () => (await auth())?.user?.id ?? null

// The bff builds the handlers and knows nothing about Next. This only tells it who is logged in.
export const getTransactionHandlers = createLazyTransactionHandlers(sessionUserId)
export const getAccountHandlers = createLazyAccountHandlers(sessionUserId)
