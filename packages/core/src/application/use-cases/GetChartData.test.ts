import { describe, expect, it } from 'vitest'
import { aTransaction, FixedClock } from '../../testing/fakes'
import { InMemoryTransactionRepository } from '../../testing/InMemoryTransactionRepository'
import { GetChartData } from './GetChartData'

const clock = new FixedClock('2026-05-31')

function setup() {
  return new GetChartData(
    new InMemoryTransactionRepository([
      aTransaction({ id: 'old', date: '2025-01-10', type: 'deposit', amountInCents: 1000 }),
      aTransaction({ id: 'six', date: '2025-12-20', type: 'payment', amountInCents: 200 }),
      aTransaction({ id: 'limit', date: '2026-02-28', type: 'payment', amountInCents: 30 }),
      aTransaction({ id: 'before-limit', date: '2026-02-27', type: 'loan', amountInCents: 4 }),
      aTransaction({ id: 'other-user', userId: 'user-b', date: '2026-05-01', amountInCents: 9999 }),
    ]),
    clock,
  )
}

describe('GetChartData', () => {
  it("'all' includes every transaction of the user", async () => {
    await expect(setup().execute({ userId: 'user-a', period: 'all' })).resolves.toEqual({
      byMonth: [
        { monthKey: '2025-01', amountInCents: 1000 },
        { monthKey: '2025-12', amountInCents: 200 },
        { monthKey: '2026-02', amountInCents: 34 },
      ],
      byType: [
        { type: 'deposit', amountInCents: 1000 },
        { type: 'payment', amountInCents: 230 },
        { type: 'loan', amountInCents: 4 },
      ],
    })
  })

  it('uses the clock for the start of the period, clamped at the end of the month', async () => {
    await expect(setup().execute({ userId: 'user-a', period: 3 })).resolves.toEqual({
      byMonth: [{ monthKey: '2026-02', amountInCents: 30 }],
      byType: [{ type: 'payment', amountInCents: 30 }],
    })
  })

  it('supports the 6 month period', async () => {
    const { byMonth } = await setup().execute({ userId: 'user-a', period: 6 })

    expect(byMonth.map(m => m.monthKey)).toEqual(['2025-12', '2026-02'])
  })

  describe('filter by type', () => {
    it('narrows byMonth to the type', async () => {
      const { byMonth } = await setup().execute({ userId: 'user-a', period: 'all', type: 'payment' })

      expect(byMonth).toEqual([
        { monthKey: '2025-12', amountInCents: 200 },
        { monthKey: '2026-02', amountInCents: 30 },
      ])
    })

    it('keeps every type in byType, which is what the type is chosen from', async () => {
      const { byType } = await setup().execute({ userId: 'user-a', period: 'all', type: 'payment' })

      expect(byType).toEqual([
        { type: 'deposit', amountInCents: 1000 },
        { type: 'payment', amountInCents: 230 },
        { type: 'loan', amountInCents: 4 },
      ])
    })

    it('combines with the period', async () => {
      const { byMonth, byType } = await setup().execute({ userId: 'user-a', period: 3, type: 'payment' })

      expect(byMonth).toEqual([{ monthKey: '2026-02', amountInCents: 30 }])
      expect(byType).toEqual([{ type: 'payment', amountInCents: 30 }])
    })

    it('gives an empty byMonth for a type with no transactions in the period', async () => {
      const { byMonth, byType } = await setup().execute({ userId: 'user-a', period: 3, type: 'deposit' })

      expect(byMonth).toEqual([])
      expect(byType).toEqual([{ type: 'payment', amountInCents: 30 }])
    })

    it('does not reach transactions of other users', async () => {
      const { byMonth } = await setup().execute({ userId: 'user-a', period: 'all', type: 'deposit' })

      expect(byMonth).toEqual([{ monthKey: '2025-01', amountInCents: 1000 }])
    })

    it('gives the same result with no filter and with undefined', async () => {
      const useCase = setup()

      expect(await useCase.execute({ userId: 'user-a', period: 'all', type: undefined })).toEqual(
        await useCase.execute({ userId: 'user-a', period: 'all' }),
      )
    })
  })

  it('returns empty totals when the user has no transactions', async () => {
    await expect(setup().execute({ userId: 'nobody', period: 'all' })).resolves.toEqual({ byMonth: [], byType: [] })
  })
})
