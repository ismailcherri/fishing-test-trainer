import type { TestResult } from '#/lib/exam'

interface TestResultsProps {
  result: TestResult
  onNewTest: () => void
}

export function TestResults({ result, onNewTest }: TestResultsProps) {
  const percent = Math.round((result.totalCorrect / result.totalQuestions) * 100)

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
          <div
            key={section.sectionId}
            className="bg-white rounded-lg border border-gray-200 p-3"
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
