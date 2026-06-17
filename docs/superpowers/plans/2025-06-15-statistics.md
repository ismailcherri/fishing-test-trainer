# Statistics & Summary Tab - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Track per-question correct/wrong cumulative stats, show memorization progress, add Summary tab with detailed per-question breakdown.

**Architecture:** New `stats.ts` lib replaces `progress.ts`. SectionCard updated to show memorized counts. BottomTabBar adds 4th Summary tab. New summary routes.

**Tech Stack:** TanStack Start (React 19), Tailwind CSS v4, Vitest

---

### Task 1: Stats library (replace progress)

**Files:**
- Create: `src/lib/stats.ts`
- Create: `src/lib/__tests__/stats.test.ts`
- Remove: `src/lib/progress.ts`
- Remove: `src/lib/__tests__/progress.test.ts`

- [ ] **Step 1: Write `src/lib/stats.ts`**

```typescript
export interface QuestionStats {
  questionNumber: number
  correct: number
  wrong: number
}

function getKey(sectionId: string): string {
  return `trainer-stats-${sectionId}`
}

export function getStats(sectionId: string): QuestionStats[] {
  try {
    const raw = localStorage.getItem(getKey(sectionId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is QuestionStats =>
        typeof e.questionNumber === 'number' &&
        typeof e.correct === 'number' &&
        typeof e.wrong === 'number',
    )
  } catch {
    return []
  }
}

export function recordAnswer(
  sectionId: string,
  questionNumber: number,
  correct: boolean,
): void {
  const stats = getStats(sectionId)
  const existing = stats.find((s) => s.questionNumber === questionNumber)
  if (existing) {
    if (correct) existing.correct++
    else existing.wrong++
  } else {
    stats.push({ questionNumber, correct: correct ? 1 : 0, wrong: correct ? 0 : 1 })
  }
  localStorage.setItem(getKey(sectionId), JSON.stringify(stats))
}

export function clearStats(sectionId: string): void {
  localStorage.removeItem(getKey(sectionId))
}

export function isMemorized(stats: QuestionStats): boolean {
  return stats.correct > stats.wrong + 2
}

export function getMemorizedCount(sectionId: string): number {
  return getStats(sectionId).filter(isMemorized).length
}

export function getTotalAttempts(sectionId: string): { correct: number; wrong: number } {
  const stats = getStats(sectionId)
  return {
    correct: stats.reduce((sum, s) => sum + s.correct, 0),
    wrong: stats.reduce((sum, s) => sum + s.wrong, 0),
  }
}

export function getConfidenceRatio(sectionId: string): number {
  const { correct, wrong } = getTotalAttempts(sectionId)
  const total = correct + wrong
  return total === 0 ? 0 : Math.round((correct / total) * 100)
}
```

- [ ] **Step 2: Write `src/lib/__tests__/stats.test.ts`**

```typescript
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
```

- [ ] **Step 3: Remove old progress files and update train page**

Remove old files:
```bash
rm -f src/lib/progress.ts src/lib/__tests__/progress.test.ts
```

Update `src/routes/_layout/train/$sectionId.tsx` — replace all `#/lib/progress` imports with `#/lib/stats`. Read the file and:
1. Change import: `import { getProgress, saveProgress, clearProgress } from '#/lib/progress'` → `import { getStats, recordAnswer, clearStats } from '#/lib/stats'`
2. Change `const progress = getProgress(sectionId)` → `const stats = getStats(sectionId)`
3. Change `!progress.some((p) => p.questionNumber === q.number)` → `!stats.some((s) => s.questionNumber === q.number)`
4. Change `saveProgress(sectionId, question.number, correct)` → `recordAnswer(sectionId, question.number, correct)`
5. Change `clearProgress(sectionId)` → `clearStats(sectionId)`

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```
Expected: 17 tests pass (6 questions + 6 stats - 7 progress + 5 exam = wait let me recalculate)

Actually remove progress test count: previous had 7 progress + 6 questions + 5 exam = 18. Now: 6 stats + 6 questions + 5 exam = 17.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stats.ts src/lib/__tests__/stats.test.ts src/routes/_layout/train/$sectionId.tsx
git rm src/lib/progress.ts src/lib/__tests__/progress.test.ts
git commit -m "feat: replace progress with cumulative stats tracking"
```

---

### Task 2: Update SectionCard for memorized display

**Files:**
- Modify: `src/components/SectionCard.tsx`

- [ ] **Step 1: Read and modify SectionCard**

Replace `import { getCompletedCount, getCorrectCount } from '#/lib/progress'` with:
```tsx
import { getMemorizedCount } from '#/lib/stats'
```

Replace `const completed = getCompletedCount(sectionId)` + `const correct = getCorrectCount(sectionId)` with:
```tsx
  const memorized = getMemorizedCount(sectionId)
```

Replace the count display and progress bar:
```tsx
      <div className="flex justify-between items-start mb-2">
        <h2 className="font-semibold text-gray-900">{section.name}</h2>
        <span className="text-sm text-gray-500">{memorized}/{total}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-green-600 h-2 rounded-full transition-all"
          style={{ width: `${total > 0 ? Math.min(Math.round((memorized / total) * 100), 100) : 0}%` }}
        />
      </div>
```

