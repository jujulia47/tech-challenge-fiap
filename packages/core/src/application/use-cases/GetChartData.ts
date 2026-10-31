import {
  filterByPeriod,
  totalsByMonth,
  totalsByType,
  type MonthTotal,
  type PeriodInMonths,
  type TypeTotal,
} from '../../domain/transaction/aggregations'
import type { TransactionType } from '../../domain/transaction/TransactionType'
import type { Clock } from '../ports/Clock'
import type { TransactionRepository } from '../ports/TransactionRepository'

export interface GetChartDataInput {
  userId: string
  period: PeriodInMonths
  // Narrows byMonth only. byType stays complete: it is the list the type is chosen from.
  type?: TransactionType
}

export interface ChartDataDTO {
  byMonth: MonthTotal[]
  byType: TypeTotal[]
}

export class GetChartData {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly clock: Clock,
  ) {}

  async execute({ userId, period, type }: GetChartDataInput): Promise<ChartDataDTO> {
    const transactions = await this.transactions.findAllByUser(userId)
    const inPeriod = filterByPeriod(transactions, period, this.clock.today())
    const ofType = type ? inPeriod.filter(transaction => transaction.type === type) : inPeriod
    return { byMonth: totalsByMonth(ofType), byType: totalsByType(inPeriod) }
  }
}
