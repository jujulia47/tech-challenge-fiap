import { createTransactionsStore } from '@bytebank/store'
import { transactionsApi } from './transactionsApi'

export const store = createTransactionsStore(transactionsApi)
