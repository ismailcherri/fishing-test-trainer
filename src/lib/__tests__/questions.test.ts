import { describe, expect, it } from 'vitest'
import type { Question, SectionData } from '../questions'
import { getSection, getShuffledAnswerKeys, shuffleArray } from '../questions'

describe('shuffleArray', () => {
  it('returns an array of the same length', () => {
    const input = [1, 2, 3, 4, 5]
    const result = shuffleArray(input)
    expect(result).toHaveLength(input.length)
  })

  it('contains all original elements', () => {
    const input = ['A', 'B', 'C']
    const result = shuffleArray(input)
    expect(result.sort()).toEqual(['A', 'B', 'C'])
  })

  it('does not mutate the original array', () => {
    const input = [1, 2, 3]
    const copy = [...input]
    shuffleArray(input)
    expect(input).toEqual(copy)
  })
})

describe('getShuffledAnswerKeys', () => {
  it('returns shuffled keys from a question', () => {
    const question: Question = {
      number: 1,
      subsection: 1,
      question: 'Test?',
      answers: { A: 'One', B: 'Two', C: 'Three' },
      correctAnswer: 'A',
      questionEn: 'Test?',
      answersEn: { A: 'One', B: 'Two', C: 'Three' },
      explanation: 'Because.',
    }
    const keys = getShuffledAnswerKeys(question)
    expect(keys).toHaveLength(3)
    expect(keys.sort()).toEqual(['A', 'B', 'C'])

    const results = new Set(
      Array.from({ length: 20 }, () =>
        getShuffledAnswerKeys(question).join(',')
      )
    )
    expect(results.size).toBeGreaterThan(1)
  })
})

describe('getSection', () => {
  it('returns the section for a valid key', () => {
    const section: SectionData = {
      name: 'Fish',
      questionCount: 2,
      questions: [],
    }
    const data = { sections: { I: section } }
    expect(getSection(data as any, 'I')).toBe(section)
  })

  it('returns undefined for a missing key', () => {
    const data = { sections: {} }
    expect(getSection(data as any, 'II')).toBeUndefined()
  })
})
