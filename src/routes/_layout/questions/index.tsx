import { SectionCard } from '#/components/SectionCard'
import { loadQuestions, type QuestionsData } from '#/lib/questions'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/_layout/questions/')({
  component: QuestionsIndex,
})

function QuestionsIndex() {
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
      <h1 className="mb-4 text-xl font-bold text-gray-900">Study Questions</h1>
      <div className="flex flex-col gap-3">
        {Object.entries(data.sections).map(([id, section]) => (
          <SectionCard
            key={id}
            sectionId={id}
            section={section}
            to="/questions/$sectionId"
          />
        ))}
      </div>
    </div>
  )
}
