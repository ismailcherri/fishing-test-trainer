import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { loadQuestions } from '#/lib/questions'
import { clearStats } from '#/lib/stats'

export const Route = createFileRoute('/_layout/settings/')({
  component: SettingsPage,
})

function SettingsPage() {
  const [cleared, setCleared] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      const data = await loadQuestions()
      for (const sectionId of Object.keys(data.sections)) {
        clearStats(sectionId)
      }
      setCleared(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Settings</h1>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-900 mb-1">Statistics</h2>
        <p className="text-sm text-gray-500 mb-4">
          Delete all memorization tracking data. This cannot be undone.
        </p>
        {cleared ? (
          <p className="text-green-600 text-sm font-medium">All statistics cleared.</p>
        ) : (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete All Statistics'}
          </button>
        )}
      </div>
    </div>
  )
}
