import type { TransactionDTO, TransactionType } from '@bytebank/core'
import { describe, expect, it } from 'vitest'
import { filterTransactions } from './filterTransactions'

const dto = (id: string, type: TransactionType, amountInCents: number, date: string): TransactionDTO => ({
  id,
  userId: 'user-a',
  type,
  amountInCents,
  date,
})

const list = [
  dto('deposit', 'deposit', 15000, '2026-03-08'),
  dto('payment', 'payment', 120000, '2026-03-01'),
  dto('exchange', 'currency_exchange', 5050, '2026-01-15'),
]

const query = { text: '', type: '', month: '' }
const ids = (changes: Partial<typeof query>) => filterTransactions(list, { ...query, ...changes }).map(item => item.id)

describe('filterTransactions', () => {
  it('returns everything for an empty query', () => {
    expect(ids({})).toEqual(['deposit', 'payment', 'exchange'])
  })

  it('treats a blank text as no text', () => {
    expect(ids({ text: '   ' })).toEqual(['deposit', 'payment', 'exchange'])
  })

  describe('text', () => {
    it.each([
      ['the label of the type', 'Depósito', ['deposit']],
      ['the label in any case', 'CÂMBIO', ['exchange']],
      ['part of the label', 'pag', ['payment']],
      ['the amount', '150,00', ['deposit']],
      ['the formatted amount', 'R$ 1.200,00', ['payment']],
      ['the sign of an expense', '-R$', ['payment', 'exchange']],
      ['the date as shown', '08/03/2026', ['deposit']],
      ['part of the date', '/2026', ['deposit', 'payment', 'exchange']],
    ])('finds %s', (_, text, expected) => {
      expect(ids({ text })).toEqual(expected)
    })

    it('finds nothing for a text that is nowhere', () => {
      expect(ids({ text: 'xyz' })).toEqual([])
    })

    it('keeps the amount sensitive to case, as it is on the screen', () => {
      expect(ids({ text: 'r$ 150' })).toEqual([])
    })

    it('does not search the ISO date', () => {
      expect(ids({ text: '2026-03' })).toEqual([])
    })
  })

  describe('filters', () => {
    it('filters by type', () => {
      expect(ids({ type: 'payment' })).toEqual(['payment'])
    })

    it('filters by month', () => {
      expect(ids({ month: '2026-03' })).toEqual(['deposit', 'payment'])
    })

    it('needs every condition', () => {
      expect(ids({ text: '-R$', type: 'payment', month: '2026-03' })).toEqual(['payment'])
      expect(ids({ text: '-R$', month: '2026-01', type: 'payment' })).toEqual([])
    })
  })

  it('keeps the order and does not change the input', () => {
    const input = [...list]

    filterTransactions(input, { ...query, type: 'payment' })

    expect(input).toEqual(list)
  })
})
