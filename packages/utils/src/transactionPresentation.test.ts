import { TRANSACTION_TYPES, type TransactionDTO, type TransactionType } from '@bytebank/core'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_OPTIONS,
  formatDateBR,
  formatMonthKey,
  formatSignedCents,
  groupDtosByMonth,
} from './transactionPresentation'

const dto = (id: string, date: string): TransactionDTO => ({
  id,
  userId: 'user-a',
  type: 'deposit',
  amountInCents: 100,
  date,
})

describe('TRANSACTION_TYPE_LABELS', () => {
  it.each([
    ['deposit', 'Depósito'],
    ['withdrawal', 'Saque'],
    ['transfer', 'Transferência'],
    ['payment', 'Pagamento'],
    ['currency_exchange', 'Câmbio de Moeda'],
    ['doc_ted', 'DOC/TED'],
    ['loan', 'Empréstimo e Financiamento'],
  ] as const)('labels %s as %s', (type, label) => {
    expect(TRANSACTION_TYPE_LABELS[type]).toBe(label)
  })

  it('covers exactly the types of the core', () => {
    expect(Object.keys(TRANSACTION_TYPE_LABELS).sort()).toEqual([...TRANSACTION_TYPES].sort())
  })
})

describe('TRANSACTION_TYPE_OPTIONS', () => {
  it('keeps the order of the select', () => {
    expect(TRANSACTION_TYPE_OPTIONS.map(option => option.label)).toEqual([
      'Câmbio de Moeda',
      'DOC/TED',
      'Empréstimo e Financiamento',
      'Depósito',
      'Saque',
      'Transferência',
      'Pagamento',
    ])
  })

  it('uses the codes as values', () => {
    expect(TRANSACTION_TYPE_OPTIONS[0]).toEqual({ value: 'currency_exchange', label: 'Câmbio de Moeda' })
  })

  it('covers every type exactly once', () => {
    expect(TRANSACTION_TYPE_OPTIONS.map(option => option.value).sort()).toEqual([...TRANSACTION_TYPES].sort())
  })

  it('types the value as the TransactionType of the core', () => {
    expectTypeOf(TRANSACTION_TYPE_OPTIONS[0].value).toEqualTypeOf<TransactionType>()
  })
})

describe('formatDateBR', () => {
  it('turns an ISO date into dd/mm/yyyy', () => {
    expect(formatDateBR('2022-11-18')).toBe('18/11/2022')
  })

  it('keeps the leading zeros', () => {
    expect(formatDateBR('2026-03-08')).toBe('08/03/2026')
  })

  it.each(['2026-01-01', '2025-12-31'])('does not move %s to another day', date => {
    expect(formatDateBR(date).split('/').reverse().join('-')).toBe(date)
  })
})

describe('formatMonthKey', () => {
  it('formats a month of a year', () => {
    expect(formatMonthKey('2022-11')).toBe('Novembro de 2022')
  })

  it.each([
    ['2026-01', 'Janeiro de 2026'],
    ['2026-02', 'Fevereiro de 2026'],
    ['2026-03', 'Março de 2026'],
    ['2026-04', 'Abril de 2026'],
    ['2026-05', 'Maio de 2026'],
    ['2026-06', 'Junho de 2026'],
    ['2026-07', 'Julho de 2026'],
    ['2026-08', 'Agosto de 2026'],
    ['2026-09', 'Setembro de 2026'],
    ['2026-10', 'Outubro de 2026'],
    ['2026-11', 'Novembro de 2026'],
    ['2026-12', 'Dezembro de 2026'],
  ])('formats %s as %s', (monthKey, label) => {
    expect(formatMonthKey(monthKey)).toBe(label)
  })
})

describe('formatSignedCents', () => {
  it('has no sign for income', () => {
    expect(formatSignedCents(123456, 'income')).toBe('R$ 1.234,56')
  })

  it('has a minus sign before the currency for expense', () => {
    expect(formatSignedCents(123456, 'expense')).toBe('-R$ 1.234,56')
  })

  it('formats cents below one real', () => {
    expect(formatSignedCents(5, 'expense')).toBe('-R$ 0,05')
  })
})

describe('groupDtosByMonth', () => {
  it('returns nothing for an empty list', () => {
    expect(groupDtosByMonth([])).toEqual([])
  })

  it('groups by month, keeping the order of the groups', () => {
    const groups = groupDtosByMonth([dto('a', '2026-03-08'), dto('b', '2026-01-20'), dto('c', '2026-01-15')])

    expect(groups.map(group => group.monthKey)).toEqual(['2026-03', '2026-01'])
  })

  it('keeps the order inside each group', () => {
    const [group] = groupDtosByMonth([dto('b', '2026-01-20'), dto('c', '2026-01-15')])

    expect(group.transactions.map(transaction => transaction.id)).toEqual(['b', 'c'])
  })

  it('does not sort: the order is the one it received', () => {
    const groups = groupDtosByMonth([dto('a', '2022-11-18'), dto('b', '2026-03-08')])

    expect(groups.map(group => group.monthKey)).toEqual(['2022-11', '2026-03'])
  })

  it('separates the same month of different years', () => {
    const groups = groupDtosByMonth([dto('a', '2026-11-05'), dto('b', '2022-11-18')])

    expect(groups.map(group => group.monthKey)).toEqual(['2026-11', '2022-11'])
  })

  it('does not change the input', () => {
    const input = [dto('a', '2026-03-08')]

    groupDtosByMonth(input)

    expect(input).toEqual([dto('a', '2026-03-08')])
  })
})
