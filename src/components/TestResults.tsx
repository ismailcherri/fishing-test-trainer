import type { TestResult } from '#/lib/exam'
import { useState } from 'react'

interface TestResultsProps {
  result: TestResult
  onNewTest: () => void
}

const answerLabels = ['A', 'B', 'C']

export function TestResults({ result, onNewTest }: TestResultsProps) {
  const percent = Math.round(
    (result.totalCorrect / result.totalQuestions) * 100
  )
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const toggleSection = (sectionId: string) => {
    setExpandedSection((prev) => (prev === sectionId ? null : sectionId))
  }

  return (
    <div className="p-4">
      <div className="mb-6 text-center">
        <h2
          className={`mb-2 text-2xl font-bold ${
            result.passed ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {result.passed ? 'PASS' : 'FAIL'}
        </h2>
        <p className="text-lg text-gray-700">
          {result.totalCorrect} / {result.totalQuestions} correct ({percent}%)
        </p>
      </div>

      <div className="mb-6 space-y-3">
        <h3 className="font-semibold text-gray-900">Section Breakdown</h3>
        {result.sectionResults.map((section) => (
          <div key={section.sectionId}>
            <button
              onClick={() => toggleSection(section.sectionId)}
              className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:border-gray-300"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">
                  {section.sectionId}: {section.name}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    section.passed ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {section.correct}/{section.total}
                  {!section.passed && ` (max 6 wrong)`}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-200">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    section.passed ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.round((section.correct / section.total) * 100)}%`,
                  }}
                />
              </div>
            </button>

            {expandedSection === section.sectionId && (
              <div className="mt-2 space-y-3">
                {result.answers
                  .filter((a) => a.question.sectionId === section.sectionId)
                  .map((a) => (
                    <div
                      key={a.question.number}
                      className="rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <p className="mb-2 text-sm font-medium text-gray-900">
                        {a.question.number}. {a.question.question}
                      </p>
                      <div className="mb-2 flex flex-col gap-1">
                        {Object.entries(a.question.answers).map(
                          ([key, text], i) => {
                            const isCorrect = key === a.question.correctAnswer
                            const isSelected =
                              a.selectedAnswer && key === a.selectedAnswer
                            const wasWrong =
                              a.selectedAnswer && isSelected && !a.correct
                            return (
                              <div
                                key={key}
                                className={`rounded px-2 py-1 text-sm ${
                                  isCorrect
                                    ? 'bg-green-50 font-medium text-green-800'
                                    : wasWrong
                                      ? 'bg-red-50 text-red-800'
                                      : 'text-gray-600'
                                }`}
                              >
                                <span className="font-semibold">
                                  {answerLabels[i]}
                                </span>
                                . {text}
                                {isCorrect && ' ✓'}
                                {wasWrong && ' ✗'}
                              </div>
                            )
                          }
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        <p className="mb-1">
                          <span className="font-medium">EN:</span>{' '}
                          {a.question.questionEn}
                        </p>
                        {Object.entries(a.question.answersEn).map(
                          ([key, text], i) => (
                            <p key={key}>
                              {answerLabels[i]}. {text}
                            </p>
                          )
                        )}
                        <p className="mt-1 text-gray-600">
                          {a.question.explanation}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onNewTest}
        className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700"
      >
        New Test
      </button>
    </div>
  )
}
