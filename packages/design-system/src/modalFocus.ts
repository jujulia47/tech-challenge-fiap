'use client'

import { useEffect, useRef } from 'react'

type FocusBox = Pick<HTMLElement, 'focus' | 'contains'>
type FocusOrigin = Pick<HTMLElement, 'focus'>

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), iframe, [tabindex="0"]'

// A field with autoFocus already holds the focus, and the modal does not take it away.
// Otherwise the box takes it, and gives it back to where it came from on close.
export function moveFocusInto(box: FocusBox | null, active: FocusOrigin | null): (() => void) | undefined {
  if (!box || box.contains(active as Node | null)) return undefined
  box.focus()
  return () => active?.focus()
}

// Where Tab must go instead, at the edges of the modal. Inside it, null: the browser decides.
export function wrapFocusTarget<T>(items: readonly T[], active: unknown, backwards: boolean, box: unknown): T | null {
  const first = items[0]
  const last = items[items.length - 1]
  if (first === undefined || last === undefined) return null
  if (backwards) return active === first || active === box ? last : null
  return active === last ? first : null
}

export function useModalFocus<T extends HTMLElement>(isOpen: boolean) {
  const boxRef = useRef<T>(null)

  useEffect(() => {
    const box = boxRef.current
    if (!isOpen || !box) return undefined

    function keepTabInside(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !box) return
      const items = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)]
      const target = wrapFocusTarget(items, document.activeElement, event.shiftKey, box)
      if (!target) return
      event.preventDefault()
      target.focus()
    }

    box.addEventListener('keydown', keepTabInside)
    const release = moveFocusInto(box, document.activeElement as HTMLElement | null)
    return () => {
      box.removeEventListener('keydown', keepTabInside)
      release?.()
    }
  }, [isOpen])

  return boxRef
}
