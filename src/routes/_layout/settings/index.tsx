import { clearAllStats } from '#/lib/storage'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_layout/settings/')({
  component: SettingsPage,
})

function SettingsPage() {
  const [cleared, setCleared] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      await clearAllStats()
      setCleared(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold text-gray-900">Settings</h1>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-1 font-semibold text-gray-900">Statistics</h2>
        <p className="mb-4 text-sm text-gray-500">
          Delete all memorization tracking data. This cannot be undone.
        </p>
        {cleared ? (
          <p className="text-sm font-medium text-green-600">
            All statistics cleared.
          </p>
        ) : (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete All Statistics'}
          </button>
        )}
      </div>
    </div>
  )
}
