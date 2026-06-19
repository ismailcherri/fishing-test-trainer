import { useCallback, useEffect, useId } from 'react'

interface ConfirmAction {
  label: string
  variant: 'primary' | 'danger' | 'secondary'
  onClick: () => void
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  actions: ConfirmAction[]
}

const variantStyles: Record<ConfirmAction['variant'], string> = {
  primary:
    'rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700',
  danger:
    'rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700',
  secondary:
    'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50',
}

export function ConfirmDialog({
  open,
  title,
  message,
  actions,
}: ConfirmDialogProps) {
  const titleId = useId()
  const descId = useId()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && actions.length > 0) {
        const secondary = actions.find((a) => a.variant === 'secondary')
        if (secondary) secondary.onClick()
      }
    },
    [actions]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 id={titleId} className="mb-2 text-lg font-semibold text-gray-900">
          {title}
        </h2>
        <p id={descId} className="mb-5 text-sm leading-relaxed text-gray-600">
          {message}
        </p>
        <div className="flex justify-end gap-2">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={variantStyles[action.variant]}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
