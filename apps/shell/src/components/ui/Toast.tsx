import { cn } from '@/lib/utils/cn'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  visible: boolean
}

export function Toast({ message, type, visible }: ToastProps) {
  return (
    <div
      className={cn(
        'fixed bottom-6 left-6 z-50 max-w-xs rounded-md overflow-hidden',
        'flex flex-col',
        'text-body-semibold text-inverse',
        'transition-opacity duration-300',
        type === 'success' ? 'bg-success' : 'bg-error',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 p-4">
        <span className="material-icons text-icon-sm">
          {type === 'success' ? 'check_circle' : 'error'}
        </span>
        {message}
      </div>

      {visible && (
        <div className="h-1 bg-inverse/40 w-full">
          <div className="h-full bg-inverse toast-progress" />
        </div>
      )}
    </div>
  )
}
