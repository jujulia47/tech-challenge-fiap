'use client'

import { PASSWORD_MIN_LENGTH, findPasswordIssue, type PasswordContext } from '@bytebank/core'
import { cn } from '@bytebank/utils'
import { PasswordInput } from './PasswordInput'
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

// From red to green, each at least 3:1 against the track and the gray card. The level is always
// written next to the bar, in text-primary: as text, the colors would fail 4.5:1 on the gray card.
// See docs/fase4/accessibility.md
const BAR_CLASSES: Record<PasswordStrength, string> = {
  weak: 'w-1/4 bg-error',
  fair: 'w-1/2 bg-strength-fair',
  good: 'w-3/4 bg-strength-good',
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
  const strength = passwordStrength(value, context, refusedAsCommon)
  const issue = value === '' ? null : findPasswordIssue(value, context, refusedAsCommon)

  const criteria = [
    { text: `Pelo menos ${PASSWORD_MIN_LENGTH} caracteres`, failed: issue === 'PASSWORD_TOO_SHORT' },
    { text: 'Sem senhas comuns ou repetições', failed: issue === 'PASSWORD_TOO_COMMON' },
    { text: 'Sem seu nome, seu e-mail ou "bytebank"', failed: issue === 'PASSWORD_HAS_PERSONAL_CONTEXT' },
  ]

  return (
    <div className="flex flex-col gap-2">
      <PasswordInput
        label={label}
        value={value}
        onChange={onChange}
        required={required}
        error={error}
        autoComplete="new-password"
      />

      <div aria-hidden="true" className="flex items-center gap-2">
        <div className="h-1 flex-1 bg-surface-form rounded-md overflow-hidden">
          <div className={cn('h-full transition-all', strength ? BAR_CLASSES[strength] : 'w-0')} />
        </div>
        <span className="text-meta-semibold text-text-primary min-w-16 text-right">
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
