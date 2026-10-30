import {
  filterByPeriod,
  totalsByMonth,
  totalsByType,
  type MonthTotal,
  type PeriodInMonths,
  type TypeTotal,
} from '../../domain/transaction/aggregations'
import type { Clock } from '../ports/Clock'
import type { TransactionRepository } from '../ports/TransactionRepository'

export interface GetChartDataInput {
  userId: string
  period: PeriodInMonths
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

  async execute({ userId, period }: GetChartDataInput): Promise<ChartDataDTO> {
    const transactions = await this.transactions.findAllByUser(userId)
    const inPeriod = filterByPeriod(transactions, period, this.clock.today())
    return { byMonth: totalsByMonth(inPeriod), byType: totalsByType(inPeriod) }
  }
}
