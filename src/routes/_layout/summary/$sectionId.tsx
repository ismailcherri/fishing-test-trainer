import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { loadQuestions, getSection, type Question } from '#/lib/questions'
import { getStats, isMemorized } from '#/lib/stats'

export const Route = createFileRoute('/_layout/summary/$sectionId')({
  component: SummaryDetail,
})

function SummaryDetail() {
  const { sectionId } = Route.useParams()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    loadQuestions()
      .then((data) => {
        if (ignore) return
        const section = getSection(data, sectionId)
        if (!section) {
          setError('Section not found')
          return
        }
        setQuestions(section.questions)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [sectionId])

  if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>

  const stats = getStats(sectionId)
  const statsMap = new Map(stats.map((s) => [s.questionNumber, s]))

  return (
    <div className="p-4">
      <Link to="/summary" className="text-blue-600 text-sm mb-4 inline-block">&larr; Back</Link>
      <div className="flex flex-col gap-2">
        {questions.map((q) => {
          const stat = statsMap.get(q.number)
          const memorized = stat ? isMemorized(stat) : false

          return (
            <div
              key={q.number}
              className="bg-white rounded-lg border border-gray-200 p-3"
            >
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 text-sm ${memorized ? 'text-green-500' : 'text-gray-300'}`}>
                  {memorized ? '●' : '○'}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {q.number}. {q.question}
                  </p>
                  {stat ? (
                    <p className="text-xs text-gray-500 mt-1">
                      ✓{stat.correct} ✗{stat.wrong}
                      {memorized && <span className="text-green-600 ml-2">Memorized</span>}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Not attempted</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
