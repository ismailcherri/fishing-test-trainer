import type { SectionData } from '#/lib/questions'
import {
  getMemorizedCount,
  getStats,
  getWeakQuestionNumbers,
} from '#/lib/stats'
import { Link } from '@tanstack/react-router'

interface SectionCardProps {
  sectionId: string
  section: SectionData
  to?: string
}

export function SectionCard({
  sectionId,
  section,
  to = '/train/$sectionId',
}: SectionCardProps) {
  const attempted = getStats(sectionId).length
  const memorized = getMemorizedCount(sectionId)
  const weakCount = getWeakQuestionNumbers(sectionId).length
  const total = section.questionCount
  const progressPercent =
    total > 0 ? Math.min(Math.round((attempted / total) * 100), 100) : 0

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between">
        <h2 className="font-semibold text-gray-900">{section.name}</h2>
        <span className="text-sm text-gray-500">
          {attempted}/{total}
        </span>
      </div>
      <div className="mb-1 h-2 w-full rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-green-600 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      {attempted > 0 && (
        <p className="mt-1 text-xs text-gray-500">{memorized} memorized</p>
      )}
      <div className="mt-3 flex justify-start gap-2">
        <Link
          to={to}
          params={{ sectionId }}
          className="rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Train
        </Link>
        {weakCount > 0 && (
          <Link
            to={to}
            params={{ sectionId }}
            search={{ mode: 'weak' }}
            className="rounded-lg bg-amber-600 px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-amber-700"
          >
            Train on Weak ({weakCount})
          </Link>
        )}
      </div>
    </div>
  )
}
