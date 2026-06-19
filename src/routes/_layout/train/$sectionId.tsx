import { ConfirmDialog } from '#/components/ConfirmDialog'
import { ProgressBar } from '#/components/ProgressBar'
import { QuestionCard } from '#/components/QuestionCard'
import { getSection, loadQuestions, type Question } from '#/lib/questions'
import {
  advanceSession,
  createSession,
  fullReset,
  getSession,
  getStats,
  getWeakQuestionNumbers,
  isMemorized,
  recordAnswer,
  resetSessionKeepStats,
} from '#/lib/storage'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'

type DialogState =
  | { type: 'none' }
  | { type: 'resume'; currentIndex: number; total: number }
  | { type: 'complete'; weakCount: number }
  | {
      type: 'restart'
    }

export const Route = createFileRoute('/_layout/train/$sectionId')({
  component: QuestionSession,
  validateSearch: (search: Record<string, unknown>) => ({
    mode: (search.mode as string) || undefined,
  }),
})

function QuestionSession() {
  const { sectionId } = Route.useParams()
  const { mode } = Route.useSearch()
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [sectionComplete, setSectionComplete] = useState(false)
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' })
  const [memorizedCount, setMemorizedCount] = useState(0)
  const [attemptedCount, setAttemptedCount] = useState(0)

  useEffect(() => {
    let ignore = false
    async function init() {
      try {
        const data = await loadQuestions()
        if (ignore) return
        const section = getSection(data, sectionId)
        if (!section) {
          setError(`Section "${sectionId}" not found`)
          return
        }

        const allQuestions = section.questions
        const weakNums = await getWeakQuestionNumbers(sectionId)
        const isWeakMode = mode === 'weak'

        let targetQuestions: Question[]
        if (isWeakMode) {
          targetQuestions = allQuestions.filter((q) =>
            weakNums.includes(q.number),
          )
        } else {
          targetQuestions = allQuestions
        }

        setQuestions(targetQuestions)

        if (targetQuestions.length === 0) {
          setSectionComplete(true)
          setLoading(false)
          return
        }

        const session = await getSession(sectionId)

        if (session) {
          if (session.completed) {
            setDialog({ type: 'complete', weakCount: weakNums.length })
            setLoading(false)
            return
          }
          setDialog({
            type: 'resume',
            currentIndex: session.currentIndex + 1,
            total: targetQuestions.length,
          })
          setLoading(false)
          return
        }

        await createSession(
          sectionId,
          isWeakMode ? 'weak' : 'normal',
          targetQuestions.map((q) => q.number),
        )
        setCurrentIndex(0)
        setLoading(false)
      } catch (e) {
        if (!ignore)
          setError(e instanceof Error ? e.message : 'Failed to load')
        setLoading(false)
      }
    }
    init()
    return () => {
      ignore = true
    }
  }, [sectionId, mode])

  const handleResume = async () => {
    setDialog({ type: 'none' })
    try {
      const session = await getSession(sectionId)
      if (session) {
        setCurrentIndex(session.currentIndex)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resume session')
    }
  }

  const handleNewRound = async () => {
    setDialog({ type: 'none' })
    setLoading(true)
    try {
      const isWeakMode = mode === 'weak'
      const weakNums = await getWeakQuestionNumbers(sectionId)
      const data = await loadQuestions()
      const section = getSection(data, sectionId)
      if (!section) return

      let targetQuestions: Question[]
      if (isWeakMode) {
        targetQuestions = section.questions.filter((q) =>
          weakNums.includes(q.number),
        )
      } else {
        targetQuestions = section.questions
      }

      if (targetQuestions.length === 0) {
        setSectionComplete(true)
        return
      }

      setQuestions(targetQuestions)
      await createSession(
        sectionId,
        isWeakMode ? 'weak' : 'normal',
        targetQuestions.map((q) => q.number),
      )
      setCurrentIndex(0)
      setSectionComplete(false)
      setAnswered(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start new round')
    } finally {
      setLoading(false)
    }
  }

  const handleTrainOnWeak = async () => {
    setDialog({ type: 'none' })
    setLoading(true)
    try {
      const weakNums = await getWeakQuestionNumbers(sectionId)
      const data = await loadQuestions()
      const section = getSection(data, sectionId)
      if (!section) return

      const targetQuestions = section.questions.filter((q) =>
        weakNums.includes(q.number),
      )
      if (targetQuestions.length === 0) {
        setSectionComplete(true)
        setLoading(false)
        return
      }

      setQuestions(targetQuestions)
      await createSession(
        sectionId,
        'weak',
        targetQuestions.map((q) => q.number),
      )
      setCurrentIndex(0)
      setSectionComplete(false)
      setAnswered(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start weak training')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelDialog = () => {
    setDialog({ type: 'none' })
    navigate({ to: '/' })
  }

  const handleAnswer = useCallback(
    async (correct: boolean) => {
      const question = questions[currentIndex]
      if (!question) return
      await recordAnswer(sectionId, question.number, correct)
      setAnswered(true)
    },
    [questions, currentIndex, sectionId],
  )

  const handleNext = async () => {
    const nextIndex = currentIndex + 1
    if (nextIndex >= questions.length) {
      await advanceSession(sectionId)
      const stats = await getStats(sectionId)
      setMemorizedCount(stats.filter(isMemorized).length)
      setAttemptedCount(stats.length)
      setSectionComplete(true)
    } else {
      setCurrentIndex(nextIndex)
      setAnswered(false)
      await advanceSession(sectionId)
    }
  }

  const handleRestartClick = () => {
    setDialog({ type: 'restart' })
  }

  const handleResetRound = async () => {
    setDialog({ type: 'none' })
    await resetSessionKeepStats(sectionId)
    setCurrentIndex(0)
    setAnswered(false)
    setSectionComplete(false)
  }

  const handleFullReset = async () => {
    setDialog({ type: 'none' })
    await fullReset(sectionId)
    const isWeakMode = mode === 'weak'
    const data = await loadQuestions()
    const section = getSection(data, sectionId)
    if (!section) return

    let targetQuestions: Question[]
    if (isWeakMode) {
      const weakNums = await getWeakQuestionNumbers(sectionId)
      targetQuestions = section.questions.filter((q) =>
        weakNums.includes(q.number),
      )
    } else {
      targetQuestions = section.questions
    }

    setQuestions(targetQuestions)
    if (targetQuestions.length === 0) {
      setSectionComplete(true)
      return
    }

    await createSession(
      sectionId,
      isWeakMode ? 'weak' : 'normal',
      targetQuestions.map((q) => q.number),
    )
    setCurrentIndex(0)
    setAnswered(false)
    setSectionComplete(false)
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

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Loading questions...</p>
      </div>
    )
  }

  if (sectionComplete) {
    return (
      <div className="p-6 text-center">
        <h2 className="mb-2 text-xl font-bold text-gray-900">
          Section Complete!
        </h2>
        <p className="mb-4 text-gray-600">
          {memorizedCount} / {attemptedCount} memorized
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleNewRound}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Start New Round
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
      <div className="mt-6 text-center">
        <button
          onClick={handleRestartClick}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          Restart Section
        </button>
      </div>

      <ConfirmDialog
        open={dialog.type === 'resume'}
        title="Training in Progress"
        message={`You have a training round in progress. Resume from question ${(dialog as { type: 'resume'; currentIndex: number; total: number }).currentIndex} of ${(dialog as { type: 'resume'; currentIndex: number; total: number }).total}?`}
        actions={[
          { label: 'Start New Round', variant: 'secondary', onClick: handleNewRound },
          { label: 'Resume', variant: 'primary', onClick: handleResume },
        ]}
      />

      <ConfirmDialog
        open={dialog.type === 'complete'}
        title="Section Completed"
        message="You've completed this section. What would you like to do?"
        actions={[
          { label: 'Cancel', variant: 'secondary', onClick: handleCancelDialog },
          ...(dialog.type === 'complete' && (dialog as { type: 'complete'; weakCount: number }).weakCount > 0
            ? [
                {
                  label: `Train on Weak (${(dialog as { type: 'complete'; weakCount: number }).weakCount})`,
                  variant: 'secondary' as const,
                  onClick: handleTrainOnWeak,
                },
              ]
            : []),
          { label: 'Start New Round', variant: 'primary', onClick: handleNewRound },
        ]}
      />

      <ConfirmDialog
        open={dialog.type === 'restart'}
        title="Restart Section"
        message="Do you want to reset the current round (keeping all stats) or do a full reset (clearing all stats for this section)?"
        actions={[
          {
            label: 'Full Reset',
            variant: 'danger',
            onClick: handleFullReset,
          },
          {
            label: 'Reset Round',
            variant: 'primary',
            onClick: handleResetRound,
          },
        ]}
      />
    </div>
  )
}
