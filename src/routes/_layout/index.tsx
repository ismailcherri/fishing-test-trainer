import { SectionCard } from '#/components/SectionCard'
import { loadQuestions, type QuestionsData } from '#/lib/questions'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/_layout/')({
  component: Home,
})

function Home() {
  const [data, setData] = useState<QuestionsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadQuestions()
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Failed to load questions')
      )
  }, [])

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="mb-2 text-red-600">Failed to load questions</p>
        <p className="text-sm text-gray-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-sm text-blue-600 underline"
        >
          Reload
        </button>
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
      <h1 className="mb-4 text-xl font-bold text-gray-900">
        Fishing License Trainer
      </h1>
      {Object.keys(data.sections).length === 0 ? (
        <p className="text-center text-gray-500">No sections available.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {Object.entries(data.sections).map(([id, section]) => (
            <SectionCard key={id} sectionId={id} section={section} />
          ))}
        </div>
      )}
    </div>
  )
}
