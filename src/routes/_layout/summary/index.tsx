import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { loadQuestions, type QuestionsData } from '#/lib/questions'
import { getMemorizedCount, getConfidenceRatio, getTotalAttempts } from '#/lib/stats'

export const Route = createFileRoute('/_layout/summary/')({
  component: SummaryIndex,
})

function SummaryIndex() {
  const [data, setData] = useState<QuestionsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadQuestions()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [])

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Loading questions...</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Statistics</h1>
      <div className="flex flex-col gap-3">
        {Object.entries(data.sections).map(([id, section]) => {
          const memorized = getMemorizedCount(id)
          const total = section.questionCount
          const confidence = getConfidenceRatio(id)
          const { correct, wrong } = getTotalAttempts(id)

          return (
            <Link
              key={id}
              to="/summary/$sectionId"
              params={{ sectionId: id }}
              className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-left hover:shadow-md transition-shadow"
            >
              <h2 className="font-semibold text-gray-900 mb-2">{section.name}</h2>
              <div className="flex gap-4 text-sm text-gray-600 mb-2">
                <span>{memorized}/{total} memorized</span>
                <span>{confidence}% confidence</span>
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {correct} correct, {wrong} wrong ({correct + wrong} total attempts)
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${total > 0 ? Math.min(Math.round((memorized / total) * 100), 100) : 0}%` }}
                />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
