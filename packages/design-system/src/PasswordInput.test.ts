import { createElement, type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PasswordField } from './PasswordField'
import { PasswordInput } from './PasswordInput'
import { visibilityToggle } from './password/visibilityToggle'

function render(props: Partial<ComponentProps<typeof PasswordInput>> = {}) {
  return renderToStaticMarkup(createElement(PasswordInput, { label: 'Senha', value: 'segredo', onChange: () => {}, ...props }))
}

// The clicks themselves run in a browser: PasswordInput.stories.tsx, with the Storybook tests
describe('visibilityToggle', () => {
  it('hides the password, and offers to show it', () => {
    expect(visibilityToggle(false)).toEqual({ type: 'password', label: 'Mostrar senha', icon: 'visibility' })
  })

  it('shows the password, and offers to hide it', () => {
    expect(visibilityToggle(true)).toEqual({ type: 'text', label: 'Ocultar senha', icon: 'visibility_off' })
  })
})

describe('PasswordInput', () => {
  it('starts hidden, with a button that says what it does and is not pressed', () => {
    const html = render()

    expect(html).toContain('type="password"')
    expect(html).toContain('aria-label="Mostrar senha"')
    expect(html).toContain('aria-pressed="false"')
    expect(html).toContain('type="button"')
  })

  it('lets the password manager fill the current password', () => {
    expect(render()).toContain('autoComplete="current-password"')
  })

  it('takes new-password where a password is created', () => {
    expect(render({ autoComplete: 'new-password' })).toContain('autoComplete="new-password"')
  })

  it('has no strength indicator and no criteria', () => {
    const html = render()

    expect(html).not.toContain('Força da senha')
    expect(html).not.toContain('<ul')
  })

  it('hides the icon from screen readers, which hear the label of the button', () => {
    expect(render()).toMatch(/<span class="material-icons[^"]*" aria-hidden="true">visibility<\/span>/)
  })
})

describe('PasswordField', () => {
  it('uses the same field and button, for a new password', () => {
    const html = renderToStaticMarkup(createElement(PasswordField, { label: 'Nova senha', value: '', onChange: () => {} }))

    expect(html).toContain('aria-label="Mostrar senha"')
    expect(html).toContain('autoComplete="new-password"')
    expect(html).toContain('Pelo menos 8 caracteres')
  })
})