Remove the `{completed > 0 && (...)}` block (no more correct % line).

- [ ] **Step 2: Commit**

```bash
git add src/components/SectionCard.tsx
git commit -m "feat: show memorized count in SectionCard"
```

---

### Task 3: Add Summary tab to BottomTabBar

**Files:**
- Modify: `src/components/BottomTabBar.tsx`

- [ ] **Step 1: Read and modify**

Change import to include BarChart3:
```tsx
import { GraduationCap, ClipboardCheck, BookOpen, BarChart3 } from 'lucide-react'
```

Add Summary tab after Questions tab:
```tsx
  {
    to: '/summary',
    label: 'Summary',
    icon: <BarChart3 className="w-5 h-5" />,
    isActive: (pathname) => pathname.startsWith('/summary'),
  },
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BottomTabBar.tsx
git commit -m "feat: add Summary tab with BarChart3 icon"
```

---

### Task 4: Create Summary pages

**Files:**
- Create: `src/routes/_layout/summary/index.tsx`
- Create: `src/routes/_layout/summary/$sectionId.tsx`

- [ ] **Step 1: Create directories and first file**

```bash
mkdir -p src/routes/_layout/summary
```

Write `src/routes/_layout/summary/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { loadQuestions, type QuestionsData } from '#/lib/questions'
import { getMemorizedCount, getConfidenceRatio, getTotalAttempts } from '#/lib/stats'

export const Route = createFileRoute('/_layout/summary/')({
  component: SummaryIndex,
})

function SummaryIndex() {
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
      <h1 className="text-xl font-bold text-gray-900 mb-4">Statistics</h1>
      <div className="flex flex-col gap-3">
        {Object.entries(data.sections).map(([id, section]) => {
          const memorized = getMemorizedCount(id)
          const total = section.questionCount
          const confidence = getConfidenceRatio(id)
          const { correct, wrong } = getTotalAttempts(id)

          return (
            <button
              key={id}
              onClick={() => {
                const router = (window as any).__tsr_router
                if (router) router.navigate({ to: '/summary/' + id })
              }}
              className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-left hover:shadow-md transition-shadow"
            >
              <h2 className="font-semibold text-gray-900 mb-2">{section.name}</h2>
              <div className="flex gap-4 text-sm text-gray-600 mb-2">
                <span>{memorized}/{total} memorized</span>
                <span>{confidence}% confidence</span>
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {correct} correct, {wrong} wrong ({correct + wrong} total attempts)
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${total > 0 ? Math.min(Math.round((memorized / total) * 100), 100) : 0}%` }}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

Write `src/routes/_layout/summary/$sectionId.tsx`:

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { loadQuestions, getSection, type Question } from '#/lib/questions'
import { getStats, isMemorized } from '#/lib/stats'

export const Route = createFileRoute('/_layout/summary/$sectionId')({
  component: SummaryDetail,
})

function SummaryDetail() {
  const { sectionId } = Route.useParams()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    loadQuestions()
      .then((data) => {
        if (ignore) return
        const section = getSection(data, sectionId)
        if (!section) { setError('Section not found'); return }
        setQuestions(section.questions)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [sectionId])

  if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>

  const stats = getStats(sectionId)
  const statsMap = new Map(stats.map((s) => [s.questionNumber, s]))

  return (
    <div className="p-4">
      <Link to="/summary" className="text-blue-600 text-sm mb-4 inline-block">&larr; Back</Link>
      <div className="flex flex-col gap-2">
        {questions.map((q) => {
          const stat = statsMap.get(q.number)
          const memorized = stat ? isMemorized(stat) : false

          return (
            <div
              key={q.number}
              className="bg-white rounded-lg border border-gray-200 p-3"
            >
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 text-sm ${memorized ? 'text-green-500' : 'text-gray-300'}`}>
                  {memorized ? '●' : '○'}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {q.number}. {q.question}
                  </p>
                  {stat ? (
                    <p className="text-xs text-gray-500 mt-1">
                      ✓{stat.correct} ✗{stat.wrong}
                      {memorized && <span className="text-green-600 ml-2">Memorized</span>}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Not attempted</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

Note: the summary index uses `(window as any).__tsr_router` navigation — this is a workaround. For a cleaner approach, use `useRouter()` or `Link`. Let me fix it in the plan.

Replace the onClick button with a Link:
```tsx
import { Link } from '@tanstack/react-router'

// Replace the button with:
            <Link
              key={id}
              to="/summary/$sectionId"
              params={{ sectionId: id }}
              className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-left hover:shadow-md transition-shadow"
            >
```

Remove the onClick handler and `(window as any)` stuff.

- [ ] **Step 2: Generate routes, run tests, build**

```bash
npm run generate-routes && npx vitest run && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/_layout/summary src/routeTree.gen.ts
git commit -m "feat: add Summary tab pages with per-section and per-question stats"
```

---

### Task 5: Integration verification

**Files:**
- None (verification only)

- [ ] **Step 1: Final verification**

```bash
npx vitest run && npm run build
```

- [ ] **Step 2: Push**

```bash
git push origin main
```
