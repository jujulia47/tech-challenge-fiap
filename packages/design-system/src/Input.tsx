'use client'

import { cn } from '@bytebank/utils'

interface InputProps {
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  error?: string
  disabled?: boolean
  suffixIcon?: string
  type?: 'text' | 'email' | 'password' | 'number' | 'date'
  required?: boolean
  autoFocus?: boolean
  max?: string
  autoComplete?: string
  // A short note under the field, read with it by screen readers
  hint?: string
  // Something to press at the end of the field
  trailing?: React.ReactNode
}

export function Input({ label, placeholder, value, onChange, error, hint, disabled, suffixIcon, type = 'text', required, autoFocus, max, autoComplete, trailing }: InputProps) {
  const slug = label.toLowerCase().replace(/\s/g, '-')
  const inputId = `input-${slug}`
  const errorId = `error-${slug}`
  const hintId = `hint-${slug}`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-body-semibold text-primary-900">{label}</label>
      <div className="relative">
        <input
          id={inputId}
          type={type}
          required={required}
          autoFocus={autoFocus}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          max={max}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          onChange={e => onChange(e.target.value)}
          className={cn(
            'h-12 w-full rounded-md border bg-inverse text-body text-primary-800',
            'focus:border-2 focus:border-primary-800',
            'disabled:bg-surface-card disabled:border-text-secondary disabled:text-text-secondary disabled:cursor-not-allowed',
            suffixIcon || trailing ? 'px-4 pr-10' : 'px-4',
            error ? 'border-error' : 'border-primary-900',
          )}
        />
        {trailing && <span className="absolute right-3 top-1/2 -translate-y-1/2 flex">{trailing}</span>}
        {suffixIcon && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-800"
            aria-hidden="true"
          >
            <span className="material-icons text-icon-sm" aria-hidden="true">{suffixIcon}</span>
          </span>
        )}
      </div>
      {hint && <span id={hintId} className="text-meta text-text-secondary">{hint}</span>}
      {error && (
        <span
          id={errorId}
          className="text-meta text-error"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  )
}
