import { configureStore } from '@reduxjs/toolkit'
import type { TransactionsApi } from './createTransactionsApi'

export function createTransactionsStore(api: TransactionsApi) {
  return configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(api.middleware),
  })
}
