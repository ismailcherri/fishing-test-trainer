import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import { loadQuestions, getSection, type Question } from '#/lib/questions'
import { getProgress, saveProgress, clearProgress } from '#/lib/progress'
import { QuestionCard } from '#/components/QuestionCard'
import { ProgressBar } from '#/components/ProgressBar'

export const Route = createFileRoute('/_layout/train/$sectionId')({
  component: QuestionSession,
})

function QuestionSession() {
  const { sectionId } = Route.useParams()
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
        setQuestions(section.questions)

        const progress = getProgress(sectionId)
        const firstUnanswered = section.questions.findIndex(
          (q) => !progress.some((p) => p.questionNumber === q.number),
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
    return () => { ignore = true }
  }, [sectionId])

  const handleAnswer = useCallback(
    (correct: boolean) => {
      const question = questions[currentIndex]
      if (!question) return
      saveProgress(sectionId, question.number, correct)
      setAnswered(true)
    },
    [questions, currentIndex, sectionId],
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
    clearProgress(sectionId)
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
        <Link to="/" className="mt-4 inline-block text-blue-600 underline text-sm">
          Back to sections
        </Link>
      </div>
    )
  }

  if (sectionComplete) {
    const progress = getProgress(sectionId)
    const correct = progress.filter((p) => p.correct).length
    const total = progress.length

    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Section Complete!</h2>
        <p className="text-gray-600 mb-4">
          {correct} / {total} correct ({Math.round((correct / total) * 100)}%)
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleRestart}
            className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Restart Section
          </button>
          <Link to="/" className="text-blue-600 underline text-sm">
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
        <Link to="/" className="mt-4 inline-block text-blue-600 underline text-sm">
          Back to sections
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4">
      <ProgressBar current={currentIndex + 1} total={questions.length} />
      <QuestionCard key={question.number} question={question} onAnswer={handleAnswer} />
      {answered && (
        <button
          onClick={handleNext}
          className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Next
        </button>
      )}
    </div>
  )
}
