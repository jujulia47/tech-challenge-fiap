import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { MountOnceOpen } from './MountOnceOpen'

function render(isOpen: boolean, lazyModal = vi.fn(() => createElement('p', null, 'modal'))) {
  const html = renderToStaticMarkup(createElement(MountOnceOpen, { isOpen, children: createElement(lazyModal) }))
  return { html, lazyModal }
}

describe('MountOnceOpen', () => {
  it('does not render a modal that never opened, so its chunk is not asked for', () => {
    const { html, lazyModal } = render(false)

    expect(html).toBe('')
    expect(lazyModal).not.toHaveBeenCalled()
  })

  it('renders the modal when it opens', () => {
    expect(render(true).html).toBe('<p>modal</p>')
  })
})
