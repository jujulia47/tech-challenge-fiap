import {
  CreateTransaction,
  DeleteTransaction,
  GetBalance,
  GetChartData,
  GetStatement,
  ListTransactions,
  UpdateTransaction,
  type Clock,
  type IdGenerator,
  type TransactionRepository,
} from '@bytebank/core'

export interface UseCaseDependencies {
  repository: TransactionRepository
  clock: Clock
  idGenerator: IdGenerator
}

export interface UseCases {
  listTransactions: ListTransactions
  createTransaction: CreateTransaction
  updateTransaction: UpdateTransaction
  deleteTransaction: DeleteTransaction
  getBalance: GetBalance
  getStatement: GetStatement
  getChartData: GetChartData
}

export function createUseCases({ repository, clock, idGenerator }: UseCaseDependencies): UseCases {
  return {
    listTransactions: new ListTransactions(repository),
    createTransaction: new CreateTransaction(repository, clock, idGenerator),
    updateTransaction: new UpdateTransaction(repository, clock),
    deleteTransaction: new DeleteTransaction(repository),
    getBalance: new GetBalance(repository),
    getStatement: new GetStatement(repository),
    getChartData: new GetChartData(repository, clock),
  }
}
