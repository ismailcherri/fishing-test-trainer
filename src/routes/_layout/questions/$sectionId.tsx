import { ProgressBar } from '#/components/ProgressBar'
import { QuestionCard } from '#/components/QuestionCard'
import { getSection, loadQuestions, type Question } from '#/lib/questions'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/_layout/questions/$sectionId')({
  component: QuestionBrowse,
})

function QuestionBrowse() {
  const { sectionId } = Route.useParams()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        setQuestions(section.questions)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [sectionId])

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
          to="/questions"
          className="mt-4 inline-block text-sm text-blue-600 underline"
        >
          Back to questions
        </Link>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No questions found.</p>
        <Link
          to="/questions"
          className="mt-4 inline-block text-sm text-blue-600 underline"
        >
          Back to questions
        </Link>
      </div>
    )
  }

  const question = questions[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex >= questions.length - 1

  return (
    <div className="p-4">
      <ProgressBar current={currentIndex + 1} total={questions.length} />
      <QuestionCard
        key={question.number}
        question={question}
        onAnswer={() => {}}
        showAnswer
      />
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => setCurrentIndex((i) => i - 1)}
          disabled={isFirst}
          className="flex-1 rounded-lg bg-gray-200 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        {isLast ? (
          <Link
            to="/questions"
            className="flex-1 rounded-lg bg-blue-600 py-3 text-center font-medium text-white transition-colors hover:bg-blue-700"
          >
            Done
          </Link>
        ) : (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="flex-1 rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
