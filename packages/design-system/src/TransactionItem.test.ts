import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { TransactionItem } from './TransactionItem'

interface ButtonProps {
  'aria-label'?: string
  children?: ReactNode
  onPointerEnter?: () => void
  onFocus?: () => void
}

// No DOM here, so the button is found in the tree that the component returns
function findButton(node: ReactNode, label: string): ButtonProps | null {
  for (const child of Children.toArray(node)) {
    if (!isValidElement(child)) continue
    const { props } = child as ReactElement<ButtonProps>
    if (props['aria-label'] === label) return props
    const found = findButton(props.children, label)
    if (found) return found
  }
  return null
}

const expense = { id: '1', userId: '1', type: 'payment', amountInCents: 35000, date: '2026-01-20' } as const
const income = { ...expense, type: 'deposit' } as const

describe('TransactionItem', () => {
  it('shows the label, the date and the signed value of an expense', () => {
    const html = renderToStaticMarkup(createElement(TransactionItem, { transaction: expense }))

    expect(html).toContain('Pagamento')
    expect(html).toContain('20/01/2026')
    expect(html).toContain('-R$ 350,00')
  })

  it('shows income with no sign', () => {
    const html = renderToStaticMarkup(createElement(TransactionItem, { transaction: income }))

    expect(html).toContain('R$ 350,00')
    expect(html).not.toContain('-R$')
  })

  it('has a divider by default, which can be turned off', () => {
    const withDivider = renderToStaticMarkup(createElement(TransactionItem, { transaction: income }))
    const without = renderToStaticMarkup(createElement(TransactionItem, { transaction: income, showDivider: false }))

    expect(withDivider).toContain('border-t')
    expect(without).not.toContain('border-t')
  })

  it('has no buttons without handlers', () => {
    const html = renderToStaticMarkup(createElement(TransactionItem, { transaction: income }))

    expect(html).not.toContain('<button')
  })

  it.each([
    ['onDetail', 'Ver detalhes'],
    ['onEdit', 'Editar transação'],
    ['onDelete', 'Excluir transação'],
  ])('shows only the button of %s, labeled in Portuguese', (handler, label) => {
    const html = renderToStaticMarkup(createElement(TransactionItem, { transaction: income, [handler]: vi.fn() }))

    expect(html).toContain(`aria-label="${label}"`)
    expect(html.match(/<button/g)).toHaveLength(1)
  })

  it.each([
    ['Ver detalhes', 'detail'],
    ['Editar transação', 'edit'],
    ['Excluir transação', 'delete'],
  ])('tells the intent of %s on hover and on focus', (label, action) => {
    const onActionIntent = vi.fn()
    const tree = TransactionItem({
      transaction: income,
      onDetail: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onActionIntent,
    })

    const button = findButton(tree, label)
    button?.onPointerEnter?.()
    button?.onFocus?.()

    expect(onActionIntent.mock.calls).toEqual([[action], [action]])
  })

  it('does not need a listener for the intent', () => {
    const tree = TransactionItem({ transaction: income, onDetail: vi.fn() })

    expect(() => findButton(tree, 'Ver detalhes')?.onPointerEnter?.()).not.toThrow()
  })
})
