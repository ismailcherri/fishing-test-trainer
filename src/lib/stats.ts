export interface QuestionStats {
  questionNumber: number
  correct: number
  wrong: number
}

function getKey(sectionId: string): string {
  return `trainer-stats-${sectionId}`
}

export function getStats(sectionId: string): QuestionStats[] {
  try {
    const raw = localStorage.getItem(getKey(sectionId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is QuestionStats =>
        typeof e.questionNumber === 'number' &&
        typeof e.correct === 'number' &&
        typeof e.wrong === 'number',
    )
  } catch {
    return []
  }
}

export function recordAnswer(
  sectionId: string,
  questionNumber: number,
  correct: boolean,
): void {
  const stats = getStats(sectionId)
  const existing = stats.find((s) => s.questionNumber === questionNumber)
  if (existing) {
    if (correct) existing.correct++
    else existing.wrong++
  } else {
    stats.push({ questionNumber, correct: correct ? 1 : 0, wrong: correct ? 0 : 1 })
  }
  localStorage.setItem(getKey(sectionId), JSON.stringify(stats))
}

export function clearStats(sectionId: string): void {
  localStorage.removeItem(getKey(sectionId))
}

export function isMemorized(stats: QuestionStats): boolean {
  return stats.correct > stats.wrong + 2
}

export function getMemorizedCount(sectionId: string): number {
  return getStats(sectionId).filter(isMemorized).length
}

export function getTotalAttempts(sectionId: string): { correct: number; wrong: number } {
  const stats = getStats(sectionId)
  return {
    correct: stats.reduce((sum, s) => sum + s.correct, 0),
    wrong: stats.reduce((sum, s) => sum + s.wrong, 0),
  }
}

export function getConfidenceRatio(sectionId: string): number {
  const { correct, wrong } = getTotalAttempts(sectionId)
  const total = correct + wrong
  return total === 0 ? 0 : Math.round((correct / total) * 100)
}
