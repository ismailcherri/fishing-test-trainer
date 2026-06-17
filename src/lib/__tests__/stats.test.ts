import { describe, it, expect, beforeEach } from 'vitest'
import { getStats, recordAnswer, clearStats, isMemorized, getMemorizedCount, getConfidenceRatio } from '../stats'

describe('stats storage', () => {
  beforeEach(() => localStorage.clear())

  it('returns empty array for new section', () => {
    expect(getStats('section-I')).toEqual([])
  })

  it('records correct and wrong answers cumulatively', () => {
    recordAnswer('section-I', 1, true)
    recordAnswer('section-I', 1, true)
    recordAnswer('section-I', 1, false)
    recordAnswer('section-I', 2, false)
    const stats = getStats('section-I')
    const q1 = stats.find((s) => s.questionNumber === 1)!
    expect(q1.correct).toBe(2)
    expect(q1.wrong).toBe(1)
    const q2 = stats.find((s) => s.questionNumber === 2)!
    expect(q2.correct).toBe(0)
    expect(q2.wrong).toBe(1)
  })

  it('isMemorized when correct > wrong + 2', () => {
    expect(isMemorized({ questionNumber: 1, correct: 5, wrong: 2 })).toBe(true)
    expect(isMemorized({ questionNumber: 1, correct: 4, wrong: 2 })).toBe(false)
    expect(isMemorized({ questionNumber: 1, correct: 3, wrong: 0 })).toBe(true)
    expect(isMemorized({ questionNumber: 1, correct: 0, wrong: 0 })).toBe(false)
  })

  it('getMemorizedCount returns count of memorized questions', () => {
    recordAnswer('section-I', 1, true); recordAnswer('section-I', 1, true)
    recordAnswer('section-I', 1, true); recordAnswer('section-I', 1, true)
    recordAnswer('section-I', 2, false)
    expect(getMemorizedCount('section-I')).toBe(1)
  })

  it('clearStats removes all entries', () => {
    recordAnswer('section-I', 1, true)
    clearStats('section-I')
    expect(getStats('section-I')).toEqual([])
  })

  it('getConfidenceRatio returns correct percentage', () => {
    recordAnswer('section-I', 1, true)
    recordAnswer('section-I', 2, false)
    recordAnswer('section-I', 3, true)
    expect(getConfidenceRatio('section-I')).toBe(67)
  })
})
