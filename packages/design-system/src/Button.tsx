import { cn } from '@/lib/utils/cn'

type ButtonVariant = 'primary' | 'light' | 'accent' | 'outline' | 'error-outline' | 'success'

interface ButtonProps {
  variant?: ButtonVariant
  label: string
  disabled?: boolean
  fullWidth?: boolean
  autoFocus?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:          'bg-primary-900 text-inverse border-primary-900',
  light:            'bg-primary-50 text-primary-800 border-primary-50',
  accent:           'bg-accent text-inverse border-accent',
  outline:          'bg-transparent text-inverse border-inverse',
  'error-outline':  'bg-transparent text-error border-error',
  'success':        'bg-success text-inverse border-success',
}

export function Button({
  variant = 'primary',
  label,
  disabled,
  fullWidth,
  autoFocus,
  onClick,
  type = 'button',
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      autoFocus={autoFocus}
      onClick={onClick}
      className={cn(
        'h-12 px-6 rounded-md border text-body-semibold transition-all',
        'hover:opacity-90 active:scale-95',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-900',
        fullWidth ? 'w-full' : 'min-w-36',
        variantClasses[variant],
      )}
    >
      {label}
    </button>
  )
}
