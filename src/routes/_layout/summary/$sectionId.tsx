import { getSection, loadQuestions, type Question } from '#/lib/questions'
import { getStats, isMemorized, type QuestionStats } from '#/lib/storage'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

const answerLabels = ['A', 'B', 'C']

export const Route = createFileRoute('/_layout/summary/$sectionId')({
  component: SummaryDetail,
})

function SummaryDetail() {
  const { sectionId } = Route.useParams()
  const [questions, setQuestions] = useState<Question[]>([])
  const [statsMap, setStatsMap] = useState<Map<number, QuestionStats>>(
    new Map()
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null)

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const [data, stats] = await Promise.all([
          loadQuestions(),
          getStats(sectionId),
        ])
        if (ignore) return
        const section = getSection(data, sectionId)
        if (!section) {
          setError('Section not found')
          return
        }
        setQuestions(section.questions)
        setStatsMap(new Map(stats.map((s) => [s.questionNumber, s])))
      } catch (e) {
        if (!ignore) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [sectionId])

  if (loading)
    return <div className="p-6 text-center text-gray-500">Loading...</div>
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>

  return (
    <div className="p-4">
      <Link to="/summary" className="mb-4 inline-block text-sm text-blue-600">
        &larr; Back
      </Link>
      <div className="flex flex-col gap-2">
        {questions.map((q) => {
          const stat = statsMap.get(q.number)
          const memorized = stat ? isMemorized(stat) : false
          const needsWork = stat ? stat.wrong > stat.correct : false
          const expanded = expandedQuestion === q.number

          let bgClass = 'bg-white'
          if (memorized) bgClass = 'bg-green-50'
          else if (needsWork) bgClass = 'bg-red-50'

          const answerKeys = Object.keys(q.answers).slice(0, 3)

          return (
            <div
              key={q.number}
              className={`rounded-lg border border-gray-200 ${bgClass} p-3 transition-colors`}
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedQuestion(expanded ? null : q.number)
                }
                className="w-full text-left"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 text-sm ${memorized ? 'text-green-500' : 'text-gray-300'}`}
                  >
                    {memorized ? '\u25CF' : '\u25CB'}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {q.number}. {q.question}
                    </p>
                    {stat ? (
                      <p className="mt-1 text-xs text-gray-500">
                        {'\u2713'}
                        {stat.correct} {'\u2717'}
                        {stat.wrong}
                        {memorized && (
                          <span className="ml-2 text-green-600">Memorized</span>
                        )}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-400">
                        Not attempted
                      </p>
                    )}
                  </div>
                </div>
              </button>

              {expanded && (
                <div className="mt-3 rounded-lg bg-gray-100 p-4">
                  <div className="mb-3">
                    <p className="mb-2 text-sm font-medium text-gray-500 uppercase">
                      Answers
                    </p>
                    <div className="flex flex-col gap-1">
                      {answerKeys.map((key, i) => {
                        const isCorrect = key === q.correctAnswer
                        return (
                          <p
                            key={key}
                            className={`text-sm ${isCorrect ? 'font-semibold text-green-700' : 'text-gray-700'}`}
                          >
                            {answerLabels[i]}) {q.answers[key]}
                            {isCorrect && ' \u2713'}
                          </p>
                        )
                      })}
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="mb-1 text-sm font-medium text-gray-500 uppercase">
                      English
                    </p>
                    <p className="text-sm text-gray-800">{q.questionEn}</p>
                    <div className="mt-2 flex flex-col gap-1">
                      {answerKeys.map((key, i) => (
                        <p key={key} className="text-sm text-gray-700">
                          {answerLabels[i]}) {q.answersEn[key]}
                        </p>
                      ))}
                    </div>
                  </div>

                  {q.explanation && (
                    <div>
                      <p className="mb-1 text-sm font-medium text-gray-500 uppercase">
                        Explanation
                      </p>
                      <p className="text-sm text-gray-700">{q.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
