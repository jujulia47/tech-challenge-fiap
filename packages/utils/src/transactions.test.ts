import { describe, expect, expectTypeOf, it } from 'vitest'
import type { Transaction, TransactionType } from '@bytebank/types'
import { TRANSACTION_OPTIONS, capitalizeMonth, groupByMonth } from './transactions'

// Same records as apps/shell/db.json, in the same order
const DB_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '18/11/2022', label: 'Depósito', amount: 'R$ 150,00', month: 'novembro' },
  { id: '2', date: '21/11/2022', label: 'Depósito', amount: 'R$ 100,00', month: 'novembro' },
  { id: '3', date: '21/11/2022', label: 'Depósito', amount: 'R$ 50,00', month: 'novembro' },
  { id: '6', date: '10/12/2022', label: 'Transferência', amount: 'R$ 100,00', month: 'dezembro' },
  { id: '7', date: '15/01/2026', label: 'Depósito', amount: 'R$ 2.500,00', month: 'janeiro' },
  { id: '8', date: '20/01/2026', label: 'Pagamento', amount: 'R$ 350,00', month: 'janeiro' },
  { id: '11', date: '08/03/2026', label: 'Câmbio de Moeda', amount: 'R$ 1.200,00', month: 'março' },
]

function tx(id: string, date: string, month: string, label: TransactionType = 'Depósito'): Transaction {
  return { id, date, label, amount: 'R$ 100,00', month }
}

const ids = (list: Transaction[]) => list.map(t => t.id)

describe('TRANSACTION_OPTIONS', () => {
  it('lists the seven transaction types in a fixed order', () => {
    expect(TRANSACTION_OPTIONS.map(o => o.value)).toEqual([
      'Câmbio de Moeda',
      'DOC/TED',
      'Empréstimo e Financiamento',
      'Depósito',
      'Saque',
      'Transferência',
      'Pagamento',
    ])
  })

  it('uses the same text for value and label', () => {
    for (const option of TRANSACTION_OPTIONS) {
      expect(option.label).toBe(option.value)
    }
  })

  it('covers every TransactionType exactly once', () => {
    const allTypes: TransactionType[] = [
      'Depósito',
      'Saque',
      'Transferência',
      'Pagamento',
      'Câmbio de Moeda',
      'DOC/TED',
      'Empréstimo e Financiamento',
    ]
    const values = TRANSACTION_OPTIONS.map(o => o.value)
    expect(new Set(values).size).toBe(values.length)
    expect([...values].sort()).toEqual([...allTypes].sort())
  })

  // Characterization: current behavior, see docs/fase4/testing.md
  it('types option values as plain string, not as TransactionType', () => {
    expectTypeOf(TRANSACTION_OPTIONS[0].value).toEqualTypeOf<string>()
  })
})

describe('capitalizeMonth', () => {
  it('uppercases the first letter of a month name', () => {
    expect(capitalizeMonth('novembro')).toBe('Novembro')
  })

  it('handles accented first letters and keeps accents in the rest', () => {
    expect(capitalizeMonth('março')).toBe('Março')
  })

  it('returns an empty string for an empty string', () => {
    expect(capitalizeMonth('')).toBe('')
  })

  it('leaves the rest of the string unchanged', () => {
    expect(capitalizeMonth('NOVEMBRO')).toBe('NOVEMBRO')
    expect(capitalizeMonth('novembro de 2022')).toBe('Novembro de 2022')
  })

  // Characterization: current behavior, see docs/fase4/testing.md
  it('does not trim, so a leading space prevents capitalization', () => {
    expect(capitalizeMonth(' novembro')).toBe(' novembro')
  })
})

describe('groupByMonth', () => {
  it('returns an empty list for no transactions', () => {
    expect(groupByMonth([])).toEqual([])
  })

  it('returns a single group for a single transaction', () => {
    const only = tx('1', '18/11/2022', 'novembro')
    expect(groupByMonth([only])).toEqual([{ month: 'novembro', transactions: [only] }])
  })

  it('groups the db.json transactions by month, last month first', () => {
    const groups = groupByMonth(DB_TRANSACTIONS)
    expect(groups.map(g => g.month)).toEqual(['março', 'janeiro', 'dezembro', 'novembro'])
  })

  it('reverses the order of the transactions inside each group', () => {
    const groups = groupByMonth(DB_TRANSACTIONS)
    expect(groups.map(g => ids(g.transactions))).toEqual([['11'], ['8', '7'], ['6'], ['3', '2', '1']])
  })

  it('keeps every transaction exactly once', () => {
    const groups = groupByMonth(DB_TRANSACTIONS)
    const all = groups.flatMap(g => ids(g.transactions))
    expect(all.sort()).toEqual(ids(DB_TRANSACTIONS).sort())
  })

  it('does not mutate the input array', () => {
    const input = [...DB_TRANSACTIONS]
    groupByMonth(input)
    expect(ids(input)).toEqual(ids(DB_TRANSACTIONS))
  })

  // Characterization: current behavior, see docs/fase4/testing.md
  it('orders groups by position in the array, not by date', () => {
    // The newest transaction comes first in the array, so its month ends up last
    const groups = groupByMonth([
      tx('7', '15/01/2026', 'janeiro'),
      tx('1', '18/11/2022', 'novembro'),
    ])
    expect(groups.map(g => g.month)).toEqual(['novembro', 'janeiro'])
  })

  // Characterization: current behavior, see docs/fase4/testing.md
  it('merges the same month of different years into one group', () => {
    const groups = groupByMonth([
      tx('1', '18/11/2022', 'novembro'),
      tx('2', '05/11/2026', 'novembro'),
    ])
    expect(groups).toHaveLength(1)
    expect(ids(groups[0].transactions)).toEqual(['2', '1'])
  })

  // Characterization: current behavior, see docs/fase4/testing.md
  it('treats month names with different casing as different groups', () => {
    const groups = groupByMonth([
      tx('1', '18/11/2022', 'novembro'),
      tx('2', '19/11/2022', 'Novembro'),
    ])
    expect(groups.map(g => g.month)).toEqual(['Novembro', 'novembro'])
  })

  // Characterization: current behavior, see docs/fase4/testing.md
  it('groups by the stored month field, even when it does not match the date', () => {
    const groups = groupByMonth([tx('1', '18/11/2022', 'janeiro')])
    expect(groups.map(g => g.month)).toEqual(['janeiro'])
  })
})
