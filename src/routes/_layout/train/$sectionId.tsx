import { ProgressBar } from '#/components/ProgressBar'
import { QuestionCard } from '#/components/QuestionCard'
import { getSection, loadQuestions, type Question } from '#/lib/questions'
import {
  clearStats,
  getStats,
  getWeakQuestionNumbers,
  isMemorized,
  recordAnswer,
} from '#/lib/stats'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'

export const Route = createFileRoute('/_layout/train/$sectionId')({
  component: QuestionSession,
  validateSearch: (search: Record<string, unknown>) => ({
    mode: (search.mode as string) || undefined,
  }),
})

function QuestionSession() {
  const { sectionId } = Route.useParams()
  const { mode } = Route.useSearch()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [sectionComplete, setSectionComplete] = useState(false)

  useEffect(() => {
    let ignore = false
    loadQuestions()
      .then((data) => {
        if (ignore) return
        const section = getSection(data, sectionId)
        if (!section) {
          setError(`Section "${sectionId}" not found`)
          return
        }
        const stats = getStats(sectionId)
        let targetQuestions: Question[] = section.questions

        if (mode === 'weak') {
          targetQuestions = section.questions.filter((q) =>
            getWeakQuestionNumbers(sectionId).includes(q.number)
          )
        }

        setQuestions(targetQuestions)

        if (targetQuestions.length === 0) {
          setSectionComplete(true)
          setCurrentIndex(0)
          return
        }

        const firstUnanswered =
          mode === 'weak'
            ? 0
            : targetQuestions.findIndex(
                (q) => !stats.some((s) => s.questionNumber === q.number)
              )
        if (firstUnanswered === -1) {
          setSectionComplete(true)
          setCurrentIndex(section.questions.length)
        } else {
          setCurrentIndex(firstUnanswered)
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [sectionId, mode])

  const handleAnswer = useCallback(
    (correct: boolean) => {
      const question = questions[currentIndex]
      if (!question) return
      recordAnswer(sectionId, question.number, correct)
      setAnswered(true)
    },
    [questions, currentIndex, sectionId]
  )

  const handleNext = () => {
    const nextIndex = currentIndex + 1
    if (nextIndex >= questions.length) {
      setSectionComplete(true)
    } else {
      setCurrentIndex(nextIndex)
      setAnswered(false)
    }
  }

  const handleRestart = () => {
    clearStats(sectionId)
    setCurrentIndex(0)
    setAnswered(false)
    setSectionComplete(false)
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Loading questions...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">{error}</p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm text-blue-600 underline"
        >
          Back to sections
        </Link>
      </div>
    )
  }

  if (sectionComplete) {
    const stats = getStats(sectionId)
    const memorized = stats.filter((s) => isMemorized(s)).length
    const total = stats.length

    return (
      <div className="p-6 text-center">
        <h2 className="mb-2 text-xl font-bold text-gray-900">
          Section Complete!
        </h2>
        <p className="mb-4 text-gray-600">
          {memorized} / {total} memorized
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleRestart}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Restart Section
          </button>
          <Link to="/" className="text-sm text-blue-600 underline">
            Back to sections
          </Link>
        </div>
      </div>
    )
  }

  const question = questions[currentIndex]
  if (!question) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No question found.</p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm text-blue-600 underline"
        >
          Back to sections
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4">
      <ProgressBar current={currentIndex + 1} total={questions.length} />
      <QuestionCard
        key={question.number}
        question={question}
        onAnswer={handleAnswer}
      />
      {answered && (
        <button
          onClick={handleNext}
          className="mt-4 w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700"
        >
          Next
        </button>
      )}
    </div>
  )
}
