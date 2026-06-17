export interface Question {
  number: number
  subsection: number
  question: string
  answers: Record<string, string>
  correctAnswer: string
  questionEn: string
  answersEn: Record<string, string>
  explanation: string
}

export interface SectionData {
  name: string
  questionCount: number
  questions: Question[]
}

export interface QuestionsData {
  title: string
  description: string
  note: string
  source: string
  totalQuestions: number
  sections: Record<string, SectionData>
}

let cachedData: QuestionsData | null = null

export async function loadQuestions(): Promise<QuestionsData> {
  if (cachedData) return cachedData
  const res = await fetch(`${import.meta.env.BASE_URL}questions.json`)
  if (!res.ok) throw new Error(`Failed to load questions: ${res.status}`)
  cachedData = await res.json()
  return cachedData!
}

export function getSection(
  data: QuestionsData,
  sectionId: string
): SectionData | undefined {
  return data.sections[sectionId]
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function getShuffledAnswerKeys(question: Question): string[] {
  return shuffleArray(Object.keys(question.answers))
}
