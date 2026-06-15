import { describe, it, expect } from 'vitest'
import { generateTest, scoreTest } from '../exam'
import type { QuestionsData } from '../questions'

function makeQuestions(count: number, _sectionId: string) {
  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    subsection: 1,
    question: `Q${i + 1}`,
    answers: { A: 'A', B: 'B', C: 'C' },
    correctAnswer: 'A',
    questionEn: `Q${i + 1}`,
    answersEn: { A: 'A', B: 'B', C: 'C' },
    explanation: '',
  }))
}

function makeData(sectionCounts: Record<string, number>): QuestionsData {
  const sections: QuestionsData['sections'] = {}
  let num = 1
  for (const [id, count] of Object.entries(sectionCounts)) {
    const qs = makeQuestions(count, id).map((q) => ({ ...q, number: num++ }))
    sections[id] = { name: `Section ${id}`, questionCount: qs.length, questions: qs }
  }
  return {
    title: 'Test',
    description: '',
    note: '',
    source: '',
    totalQuestions: Object.values(sections).reduce((s, sec) => s + sec.questions.length, 0),
    sections,
  }
}

describe('generateTest', () => {
  it('picks 12 from each section and shuffles', () => {
    const data = makeData({ I: 20, II: 20, III: 20, IV: 20, V: 20 })
    const test = generateTest(data)
    expect(test).toHaveLength(60)
    for (const id of ['I', 'II', 'III', 'IV', 'V']) {
      expect(test.filter((q) => q.sectionId === id)).toHaveLength(12)
    }
  })

  it('handles sections with exactly 12 questions', () => {
    const data = makeData({ I: 12, II: 12, III: 12, IV: 12, V: 12 })
    const test = generateTest(data)
    expect(test).toHaveLength(60)
    for (const id of ['I', 'II', 'III', 'IV', 'V']) {
      expect(test.filter((q) => q.sectionId === id)).toHaveLength(12)
    }
  })
})

describe('scoreTest', () => {
  it('passes when >= 45 correct and <= 6 wrong per section', () => {
    const data = makeData({ I: 20, II: 20, III: 20, IV: 20, V: 20 })
    const questions = generateTest(data)
    const answers = new Map<number, string | null>()
    for (const q of questions) {
      answers.set(q.number, q.correctAnswer)
    }
    const result = scoreTest(questions, answers, data)
    expect(result.totalCorrect).toBe(60)
    expect(result.passed).toBe(true)
  })

  it('fails when < 45 correct', () => {
    const data = makeData({ I: 20, II: 20, III: 20, IV: 20, V: 20 })
    const questions = generateTest(data)
    const answers = new Map<number, string | null>()
    let count = 0
    for (const q of questions) {
      answers.set(q.number, count < 44 ? q.correctAnswer : 'B')
      count++
    }
    const result = scoreTest(questions, answers, data)
    expect(result.totalCorrect).toBe(44)
    expect(result.passed).toBe(false)
  })

  it('fails when > 6 wrong in a section', () => {
    const data = makeData({ I: 20, II: 20, III: 20, IV: 20, V: 20 })
    const questions = generateTest(data)
    const answers = new Map<number, string | null>()
    for (const q of questions) {
      if (q.sectionId === 'I') {
        const sectionIAnswers = questions.filter((x) => x.sectionId === 'I')
        const idx = sectionIAnswers.indexOf(q)
        answers.set(q.number, idx < 5 ? q.correctAnswer : 'B')
      } else {
        answers.set(q.number, q.correctAnswer)
      }
    }
    const result = scoreTest(questions, answers, data)
    const sectionI = result.sectionResults.find((s) => s.sectionId === 'I')!
    expect(sectionI.correct).toBe(5)
    expect(sectionI.passed).toBe(false)
    expect(result.passed).toBe(false)
  })
})
