import { describe, expect, it } from 'vitest'
import { aTransaction } from '../../testing/fakes'
import { CalendarDate } from '../value-objects/CalendarDate'
import { filterByPeriod, groupByMonth, sortNewestFirst, totalsByMonth, totalsByType } from './aggregations'

const ids = (list: { id: string }[]) => list.map(t => t.id)

describe('sortNewestFirst', () => {
  it('orders by date, newest first', () => {
    const sorted = sortNewestFirst([
      aTransaction({ id: 'old', date: '2022-11-18' }),
      aTransaction({ id: 'new', date: '2026-03-08' }),
      aTransaction({ id: 'mid', date: '2025-01-01' }),
    ])

    expect(ids(sorted)).toEqual(['new', 'mid', 'old'])
  })

  it('breaks date ties by id, in descending string order, whatever the input order', () => {
    const a = aTransaction({ id: '2', date: '2022-11-21' })
    const b = aTransaction({ id: '3', date: '2022-11-21' })

    expect(ids(sortNewestFirst([a, b]))).toEqual(['3', '2'])
    expect(ids(sortNewestFirst([b, a]))).toEqual(['3', '2'])
  })

  it('keeps entries with the same date and id next to each other', () => {
    const twin = aTransaction()

    expect(sortNewestFirst([twin, twin])).toEqual([twin, twin])
  })

  it('does not mutate the input', () => {
    const input = [aTransaction({ id: 'a', date: '2022-01-01' }), aTransaction({ id: 'b', date: '2023-01-01' })]
    sortNewestFirst(input)

    expect(ids(input)).toEqual(['a', 'b'])
  })
})

describe('groupByMonth', () => {
  it('returns no groups for no transactions', () => {
    expect(groupByMonth([])).toEqual([])
  })

  it('groups by month, newest month first and newest transaction first inside each group', () => {
    const groups = groupByMonth([
      aTransaction({ id: 'nov-18', date: '2022-11-18' }),
      aTransaction({ id: 'jan-20', date: '2026-01-20' }),
      aTransaction({ id: 'nov-21', date: '2022-11-21' }),
      aTransaction({ id: 'jan-15', date: '2026-01-15' }),
      aTransaction({ id: 'dec-10', date: '2022-12-10' }),
    ])

    expect(groups.map(g => g.monthKey)).toEqual(['2026-01', '2022-12', '2022-11'])
    expect(groups.map(g => ids(g.transactions))).toEqual([['jan-20', 'jan-15'], ['dec-10'], ['nov-21', 'nov-18']])
  })

  it('never mixes the same month of different years', () => {
    const groups = groupByMonth([
      aTransaction({ id: '2022', date: '2022-11-18' }),
      aTransaction({ id: '2026', date: '2026-11-05' }),
    ])

    expect(groups.map(g => g.monthKey)).toEqual(['2026-11', '2022-11'])
  })

  it('does not depend on the input order', () => {
    const a = aTransaction({ id: 'a', date: '2026-01-15' })
    const b = aTransaction({ id: 'b', date: '2022-11-18' })

    expect(groupByMonth([a, b])).toEqual(groupByMonth([b, a]))
  })

  it('crosses the turn of the year', () => {
    const groups = groupByMonth([
      aTransaction({ id: 'dec', date: '2025-12-31' }),
      aTransaction({ id: 'jan', date: '2026-01-01' }),
    ])

    expect(groups.map(g => g.monthKey)).toEqual(['2026-01', '2025-12'])
  })
})

describe('filterByPeriod', () => {
  const today = CalendarDate.fromISO('2026-05-15')

  it("'all' keeps everything, in a new array", () => {
    const input = [aTransaction({ date: '2001-01-01' })]
    const result = filterByPeriod(input, 'all', today)

    expect(result).toEqual(input)
    expect(result).not.toBe(input)
  })

  it('keeps the start date itself and drops the day before (3 months)', () => {
    const result = filterByPeriod(
      [
        aTransaction({ id: 'before', date: '2026-02-14' }),
        aTransaction({ id: 'start', date: '2026-02-15' }),
        aTransaction({ id: 'today', date: '2026-05-15' }),
      ],
      3,
      today,
    )

    expect(ids(result)).toEqual(['start', 'today'])
  })

  it('keeps the start date itself and drops the day before (6 months)', () => {
    const result = filterByPeriod(
      [aTransaction({ id: 'before', date: '2025-11-14' }), aTransaction({ id: 'start', date: '2025-11-15' })],
      6,
      today,
    )

    expect(ids(result)).toEqual(['start'])
  })

  it('crosses the turn of the year', () => {
    const result = filterByPeriod(
      [aTransaction({ id: 'before', date: '2025-10-14' }), aTransaction({ id: 'start', date: '2025-10-15' })],
      3,
      CalendarDate.fromISO('2026-01-15'),
    )

    expect(ids(result)).toEqual(['start'])
  })

  it('clamps at the end of the month: May 31 minus 3 months starts on February 28', () => {
    const result = filterByPeriod(
      [aTransaction({ id: 'before', date: '2026-02-27' }), aTransaction({ id: 'start', date: '2026-02-28' })],
      3,
      CalendarDate.fromISO('2026-05-31'),
    )

    expect(ids(result)).toEqual(['start'])
  })

  it('clamps to February 29 in a leap year', () => {
    const result = filterByPeriod(
      [aTransaction({ id: 'before', date: '2024-02-28' }), aTransaction({ id: 'start', date: '2024-02-29' })],
      3,
      CalendarDate.fromISO('2024-05-31'),
    )

    expect(ids(result)).toEqual(['start'])
  })

  it('returns nothing for no transactions', () => {
    expect(filterByPeriod([], 3, today)).toEqual([])
  })
})

describe('totalsByMonth', () => {
  it('returns no totals for no transactions', () => {
    expect(totalsByMonth([])).toEqual([])
  })

  it('sums magnitudes per month in chronological order', () => {
    const totals = totalsByMonth([
      aTransaction({ id: '1', date: '2026-01-15', type: 'deposit', amountInCents: 250000 }),
      aTransaction({ id: '2', date: '2026-01-20', type: 'payment', amountInCents: 35000 }),
      aTransaction({ id: '3', date: '2025-12-31', type: 'deposit', amountInCents: 100 }),
    ])

    expect(totals).toEqual([
      { monthKey: '2025-12', amountInCents: 100 },
      { monthKey: '2026-01', amountInCents: 285000 },
    ])
  })

  it('keeps the same month of different years apart', () => {
    const totals = totalsByMonth([
      aTransaction({ id: '1', date: '2022-11-18', amountInCents: 100 }),
      aTransaction({ id: '2', date: '2026-11-05', amountInCents: 200 }),
    ])

    expect(totals.map(t => t.monthKey)).toEqual(['2022-11', '2026-11'])
  })
})

describe('totalsByType', () => {
  it('returns no totals for no transactions', () => {
    expect(totalsByType([])).toEqual([])
  })

  it('sums magnitudes per type, even for expenses, and omits absent types', () => {
    const totals = totalsByType([
      aTransaction({ id: '1', type: 'payment', amountInCents: 35000 }),
      aTransaction({ id: '2', type: 'deposit', amountInCents: 100 }),
      aTransaction({ id: '3', type: 'payment', amountInCents: 15000 }),
    ])

    expect(totals).toEqual([
      { type: 'deposit', amountInCents: 100 },
      { type: 'payment', amountInCents: 50000 },
    ])
  })
})
