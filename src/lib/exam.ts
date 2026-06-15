import type { Question, QuestionsData } from '#/lib/questions'
import { shuffleArray } from '#/lib/questions'

export interface QuestionWithSection extends Question {
  sectionId: string
}

export interface TestAnswer {
  question: QuestionWithSection
  selectedAnswer: string | null
  correct: boolean
}

export interface SectionResult {
  sectionId: string
  name: string
  correct: number
  total: number
  passed: boolean
}

export interface TestResult {
  answers: TestAnswer[]
  totalCorrect: number
  totalQuestions: number
  passed: boolean
  sectionResults: SectionResult[]
}

export function generateTest(data: QuestionsData): QuestionWithSection[] {
  const pool: QuestionWithSection[] = []
  for (const [sectionId, section] of Object.entries(data.sections)) {
    const picked = shuffleArray([...section.questions]).slice(0, 12)
    for (const q of picked) {
      pool.push({ ...q, sectionId })
    }
  }
  return shuffleArray(pool)
}

export function scoreTest(
  questions: QuestionWithSection[],
  answers: Map<number, string | null>,
  data: QuestionsData,
): TestResult {
  const testAnswers: TestAnswer[] = questions.map((q) => {
    const selected = answers.get(q.number) ?? null
    const correct = selected === q.correctAnswer
    return { question: q, selectedAnswer: selected, correct }
  })

  const totalCorrect = testAnswers.filter((a) => a.correct).length

  const sectionResults: SectionResult[] = Object.entries(data.sections).map(
    ([sectionId, section]) => {
      const sectionAnswers = testAnswers.filter(
        (a) => a.question.sectionId === sectionId,
      )
      const correct = sectionAnswers.filter((a) => a.correct).length
      return {
        sectionId,
        name: section.name,
        correct,
        total: sectionAnswers.length,
        passed: sectionAnswers.length - correct <= 6,
      }
    },
  )

  const overallPassed = totalCorrect >= 45
  const allSectionsPassed = sectionResults.every((s) => s.passed)
  const passed = overallPassed && allSectionsPassed

  return { answers: testAnswers, totalCorrect, totalQuestions: questions.length, passed, sectionResults }
}
