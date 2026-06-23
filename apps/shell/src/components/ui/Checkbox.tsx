import { cn } from '@/lib/utils/cn'

interface CheckboxProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  error?: string
}

export function Checkbox({ label, checked, onChange, error }: CheckboxProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-start gap-2 cursor-pointer">
        <div
          className={cn(
            'w-6 h-6 rounded-md border shrink-0 mt-0.5 flex items-center justify-center bg-inverse transition-colors',
            'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-900',
            checked ? 'border-success' : 'border-primary-900',
            error ? 'border-error' : '',
          )}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only"
          />
          {checked && (
            <svg
              width="14"
              height="11"
              viewBox="0 0 10 8"
              fill="none"
              aria-hidden="true"
              className="text-success"
            >
              <path
                d="M1 4L3.5 6.5L9 1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <span className="text-body text-text-primary">{label}</span>
      </label>
      {error && <span className="text-meta text-error">{error}</span>}
    </div>
  )
}
