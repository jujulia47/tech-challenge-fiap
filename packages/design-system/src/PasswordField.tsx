'use client'

import { useState } from 'react'
import { PASSWORD_MIN_LENGTH, findPasswordIssue, type PasswordContext } from '@bytebank/core'
import { cn } from '@bytebank/utils'
import { Input } from './Input'
import { PASSWORD_STRENGTH_LABELS, passwordStrength, type PasswordStrength } from './password/passwordStrength'

interface PasswordFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  context?: PasswordContext
  refusedAsCommon?: boolean
  required?: boolean
  // A refusal that the criteria below do not show, such as "the same as the current one"
  error?: string
}

const BAR_CLASSES: Record<PasswordStrength, string> = {
  weak: 'w-1/3 bg-error',
  good: 'w-2/3 bg-accent',
  strong: 'w-full bg-success',
}

const EMPTY_CONTEXT: PasswordContext = { name: '', email: '' }

// For new passwords. Pasting is allowed, and a password manager should offer to generate one.
export function PasswordField({
  label,
  value,
  onChange,
  context = EMPTY_CONTEXT,
  refusedAsCommon = false,
  required,
  error,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const strength = passwordStrength(value, context, refusedAsCommon)
  const issue = value === '' ? null : findPasswordIssue(value, context, refusedAsCommon)

  const criteria = [
    { text: `Pelo menos ${PASSWORD_MIN_LENGTH} caracteres`, failed: issue === 'PASSWORD_TOO_SHORT' },
    { text: 'Sem senhas comuns ou repetições', failed: issue === 'PASSWORD_TOO_COMMON' },
    { text: 'Sem seu nome, seu e-mail ou "bytebank"', failed: issue === 'PASSWORD_HAS_PERSONAL_CONTEXT' },
  ]

  return (
    <div className="flex flex-col gap-2">
      <Input
        label={label}
        type={visible ? 'text' : 'password'}
        autoComplete="new-password"
        value={value}
        onChange={onChange}
        required={required}
        error={error}
        trailing={
          <button
            type="button"
            onClick={() => setVisible(current => !current)}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visible}
            className="flex text-primary-800 rounded-md focus-visible:outline-2 focus-visible:outline-primary-900"
          >
            <span className="material-icons text-icon-sm" aria-hidden="true">
              {visible ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        }
      />

      <div aria-hidden="true" className="flex items-center gap-2">
        <div className="h-1 flex-1 bg-surface-form rounded-md overflow-hidden">
          <div className={cn('h-full transition-all', strength ? BAR_CLASSES[strength] : 'w-0')} />
        </div>
        <span className="text-meta text-text-secondary min-w-10 text-right">
          {strength && PASSWORD_STRENGTH_LABELS[strength]}
        </span>
      </div>
      {/* Changes only with the level, so a screen reader is not interrupted at every key */}
      <p className="sr-only" aria-live="polite">
        {strength && `Força da senha: ${PASSWORD_STRENGTH_LABELS[strength]}`}
      </p>

      <ul className="flex flex-col gap-1">
        {criteria.map(({ text, failed }) => (
          <li key={text} className={cn('text-meta', failed ? 'text-error' : 'text-text-secondary')}>
            {text}
          </li>
        ))}
      </ul>
    </div>
  )
}
