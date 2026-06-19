import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearStats,
  clearAllStats,
  createSession,
  fullReset,
  getConfidenceRatio,
  getMemorizedCount,
  getSession,
  getStats,
  getWeakQuestionNumbers,
  isMemorized,
  recordAnswer,
  advanceSession,
  restartSession,
} from '../storage'

describe('storage (IndexedDB)', () => {
  beforeEach(async () => {
    await clearAllStats()
  })

  it('returns empty array for new section', async () => {
    expect(await getStats('section-I')).toEqual([])
  })

  it('records correct and wrong answers cumulatively', async () => {
    await recordAnswer('section-I', 1, true)
    await recordAnswer('section-I', 1, true)
    await recordAnswer('section-I', 1, false)
    await recordAnswer('section-I', 2, false)
    const stats = await getStats('section-I')
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

  it('getMemorizedCount returns count of memorized questions', async () => {
    await recordAnswer('section-I', 1, true)
    await recordAnswer('section-I', 1, true)
    await recordAnswer('section-I', 1, true)
    await recordAnswer('section-I', 1, true)
    await recordAnswer('section-I', 2, false)
    expect(await getMemorizedCount('section-I')).toBe(1)
  })

  it('clearStats removes all entries for a section', async () => {
    await recordAnswer('section-I', 1, true)
    await recordAnswer('section-II', 1, true)
    await clearStats('section-I')
    expect(await getStats('section-I')).toEqual([])
    expect(await getStats('section-II').then((s) => s.length)).toBe(1)
  })

  it('getConfidenceRatio returns correct percentage', async () => {
    await recordAnswer('section-I', 1, true)
    await recordAnswer('section-I', 2, false)
    await recordAnswer('section-I', 3, true)
    expect(await getConfidenceRatio('section-I')).toBe(67)
  })

  it('getConfidenceRatio returns 0 with no answers', async () => {
    expect(await getConfidenceRatio('section-I')).toBe(0)
  })

  it('getWeakQuestionNumbers returns questions with wrong > correct', async () => {
    await recordAnswer('section-I', 1, true)
    await recordAnswer('section-I', 1, false)
    await recordAnswer('section-I', 1, false)
    await recordAnswer('section-I', 2, true)
    await recordAnswer('section-I', 2, true)
    await recordAnswer('section-I', 3, false)
    await recordAnswer('section-I', 4, true)
    await recordAnswer('section-I', 4, false)
    expect(await getWeakQuestionNumbers('section-I')).toEqual([1, 3])
  })

  describe('sessions', () => {
    it('returns null for unknown section', async () => {
      expect(await getSession('section-I')).toBeNull()
    })

    it('creates and retrieves a session', async () => {
      await createSession('section-I', 'normal', [1, 2, 3])
      const session = await getSession('section-I')
      expect(session).not.toBeNull()
      expect(session!.currentIndex).toBe(0)
      expect(session!.mode).toBe('normal')
      expect(session!.questionOrder).toEqual([1, 2, 3])
      expect(session!.completed).toBe(false)
    })

    it('advanceSession increments index', async () => {
      await createSession('section-I', 'normal', [1, 2, 3])
      await advanceSession('section-I')
      const session = await getSession('section-I')
      expect(session!.currentIndex).toBe(1)
      expect(session!.completed).toBe(false)
    })

    it('advanceSession marks completed at end', async () => {
      await createSession('section-I', 'normal', [1])
      await advanceSession('section-I')
      const session = await getSession('section-I')
      expect(session!.completed).toBe(true)
    })

    it('restartSession resets index and completed flag', async () => {
      await createSession('section-I', 'normal', [1, 2, 3])
      await advanceSession('section-I')
      await advanceSession('section-I')
      await advanceSession('section-I')
      expect((await getSession('section-I'))!.completed).toBe(true)

      await restartSession('section-I')
      const session = await getSession('section-I')
      expect(session!.currentIndex).toBe(0)
      expect(session!.completed).toBe(false)
    })

    it('clearStats also deletes the session', async () => {
      await createSession('section-I', 'normal', [1, 2])
      await clearStats('section-I')
      expect(await getSession('section-I')).toBeNull()
    })

    it('fullReset clears stats and deletes session', async () => {
      await recordAnswer('section-I', 1, true)
      await createSession('section-I', 'normal', [1, 2])
      await fullReset('section-I')
      expect(await getStats('section-I')).toEqual([])
      expect(await getSession('section-I')).toBeNull()
    })
  })
})
