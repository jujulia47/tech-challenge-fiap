import { cn } from '@/lib/utils/cn'

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
}

export function Input({ label, placeholder, value, onChange, error, disabled, suffixIcon, type = 'text', required, autoFocus, max }: InputProps) {
  const slug = label.toLowerCase().replace(/\s/g, '-')
  const inputId = `input-${slug}`
  const errorId = `error-${slug}`

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-body-semibold text-primary-50">{label}</label>
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
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onChange={e => onChange(e.target.value)}
          className={cn(
            'h-12 w-full rounded-md border bg-inverse text-body text-primary-800',
            'focus:border-2 focus:border-primary-800 focus:outline-none',
            'disabled:bg-surface-card disabled:border-text-secondary disabled:text-text-secondary disabled:cursor-not-allowed',
            suffixIcon ? 'px-4 pr-10' : 'px-4',
            error ? 'border-error' : 'border-primary-900',
          )}
        />
        {suffixIcon && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-800"
            aria-hidden="true"
          >
            <span className="material-icons text-icon-sm">{suffixIcon}</span>
          </span>
        )}
      </div>
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
