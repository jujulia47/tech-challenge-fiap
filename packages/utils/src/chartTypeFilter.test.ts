import { describe, expect, it } from 'vitest'
import { toggleTypeFilter, typeFilterMessage } from './chartTypeFilter'

describe('toggleTypeFilter', () => {
  it('filters by the chosen type', () => {
    expect(toggleTypeFilter(null, 'deposit')).toBe('deposit')
  })

  it('moves from one type to another', () => {
    expect(toggleTypeFilter('deposit', 'payment')).toBe('payment')
  })

  it('clears when the same type is chosen again', () => {
    expect(toggleTypeFilter('deposit', 'deposit')).toBeNull()
  })

  it('stays clear with no type', () => {
    expect(toggleTypeFilter(null, null)).toBeNull()
  })
})

describe('typeFilterMessage', () => {
  it('names the type in Portuguese', () => {
    expect(typeFilterMessage('deposit')).toBe('Gráfico de meses filtrado por Depósito')
  })

  it('says when the filter is gone', () => {
    expect(typeFilterMessage(null)).toBe('Filtro removido')
  })
})
