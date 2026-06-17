import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { loadQuestions, getSection, type Question } from '#/lib/questions'
import { QuestionCard } from '#/components/QuestionCard'
import { ProgressBar } from '#/components/ProgressBar'

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
    return () => { ignore = true }
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
        <Link to="/questions" className="mt-4 inline-block text-blue-600 underline text-sm">
          Back to questions
        </Link>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No questions found.</p>
        <Link to="/questions" className="mt-4 inline-block text-blue-600 underline text-sm">
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
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => setCurrentIndex((i) => i - 1)}
          disabled={isFirst}
          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        {isLast ? (
          <Link
            to="/questions"
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors text-center"
          >
            Done
          </Link>
        ) : (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
