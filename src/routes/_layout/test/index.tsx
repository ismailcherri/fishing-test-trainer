import { ProgressBar } from '#/components/ProgressBar'
import { QuestionCard } from '#/components/QuestionCard'
import { TestResults } from '#/components/TestResults'
import { Timer } from '#/components/Timer'
import {
  generateTest,
  scoreTest,
  type QuestionWithSection,
  type TestResult,
} from '#/lib/exam'
import { loadQuestions, type QuestionsData } from '#/lib/questions'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'

type Phase = 'start' | 'exam' | 'results'

const TEST_DURATION = 120 * 60

export const Route = createFileRoute('/_layout/test/')({
  component: TestPage,
})

function TestPage() {
  const [data, setData] = useState<QuestionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('start')
  const [questions, setQuestions] = useState<QuestionWithSection[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<number, string | null>>(new Map())
  const [timerRunning, setTimerRunning] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const answeredRef = useRef(false)

  useEffect(() => {
    loadQuestions()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const handleStart = useCallback(() => {
    if (!data) return
    const pool = generateTest(data)
    setQuestions(pool)
    setAnswers(new Map())
    setCurrentIndex(0)
    setPhase('exam')
    setTimerRunning(true)
    answeredRef.current = false
  }, [data])

  const handleAnswer = useCallback(
    (_correct: boolean, selectedKey: string) => {
      if (answeredRef.current) return
      answeredRef.current = true
      const question = questions[currentIndex]
      if (!question) return
      setAnswers((prev) => {
        const next = new Map(prev)
        next.set(question.number, selectedKey)
        return next
      })
    },
    [questions, currentIndex]
  )

  const handleAdvance = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      finishTest()
    } else {
      setCurrentIndex((i) => i + 1)
      answeredRef.current = false
    }
  }, [currentIndex, questions.length])

  const finishTest = useCallback(() => {
    if (!data || result) return
    setTimerRunning(false)
    const finalAnswers = new Map(answers)
    for (const q of questions) {
      if (!finalAnswers.has(q.number)) {
        finalAnswers.set(q.number, null)
      }
    }
    const testResult = scoreTest(questions, finalAnswers, data)
    setResult(testResult)
    setPhase('results')
  }, [data, questions, answers, result])

  const handleTimerExpire = useCallback(() => {
    finishTest()
  }, [finishTest])

  const handleNewTest = useCallback(() => {
    setPhase('start')
    setResult(null)
    setQuestions([])
    setAnswers(new Map())
    setCurrentIndex(0)
  }, [])

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

  if (phase === 'start') {
    return (
      <div className="p-4">
        <h1 className="mb-4 text-xl font-bold text-gray-900">Mock Exam</h1>
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-gray-900">Exam Rules</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>60 questions from all 5 sections (12 each)</li>
            <li>120 minutes time limit</li>
            <li>45 correct answers required to pass</li>
            <li>Maximum 6 wrong answers per section</li>
            <li>No feedback or translations during the exam</li>
            <li>Timer expires = exam ends automatically</li>
          </ul>
        </div>
        <button
          onClick={handleStart}
          className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700"
        >
          Start Test
        </button>
      </div>
    )
  }

  if (phase === 'results' && result) {
    return <TestResults result={result} onNewTest={handleNewTest} />
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
      <div className="mb-4 flex items-center justify-between">
        <ProgressBar current={currentIndex + 1} total={questions.length} />
        <div className="ml-4">
          <Timer
            totalSeconds={TEST_DURATION}
            running={timerRunning}
            onExpire={handleTimerExpire}
          />
        </div>
      </div>
      <QuestionCard
        key={question.number}
        question={question}
        onAnswer={handleAnswer}
        examMode
        onAdvance={handleAdvance}
      />
    </div>
  )
}
