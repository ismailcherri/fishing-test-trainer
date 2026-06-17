import { useState } from 'react'
import type { TestResult } from '#/lib/exam'

interface TestResultsProps {
  result: TestResult
  onNewTest: () => void
}

const answerLabels = ['A', 'B', 'C']

export function TestResults({ result, onNewTest }: TestResultsProps) {
  const percent = Math.round((result.totalCorrect / result.totalQuestions) * 100)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const toggleSection = (sectionId: string) => {
    setExpandedSection((prev) => (prev === sectionId ? null : sectionId))
  }

  return (
    <div className="p-4">
      <div className="text-center mb-6">
        <h2
          className={`text-2xl font-bold mb-2 ${
            result.passed ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {result.passed ? 'PASS' : 'FAIL'}
        </h2>
        <p className="text-lg text-gray-700">
          {result.totalCorrect} / {result.totalQuestions} correct ({percent}%)
        </p>
      </div>

      <div className="space-y-3 mb-6">
        <h3 className="font-semibold text-gray-900">Section Breakdown</h3>
        {result.sectionResults.map((section) => (
          <div key={section.sectionId}>
            <button
              onClick={() => toggleSection(section.sectionId)}
              className="w-full bg-white rounded-lg border border-gray-200 p-3 text-left hover:border-gray-300 transition-colors"
            >
              <div className="flex justify-between items-center mb-1">
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
              <div className="w-full bg-gray-200 rounded-full h-1.5">
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
                      className="bg-white border border-gray-200 rounded-lg p-3"
                    >
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        {a.question.number}. {a.question.question}
                      </p>
                      <div className="flex flex-col gap-1 mb-2">
                        {Object.entries(a.question.answers).map(([key, text], i) => {
                          const isCorrect = key === a.question.correctAnswer
                          const isSelected = a.selectedAnswer && key === a.selectedAnswer
                          const wasWrong = a.selectedAnswer && isSelected && !a.correct
                          return (
                            <div
                              key={key}
                              className={`text-sm px-2 py-1 rounded ${
                                isCorrect
                                  ? 'bg-green-50 text-green-800 font-medium'
                                  : wasWrong
                                    ? 'bg-red-50 text-red-800'
                                    : 'text-gray-600'
                              }`}
                            >
                              <span className="font-semibold">{answerLabels[i]}</span>. {text}
                              {isCorrect && ' ✓'}
                              {wasWrong && ' ✗'}
                            </div>
                          )
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        <p className="mb-1"><span className="font-medium">EN:</span> {a.question.questionEn}</p>
                        {Object.entries(a.question.answersEn).map(([key, text], i) => (
                          <p key={key}>{answerLabels[i]}. {text}</p>
                        ))}
                        <p className="mt-1 text-gray-600">{a.question.explanation}</p>
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
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        New Test
      </button>
    </div>
  )
}
