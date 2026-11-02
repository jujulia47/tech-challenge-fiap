import { describe, expect, it, vi } from 'vitest'
import { moveFocusInto, wrapFocusTarget } from './modalFocus'

const origin = () => ({ focus: vi.fn() })
const box = (holdsFocus: boolean) => ({ focus: vi.fn(), contains: vi.fn(() => holdsFocus) })

describe('moveFocusInto', () => {
  it('moves the focus to the box when it opens', () => {
    const modal = box(false)

    moveFocusInto(modal, origin())

    expect(modal.focus).toHaveBeenCalledTimes(1)
  })

  it('gives the focus back to where it came from on close', () => {
    const button = origin()

    const release = moveFocusInto(box(false), button)
    expect(button.focus).not.toHaveBeenCalled()
    release?.()

    expect(button.focus).toHaveBeenCalledTimes(1)
  })

  it('leaves the focus on a field that took it with autoFocus', () => {
    const modal = box(true)

    const release = moveFocusInto(modal, origin())

    expect(modal.focus).not.toHaveBeenCalled()
    expect(release).toBeUndefined()
  })

  it('does nothing while the box is not there', () => {
    expect(moveFocusInto(null, origin())).toBeUndefined()
  })
})

describe('wrapFocusTarget', () => {
  const items = ['close', 'field', 'save']

  it('goes from the last item back to the first with Tab', () => {
    expect(wrapFocusTarget(items, 'save', false, 'box')).toBe('close')
  })

  it('goes from the first item to the last with Shift+Tab', () => {
    expect(wrapFocusTarget(items, 'close', true, 'box')).toBe('save')
  })

  it('goes to the last item with Shift+Tab from the box itself', () => {
    expect(wrapFocusTarget(items, 'box', true, 'box')).toBe('save')
  })

  it('leaves the middle of the modal to the browser', () => {
    expect(wrapFocusTarget(items, 'field', false, 'box')).toBeNull()
    expect(wrapFocusTarget(items, 'field', true, 'box')).toBeNull()
  })

  it('has nothing to do in a modal with nothing to focus', () => {
    expect(wrapFocusTarget([], 'box', false, 'box')).toBeNull()
  })
})
