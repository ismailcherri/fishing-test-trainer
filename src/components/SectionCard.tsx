import { getCompletedCount, getCorrectCount } from '#/lib/progress'
import type { SectionData } from '#/lib/questions'
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
  const completed = getCompletedCount(sectionId)
  const correct = getCorrectCount(sectionId)
  const total = section.questionCount
  const progressPercent =
    total > 0 ? Math.min(Math.round((completed / total) * 100), 100) : 0

  return (
    <Link
      to={to}
      params={{ sectionId }}
      className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between">
        <h2 className="font-semibold text-gray-900">{section.name}</h2>
        <span className="text-sm text-gray-500">
          {completed}/{total}
        </span>
      </div>
      <div className="mb-1 h-2 w-full rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-blue-600 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      {completed > 0 && (
        <p className="mt-1 text-xs text-gray-500">
          {correct} correct ({Math.round((correct / completed) * 100) || 0}%)
        </p>
      )}
    </Link>
  )
}
