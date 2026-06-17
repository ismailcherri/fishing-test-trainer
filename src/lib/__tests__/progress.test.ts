import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearProgress,
  getCompletedCount,
  getCorrectCount,
  getProgress,
  saveProgress,
} from '../progress'

describe('progress storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns empty array for new section', () => {
    expect(getProgress('section-I')).toEqual([])
  })

  it('saves and retrieves progress entries', () => {
    saveProgress('section-I', 1, true)
    saveProgress('section-I', 2, false)
    const progress = getProgress('section-I')
    expect(progress).toHaveLength(2)
    expect(progress[0]).toEqual({ questionNumber: 1, correct: true })
    expect(progress[1]).toEqual({ questionNumber: 2, correct: false })
  })

  it('updates existing entry when re-answered', () => {
    saveProgress('section-I', 1, false)
    saveProgress('section-I', 1, true)
    const progress = getProgress('section-I')
    expect(progress).toHaveLength(1)
    expect(progress[0].correct).toBe(true)
  })

  it('getCompletedCount returns correct count', () => {
    saveProgress('section-I', 1, true)
    saveProgress('section-I', 2, false)
    expect(getCompletedCount('section-I')).toBe(2)
  })

  it('getCorrectCount returns correct count', () => {
    saveProgress('section-I', 1, true)
    saveProgress('section-I', 2, false)
    saveProgress('section-I', 3, true)
    expect(getCorrectCount('section-I')).toBe(2)
  })

  it('clearProgress removes all entries for a section', () => {
    saveProgress('section-I', 1, true)
    clearProgress('section-I')
    expect(getProgress('section-I')).toEqual([])
  })

  it('isolates progress between sections', () => {
    saveProgress('section-I', 1, true)
    saveProgress('section-II', 1, false)
    expect(getCompletedCount('section-I')).toBe(1)
    expect(getCompletedCount('section-II')).toBe(1)
  })
})
