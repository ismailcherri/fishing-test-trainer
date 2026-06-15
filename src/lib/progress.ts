export interface ProgressEntry {
  questionNumber: number
  correct: boolean
}

function getKey(sectionId: string): string {
  return `trainer-progress-${sectionId}`
}

export function getProgress(sectionId: string): ProgressEntry[] {
  try {
    const raw = localStorage.getItem(getKey(sectionId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is ProgressEntry =>
        typeof e.questionNumber === 'number' && typeof e.correct === 'boolean',
    )
  } catch {
    return []
  }
}

export function saveProgress(
  sectionId: string,
  questionNumber: number,
  correct: boolean,
): void {
  const progress = getProgress(sectionId)
  const existing = progress.findIndex((p) => p.questionNumber === questionNumber)
  if (existing !== -1) {
    progress[existing] = { questionNumber, correct }
  } else {
    progress.push({ questionNumber, correct })
  }
  localStorage.setItem(getKey(sectionId), JSON.stringify(progress))
}

export function clearProgress(sectionId: string): void {
  localStorage.removeItem(getKey(sectionId))
}

export function getCompletedCount(sectionId: string): number {
  return getProgress(sectionId).length
}

export function getCorrectCount(sectionId: string): number {
  return getProgress(sectionId).filter((p) => p.correct).length
}
