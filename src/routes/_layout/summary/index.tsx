import { loadQuestions, type QuestionsData } from '#/lib/questions'
import {
  getConfidenceRatio,
  getMemorizedCount,
  getTotalAttempts,
} from '#/lib/storage'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

interface SectionSummary {
  id: string
  memorized: number
  total: number
  confidence: number
  correct: number
  wrong: number
}

export const Route = createFileRoute('/_layout/summary/')({
  component: SummaryIndex,
})

function SummaryIndex() {
  const [data, setData] = useState<QuestionsData | null>(null)
  const [summaries, setSummaries] = useState<Record<string, SectionSummary>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const questionsData = await loadQuestions()
        if (ignore) return
        setData(questionsData)

        const entries = await Promise.all(
          Object.keys(questionsData.sections).map(async (id) => {
            const [memorized, confidence, attempts] = await Promise.all([
              getMemorizedCount(id),
              getConfidenceRatio(id),
              getTotalAttempts(id),
            ])
            return [
              id,
              {
                id,
                memorized,
                total: questionsData.sections[id].questionCount,
                confidence,
                correct: attempts.correct,
                wrong: attempts.wrong,
              },
            ] as const
          })
        )
        if (ignore) return
        setSummaries(Object.fromEntries(entries))
      } catch (e) {
        if (!ignore) setError(e instanceof Error ? e.message : 'Failed to load')
      }
    }
    load()
    return () => {
      ignore = true
    }
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
      <h1 className="mb-4 text-xl font-bold text-gray-900">Statistics</h1>
      <div className="flex flex-col gap-3">
        {Object.entries(data.sections).map(([id, section]) => {
          const s = summaries[id]
          if (!s) return null

          return (
            <Link
              key={id}
              to="/summary/$sectionId"
              params={{ sectionId: id }}
              className="block rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <h2 className="mb-2 font-semibold text-gray-900">
                {section.name}
              </h2>
              <div className="mb-2 flex gap-4 text-sm text-gray-600">
                <span>
                  {s.memorized}/{s.total} memorized
                </span>
                <span>{s.confidence}% confidence</span>
              </div>
              <div className="mb-2 text-xs text-gray-500">
                {s.correct} correct, {s.wrong} wrong ({s.correct + s.wrong}{' '}
                total attempts)
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-green-600 transition-all"
                  style={{
                    width: `${s.total > 0 ? Math.min(Math.round((s.memorized / s.total) * 100), 100) : 0}%`,
                  }}
                />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
