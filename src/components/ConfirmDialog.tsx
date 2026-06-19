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

export function ConfirmDialog({
  open,
  title,
  message,
  actions,
}: ConfirmDialogProps) {
  if (!open) return null

  const variantStyles: Record<ConfirmAction['variant'], string> = {
    primary:
      'rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700',
    danger:
      'rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700',
    secondary:
      'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mb-5 text-sm leading-relaxed text-gray-600">{message}</p>
        <div className="flex justify-end gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
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
