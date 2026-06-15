# Fishing License Trainer - Train Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Train tab of a mobile-like fishing license exam trainer with section list, sequential question display with shuffled answers, answer feedback with translations, and localStorage progress persistence.

**Architecture:** File-based routing with a pathless `_layout` route providing a bottom tab bar. Question data loaded from `public/questions.json` with client-side shuffling. Progress stored in `localStorage` per section.

**Tech Stack:** TanStack Start (React 19), TanStack Router (file-based), Tailwind CSS v4, lucide-react icons, Vitest

---

### File Map

| File | Purpose |
|------|---------|
| `src/lib/questions.ts` | Types + question loading + shuffle utility |
| `src/lib/progress.ts` | localStorage read/write/clear for per-section progress |
| `src/components/BottomTabBar.tsx` | 3-tab bottom nav bar |
| `src/components/SectionCard.tsx` | Section card with name, count, progress |
| `src/components/QuestionCard.tsx` | Question text, shuffled answer buttons, feedback display |
| `src/components/ProgressBar.tsx` | Question X of Y indicator |
| `src/routes/_layout.tsx` | Pathless layout: tab bar + `<Outlet />` |
| `src/routes/index.tsx` | **Modify** — Section list (Train tab content) |
| `src/routes/train/$sectionId.tsx` | Active question session |
| `src/routes/test/index.tsx` | Placeholder |
| `src/routes/settings/index.tsx` | Placeholder |
| `src/routes/__root.tsx` | **Modify** — Update page title |
| `src/lib/__tests__/questions.test.ts` | Tests for question loading and shuffling |
| `src/lib/__tests__/progress.test.ts` | Tests for progress storage |

---

### Task 1: Types and question utilities

**Files:**
- Create: `src/lib/questions.ts`
- Create: `src/lib/__tests__/questions.test.ts`

- [ ] **Step 1: Write the file `src/lib/questions.ts`**

```typescript
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
  const res = await fetch('/questions.json')
  if (!res.ok) throw new Error(`Failed to load questions: ${res.status}`)
  cachedData = await res.json()
  return cachedData!
}

export function getSection(data: QuestionsData, sectionId: string): SectionData | undefined {
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
```

- [ ] **Step 2: Write the file `src/lib/__tests__/questions.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { shuffleArray, getShuffledAnswerKeys } from '../questions'
import type { Question } from '../questions'

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
  })
})
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/questions.test.ts`
Expected: 4 tests pass

- [ ] **Step 4: Commit**

```bash
git add src/lib/questions.ts src/lib/__tests__/questions.test.ts
git commit -m "feat: add question types, loading, and shuffle utilities"
```

---

### Task 2: Progress storage

**Files:**
- Create: `src/lib/progress.ts`
- Create: `src/lib/__tests__/progress.test.ts`

- [ ] **Step 1: Write the file `src/lib/progress.ts`**

```typescript
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
```

- [ ] **Step 2: Write the file `src/lib/__tests__/progress.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getProgress,
  saveProgress,
  clearProgress,
  getCompletedCount,
  getCorrectCount,
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
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/progress.test.ts`
Expected: 7 tests pass

- [ ] **Step 4: Commit**

```bash
git add src/lib/progress.ts src/lib/__tests__/progress.test.ts
git commit -m "feat: add localStorage progress storage utilities"
```

---

### Task 3: BottomTabBar component

**Files:**
- Create: `src/components/BottomTabBar.tsx`

- [ ] **Step 1: Write the file `src/components/BottomTabBar.tsx`**

```tsx
import { Link } from '@tanstack/react-router'
import { GraduationCap, ClipboardCheck, Settings } from 'lucide-react'

interface Tab {
  to: string
  label: string
  icon: React.ReactNode
  isActive: (pathname: string) => boolean
}

const tabs: Tab[] = [
  {
    to: '/',
    label: 'Train',
    icon: <GraduationCap className="w-5 h-5" />,
    isActive: (pathname) => pathname === '/' || pathname.startsWith('/train'),
  },
  {
    to: '/test',
    label: 'Test',
    icon: <ClipboardCheck className="w-5 h-5" />,
    isActive: (pathname) => pathname.startsWith('/test'),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: <Settings className="w-5 h-5" />,
    isActive: (pathname) => pathname.startsWith('/settings'),
  },
]

export function BottomTabBar() {
  const pathname = window.location.pathname

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white z-50">
      <div className="max-w-md mx-auto flex justify-around">
        {tabs.map((tab) => {
          const active = tab.isActive(pathname)
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center py-2 px-3 text-xs transition-colors ${
                active
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              <span className="mt-0.5">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BottomTabBar.tsx
git commit -m "feat: add BottomTabBar component with Train/Test/Settings tabs"
```

---

### Task 4: Pathless layout route

**Files:**
- Create: `src/routes/_layout.tsx`

- [ ] **Step 1: Write the file `src/routes/_layout.tsx`**

```tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { BottomTabBar } from '#/components/BottomTabBar'

export const Route = createFileRoute('/_layout')({
  component: LayoutComponent,
})

function LayoutComponent() {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      <div className="pb-16">
        <Outlet />
      </div>
      <BottomTabBar />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/_layout.tsx
git commit -m "feat: add pathless layout route with bottom tab bar wrapper"
```

---

### Task 5: SectionList page (modify index route as train tab)

**Files:**
- Modify: `src/routes/index.tsx`
- Create: `src/components/SectionCard.tsx`

- [ ] **Step 1: Write the file `src/components/SectionCard.tsx`**

```tsx
import { Link } from '@tanstack/react-router'
import { getCompletedCount, getCorrectCount } from '#/lib/progress'
import type { SectionData } from '#/lib/questions'

interface SectionCardProps {
  sectionId: string
  section: SectionData
}

export function SectionCard({ sectionId, section }: SectionCardProps) {
  const completed = getCompletedCount(sectionId)
  const correct = getCorrectCount(sectionId)
  const total = section.questionCount
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <Link
      to="/train/$sectionId"
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
```

- [ ] **Step 2: Modify the file `src/routes/index.tsx`**

Replace the current content with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { loadQuestions, type QuestionsData } from '#/lib/questions'
import { SectionCard } from '#/components/SectionCard'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const [data, setData] = useState<QuestionsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadQuestions()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load questions'))
  }, [])

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-2">Failed to load questions</p>
        <p className="text-sm text-gray-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-blue-600 underline text-sm"
        >
          Reload
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Loading questions...</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Fishing License Trainer</h1>
      <div className="flex flex-col gap-3">
        {Object.entries(data.sections).map(([id, section]) => (
          <SectionCard key={id} sectionId={id} section={section} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run dev server to verify the page loads**

Run: `npm run dev`
Expected: Page loads at http://localhost:3000, shows section list with progress bars

- [ ] **Step 4: Commit**

```bash
git add src/routes/index.tsx src/components/SectionCard.tsx
git commit -m "feat: add section list page with progress cards"
```

---

### Task 6: ProgressBar component

**Files:**
- Create: `src/components/ProgressBar.tsx`

- [ ] **Step 1: Write the file `src/components/ProgressBar.tsx`**

```tsx
interface ProgressBarProps {
  current: number
  total: number
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">
          Question {current} / {total}
        </span>
        <span className="text-sm text-gray-500">{percent}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProgressBar.tsx
git commit -m "feat: add ProgressBar component"
```

---

### Task 7: QuestionCard component (question display + answer buttons + feedback)

**Files:**
- Create: `src/components/QuestionCard.tsx`

- [ ] **Step 1: Write the file `src/components/QuestionCard.tsx`**

```tsx
import { useState } from 'react'
import type { Question } from '#/lib/questions'
import { getShuffledAnswerKeys } from '#/lib/questions'

interface QuestionCardProps {
  question: Question
  onAnswer: (correct: boolean) => void
}

export function QuestionCard({ question, onAnswer }: QuestionCardProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [shuffledKeys] = useState<string[]>(() => getShuffledAnswerKeys(question))

  const handleSelect = (key: string) => {
    if (selectedKey !== null) return
    setSelectedKey(key)
    onAnswer(key === question.correctAnswer)
  }

  const getButtonStyle = (key: string): string => {
    if (selectedKey === null) {
      return 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
    }
    if (key === question.correctAnswer) {
      return 'border-green-500 bg-green-50 text-green-800'
    }
    if (key === selectedKey) {
      return 'border-red-500 bg-red-50 text-red-800'
    }
    return 'border-gray-200 bg-gray-50 text-gray-400'
  }

  const answerLabels = ['A', 'B', 'C']

  return (
    <div>
      <p className="text-lg font-medium text-gray-900 mb-4">{question.question}</p>

      <div className="flex flex-col gap-2 mb-4">
        {shuffledKeys.map((key, index) => (
          <button
            key={key}
            onClick={() => handleSelect(key)}
            disabled={selectedKey !== null}
            className={`border-2 rounded-lg p-3 text-left transition-colors ${getButtonStyle(key)}`}
          >
            <span className="font-semibold mr-2">{answerLabels[index]}</span>
            {question.answers[key]}
          </button>
        ))}
      </div>

      {selectedKey !== null && (
        <div className="bg-gray-100 rounded-lg p-4 mt-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-500 uppercase mb-1">English</p>
            <p className="text-gray-800">{question.questionEn}</p>
            <div className="mt-2 flex flex-col gap-1">
              {shuffledKeys.map((key, index) => (
                <p key={key} className="text-sm text-gray-700">
                  <span className="font-semibold">{answerLabels[index]}</span>:{' '}
                  {question.answersEn[key]}
                </p>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase mb-1">Explanation</p>
            <p className="text-gray-700 text-sm">{question.explanation}</p>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/QuestionCard.tsx
git commit -m "feat: add QuestionCard with shuffled answers and feedback display"
```

---

### Task 8: Question session page

**Files:**
- Create: `src/routes/train/$sectionId.tsx`

- [ ] **Step 1: Write the file `src/routes/train/$sectionId.tsx`**

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import { loadQuestions, getSection, type Question } from '#/lib/questions'
import { getProgress, saveProgress, clearProgress } from '#/lib/progress'
import { QuestionCard } from '#/components/QuestionCard'
import { ProgressBar } from '#/components/ProgressBar'

export const Route = createFileRoute('/train/$sectionId')({
  component: QuestionSession,
})

function QuestionSession() {
  const { sectionId } = Route.useParams()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [sectionComplete, setSectionComplete] = useState(false)

  useEffect(() => {
    loadQuestions()
      .then((data) => {
        const section = getSection(data, sectionId)
        if (!section) {
          setError(`Section "${sectionId}" not found`)
          return
        }
        setQuestions(section.questions)

        const progress = getProgress(sectionId)
        const firstUnanswered = section.questions.findIndex(
          (q) => !progress.some((p) => p.questionNumber === q.number),
        )
        if (firstUnanswered === -1) {
          setSectionComplete(true)
          setCurrentIndex(section.questions.length)
        } else {
          setCurrentIndex(firstUnanswered)
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [sectionId])

  const handleAnswer = useCallback(
    (correct: boolean) => {
      const question = questions[currentIndex]
      if (!question) return
      saveProgress(sectionId, question.number, correct)
      setAnswered(true)
    },
    [questions, currentIndex, sectionId],
  )

  const handleNext = () => {
    const nextIndex = currentIndex + 1
    if (nextIndex >= questions.length) {
      setSectionComplete(true)
    }
    setCurrentIndex(nextIndex)
    setAnswered(false)
  }

  const handleRestart = () => {
    clearProgress(sectionId)
    setCurrentIndex(0)
    setAnswered(false)
    setSectionComplete(false)
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Loading questions...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">{error}</p>
        <Link to="/" className="mt-4 inline-block text-blue-600 underline text-sm">
          Back to sections
        </Link>
      </div>
    )
  }

  if (sectionComplete) {
    const progress = getProgress(sectionId)
    const correct = progress.filter((p) => p.correct).length
    const total = progress.length

    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Section Complete!</h2>
        <p className="text-gray-600 mb-4">
          {correct} / {total} correct ({Math.round((correct / total) * 100)}%)
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleRestart}
            className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Restart Section
          </button>
          <Link to="/" className="text-blue-600 underline text-sm">
            Back to sections
          </Link>
        </div>
      </div>
    )
  }

  const question = questions[currentIndex]
  if (!question) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No question found.</p>
        <Link to="/" className="mt-4 inline-block text-blue-600 underline text-sm">
          Back to sections
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4">
      <ProgressBar current={currentIndex + 1} total={questions.length} />
      <QuestionCard question={question} onAnswer={handleAnswer} />
      {answered && (
        <button
          onClick={handleNext}
          className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Next
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run dev server and test the flow**

Run: `npm run dev`
Expected: Navigate to `/train/I`, see first question with shuffled answers, answer it, see feedback, click Next

- [ ] **Step 3: Commit**

```bash
git add src/routes/train/$sectionId.tsx
git commit -m "feat: add question session page with sequential training flow"
```

---

### Task 9: Test and Settings placeholder pages

**Files:**
- Create: `src/routes/test/index.tsx`
- Create: `src/routes/settings/index.tsx`

- [ ] **Step 1: Write the file `src/routes/test/index.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/test/')({
  component: TestPage,
})

function TestPage() {
  return (
    <div className="p-6 text-center">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Test Mode</h1>
      <p className="text-gray-500">Coming soon</p>
    </div>
  )
}
```

- [ ] **Step 2: Write the file `src/routes/settings/index.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings/')({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="p-6 text-center">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-gray-500">Coming soon</p>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/test/index.tsx src/routes/settings/index.tsx
git commit -m "feat: add placeholder pages for Test and Settings tabs"
```

---

### Task 10: Update root HTML title

**Files:**
- Modify: `src/routes/__root.tsx`

- [ ] **Step 1: Update the title in `src/routes/__root.tsx`**

Change line 18 from:
```tsx
title: 'TanStack Start Starter',
```
To:
```tsx
title: 'Fishing License Trainer',
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/__root.tsx
git commit -m "chore: update page title to Fishing License Trainer"
```

---

### Task 11: Generate routes and integration test

**Files:**
- Regenerate: `src/routeTree.gen.ts`

- [ ] **Step 1: Generate routes**

Run: `npm run generate-routes`
Expected: Route tree regenerated successfully without errors

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (11 tests from lib tests)

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds without errors

- [ ] **Step 4: Commit**

```bash
git add src/routeTree.gen.ts
git commit -m "chore: regenerate route tree after adding routes"
```
