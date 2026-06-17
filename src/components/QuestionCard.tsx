import { useState, useEffect } from 'react'
import type { Question } from '#/lib/questions'
import { getShuffledAnswerKeys } from '#/lib/questions'

interface QuestionCardProps {
  question: Question
  onAnswer: (correct: boolean) => void
  examMode?: boolean
  onAdvance?: () => void
  showAnswer?: boolean
}

export function QuestionCard({ question, onAnswer, examMode = false, onAdvance, showAnswer = false }: QuestionCardProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [shuffledKeys] = useState<string[]>(() => getShuffledAnswerKeys(question))

  useEffect(() => {
    if (showAnswer) {
      setSelectedKey(question.correctAnswer)
    }
  }, [question.number, showAnswer, question.correctAnswer])

  const handleSelect = (key: string) => {
    if (selectedKey !== null) return
    setSelectedKey(key)
    onAnswer(key === question.correctAnswer)
    if (examMode && onAdvance) {
      setTimeout(() => onAdvance(), 400)
    }
  }

  const getButtonStyle = (key: string): string => {
    if (selectedKey === null) {
      return 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
    }
    if (examMode) {
      if (key === selectedKey) return 'border-blue-500 bg-blue-50 text-blue-800'
      return 'border-gray-200 bg-gray-50 text-gray-400'
    }
    if (key === question.correctAnswer) {
      return 'border-green-500 bg-green-50 text-green-800'
    }
    if (key === selectedKey) {
      return 'border-red-500 bg-red-50 text-red-800'
    }
    return 'border-gray-200 bg-gray-50 text-gray-400'
  }

  const answerLabels = ['A', 'B', 'C']

  return (
    <div>
      <p className="text-lg font-medium text-gray-900 mb-4">{question.question}</p>

      <div className="flex flex-col gap-2 mb-4">
        {shuffledKeys.map((key, index) => (
          <button
            key={key}
            onClick={() => handleSelect(key)}
            disabled={selectedKey !== null}
            className={`border-2 rounded-lg p-3 text-left transition-colors ${getButtonStyle(key)}`}
          >
            <span className="font-semibold mr-2">{answerLabels[index]}</span>
            {question.answers[key]}
          </button>
        ))}
      </div>

      {selectedKey !== null && !examMode && (
        <div className="bg-gray-100 rounded-lg p-4 mt-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-500 uppercase mb-1">English</p>
            <p className="text-gray-800">{question.questionEn}</p>
            <div className="mt-2 flex flex-col gap-1">
              {shuffledKeys.map((key, index) => (
                <p key={key} className="text-sm text-gray-700">
                  <span className="font-semibold">{answerLabels[index]}</span>:{' '}
                  {question.answersEn[key]}
                </p>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase mb-1">Explanation</p>
            <p className="text-gray-700 text-sm">{question.explanation}</p>
          </div>
        </div>
      )}
    </div>
  )
}
