# Questions Tab - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Settings tab with a Questions study tab — browse questions with correct answer highlighted, translations/explanation always visible, back/forth navigation.

**Architecture:** New `/questions/$sectionId` route reuses QuestionCard with `showAnswer` prop. BottomTabBar renamed.

**Tech Stack:** TanStack Start (React 19), Tailwind CSS v4

---

### Task 1: Add showAnswer mode to QuestionCard

**Files:**
- Modify: `src/components/QuestionCard.tsx`

- [ ] **Step 1: Read current file, then add `showAnswer` prop**

Add to the interface:
```tsx
interface QuestionCardProps {
  question: Question
  onAnswer: (correct: boolean) => void
  examMode?: boolean
  onAdvance?: () => void
  showAnswer?: boolean
}
```

Destructure (default false):
```tsx
export function QuestionCard({ question, onAnswer, examMode = false, onAdvance, showAnswer = false }: QuestionCardProps) {
```

When showAnswer is true, the correct answer should be highlighted immediately and the feedback section shown. Add a `useEffect` to simulate selecting the correct answer:

```tsx
import { useState, useEffect } from 'react'
```

Add after shuffleKeys state:
```tsx
  useEffect(() => {
    if (showAnswer) {
      setSelectedKey(question.correctAnswer)
    }
  }, [question.number, showAnswer, question.correctAnswer])
```

Update `getButtonStyle` to handle showAnswer mode (show green for correct without requiring click):
The existing logic already handles this — when `selectedKey === question.correctAnswer`, it shows green. And since we set `selectedKey` to the correct answer via useEffect, it will show green.

Update the feedback section condition:
```tsx
      {(selectedKey !== null && !examMode) && (
```
Already correct — showAnswer sets selectedKey, examMode is false, so feedback shows.

- [ ] **Step 2: Verify with TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/QuestionCard.tsx
git commit -m "feat: add showAnswer prop to QuestionCard for study mode"
```

---

### Task 2: Rename Settings tab to Questions + update icon

**Files:**
- Modify: `src/components/BottomTabBar.tsx`

- [ ] **Step 1: Read and modify BottomTabBar**

Change the import:
```tsx
import { GraduationCap, ClipboardCheck, BookOpen } from 'lucide-react'
```

Replace the Settings tab definition with:
```tsx
  {
    to: '/questions',
    label: 'Questions',
    icon: <BookOpen className="w-5 h-5" />,
    isActive: (pathname) => pathname.startsWith('/questions'),
  },
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BottomTabBar.tsx
git commit -m "feat: rename Settings tab to Questions with BookOpen icon"
```

---

### Task 3: Create Questions pages

**Files:**
- Remove: `src/routes/_layout/settings/` directory
- Create: `src/routes/_layout/questions/index.tsx`
- Create: `src/routes/_layout/questions/$sectionId.tsx`

- [ ] **Step 1: Remove old settings route and create questions directory**

```bash
rm -rf src/routes/_layout/settings
mkdir -p src/routes/_layout/questions
```

- [ ] **Step 2: Write `src/routes/_layout/questions/index.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { loadQuestions, type QuestionsData } from '#/lib/questions'
import { SectionCard } from '#/components/SectionCard'

export const Route = createFileRoute('/_layout/questions/')({
  component: QuestionsIndex,
})

function QuestionsIndex() {
  const [data, setData] = useState<QuestionsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadQuestions()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [])

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">{error}</p>
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
      <h1 className="text-xl font-bold text-gray-900 mb-4">Study Questions</h1>
      <div className="flex flex-col gap-3">
        {Object.entries(data.sections).map(([id, section]) => (
          <SectionCard key={id} sectionId={id} section={section} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write `src/routes/_layout/questions/$sectionId.tsx`**

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { loadQuestions, getSection, type Question } from '#/lib/questions'
import { QuestionCard } from '#/components/QuestionCard'
import { ProgressBar } from '#/components/ProgressBar'

export const Route = createFileRoute('/_layout/questions/$sectionId')({
  component: QuestionBrowse,
})

function QuestionBrowse() {
  const { sectionId } = Route.useParams()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    loadQuestions()
      .then((data) => {
        if (ignore) return
        const section = getSection(data, sectionId)
        if (!section) {
          setError(`Section "${sectionId}" not found`)
          return
        }
        setQuestions(section.questions)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => { ignore = true }
  }, [sectionId])

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
        <Link to="/questions" className="mt-4 inline-block text-blue-600 underline text-sm">
          Back to questions
        </Link>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No questions found.</p>
        <Link to="/questions" className="mt-4 inline-block text-blue-600 underline text-sm">
          Back to questions
        </Link>
      </div>
    )
  }

  const question = questions[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex >= questions.length - 1

  return (
    <div className="p-4">
      <ProgressBar current={currentIndex + 1} total={questions.length} />
      <QuestionCard
        key={question.number}
        question={question}
        onAnswer={() => {}}
        showAnswer
      />
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => setCurrentIndex((i) => i - 1)}
          disabled={isFirst}
          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        {isLast ? (
          <Link
            to="/questions"
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors text-center"
          >
            Done
          </Link>
        ) : (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Generate routes and verify build**

```bash
npm run generate-routes && npx tsc --noEmit && npx vitest run && npm run build
```
Expected: No errors, 18 tests pass, build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/routes src/routeTree.gen.ts
git commit -m "feat: add Questions tab with section browse and study mode"
```

---

### Task 4: Integration verification and push

**Files:**
- None (verification only)

- [ ] **Step 1: Final verification**

```bash
npx vitest run && npm run build
```
Expected: 18 tests pass, build succeeds

- [ ] **Step 2: Push**

```bash
git push origin main
```
