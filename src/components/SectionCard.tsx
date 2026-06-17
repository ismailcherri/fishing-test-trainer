import { Link } from '@tanstack/react-router'
import { getCompletedCount, getCorrectCount } from '#/lib/progress'
import type { SectionData } from '#/lib/questions'

interface SectionCardProps {
  sectionId: string
  section: SectionData
  to?: string
}

export function SectionCard({ sectionId, section, to = '/train/$sectionId' }: SectionCardProps) {
  const completed = getCompletedCount(sectionId)
  const correct = getCorrectCount(sectionId)
  const total = section.questionCount
  const progressPercent = total > 0 ? Math.min(Math.round((completed / total) * 100), 100) : 0

  return (
    <Link
      to={to}
      params={{ sectionId }}
      className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-2">
        <h2 className="font-semibold text-gray-900">{section.name}</h2>
        <span className="text-sm text-gray-500">{completed}/{total}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      {completed > 0 && (
        <p className="text-xs text-gray-500 mt-1">
          {correct} correct ({Math.round((correct / completed) * 100) || 0}%)
        </p>
      )}
    </Link>
  )
}
