# Storage & Session Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace localStorage stats with IndexedDB via `idb`, add training session tracking, and fix the "can't restart after completion" bug.

**Architecture:** New `storage.ts` wraps IndexedDB with two object stores (`stats` for cumulative per-question counts, `sessions` for active training round state). Components switch from sync localStorage calls to async IndexedDB calls. A reusable `ConfirmDialog` handles resume/restart decisions. Old stats are auto-migrated from localStorage on first DB access.

**Tech Stack:** IndexedDB via `idb` library, React 19, TanStack Router, Vitest + `fake-indexeddb`, Tailwind CSS v4.

---

### Task 1: Install dependencies

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install `idb` (runtime) and `fake-indexeddb` (dev)**

```bash
npm install idb && npm install -D fake-indexeddb@5
```

- [ ] **Step 2: Run tests to confirm nothing is broken yet**

```bash
npm test
```

Expected: all existing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add idb and fake-indexeddb dependencies"
```

---

### Task 2: Create `src/lib/storage.ts` — IndexedDB storage module

**Files:**

- Create: `src/lib/storage.ts`

- [ ] **Step 1: Write the storage module**

```typescript
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export interface QuestionStats {
  questionNumber: number
  correct: number
  wrong: number
}

export interface TrainingSession {
  sectionId: string
  currentIndex: number
  mode: 'normal' | 'weak'
  questionOrder: number[]
  completed: boolean
}

interface TrainerDB extends DBSchema {
  stats: {
    key: [string, number]
    value: {
      sectionId: string
      questionNumber: number
      correct: number
      wrong: number
    }
    indexes: { 'by-section': string }
  }
  sessions: {
    key: string
    value: TrainingSession
  }
}

let dbPromise: Promise<IDBPDatabase<TrainerDB>> | null = null
let migrated = false

function getDB(): Promise<IDBPDatabase<TrainerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TrainerDB>('angleschein-trainer', 1, {
      upgrade(db) {
        const statsStore = db.createObjectStore('stats', {
          keyPath: ['sectionId', 'questionNumber'],
        })
        statsStore.createIndex('by-section', 'sectionId')
        db.createObjectStore('sessions', { keyPath: 'sectionId' })
      },
    })
  }
  return dbPromise
}

async function ensureMigrated(): Promise<void> {
  if (migrated) return
  migrated = true
  await migrateFromLocalStorage()
}

async function migrateFromLocalStorage(): Promise<void> {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('trainer-stats-')) {
      keys.push(key)
    }
  }
  if (keys.length === 0) return

  const db = await getDB()
  const tx = db.transaction('stats', 'readwrite')

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) continue
      const sectionId = key.replace('trainer-stats-', '')

      for (const entry of parsed) {
        if (
          typeof entry.questionNumber === 'number' &&
          typeof entry.correct === 'number' &&
          typeof entry.wrong === 'number'
        ) {
          await tx.store.put({
            sectionId,
            questionNumber: entry.questionNumber,
            correct: entry.correct,
            wrong: entry.wrong,
          })
        }
      }
    } catch {
      // skip corrupt entries
    }
  }

  await tx.done

  for (const key of keys) {
    localStorage.removeItem(key)
  }
}

export async function getStats(sectionId: string): Promise<QuestionStats[]> {
  await ensureMigrated()
  const db = await getDB()
  const rows = await db.getAllFromIndex('stats', 'by-section', sectionId)
  return rows.map((r) => ({
    questionNumber: r.questionNumber,
    correct: r.correct,
    wrong: r.wrong,
  }))
}

export async function recordAnswer(
  sectionId: string,
  questionNumber: number,
  correct: boolean
): Promise<void> {
  await ensureMigrated()
  const db = await getDB()
  const tx = db.transaction('stats', 'readwrite')
  const existing = await tx.store.get([sectionId, questionNumber])

  if (existing) {
    if (correct) {
      existing.correct++
    } else {
      existing.wrong++
    }
    await tx.store.put(existing)
  } else {
    await tx.store.put({
      sectionId,
      questionNumber,
      correct: correct ? 1 : 0,
      wrong: correct ? 0 : 1,
    })
  }

  await tx.done
}

export async function clearStats(sectionId: string): Promise<void> {
  const db = await getDB()

  const tx = db.transaction('stats', 'readwrite')
  const cursor = await tx.store.index('by-section').openCursor(sectionId)
  while (cursor) {
    await cursor.delete()
    await cursor.continue()
  }
  await tx.done

  await deleteSession(sectionId)
}

export async function clearAllStats(): Promise<void> {
  const db = await getDB()

  const tx1 = db.transaction('stats', 'readwrite')
  await tx1.store.clear()
  await tx1.done

  const tx2 = db.transaction('sessions', 'readwrite')
  await tx2.store.clear()
  await tx2.done
}

export function isMemorized(stats: QuestionStats): boolean {
  return stats.correct > stats.wrong + 2
}

export async function getMemorizedCount(sectionId: string): Promise<number> {
  const stats = await getStats(sectionId)
  return stats.filter(isMemorized).length
}

export async function getTotalAttempts(
  sectionId: string
): Promise<{ correct: number; wrong: number }> {
  const stats = await getStats(sectionId)
  return {
    correct: stats.reduce((sum, s) => sum + s.correct, 0),
    wrong: stats.reduce((sum, s) => sum + s.wrong, 0),
  }
}

export async function getConfidenceRatio(sectionId: string): Promise<number> {
  const { correct, wrong } = await getTotalAttempts(sectionId)
  const total = correct + wrong
  return total === 0 ? 0 : Math.round((correct / total) * 100)
}

export async function getWeakQuestionNumbers(
  sectionId: string
): Promise<number[]> {
  const stats = await getStats(sectionId)
  return stats.filter((s) => s.wrong > s.correct).map((s) => s.questionNumber)
}

export async function getSession(
  sectionId: string
): Promise<TrainingSession | null> {
  await ensureMigrated()
  const db = await getDB()
  const session = await db.get('sessions', sectionId)
  return session ?? null
}

export async function createSession(
  sectionId: string,
  mode: 'normal' | 'weak',
  questionOrder: number[]
): Promise<void> {
  const db = await getDB()
  await db.put('sessions', {
    sectionId,
    currentIndex: 0,
    mode,
    questionOrder,
    completed: false,
  })
}

export async function advanceSession(sectionId: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('sessions', 'readwrite')
  const session = await tx.store.get(sectionId)
  if (!session) return

  const nextIndex = session.currentIndex + 1
  if (nextIndex >= session.questionOrder.length) {
    session.completed = true
  } else {
    session.currentIndex = nextIndex
  }

  await tx.store.put(session)
  await tx.done
}

export async function restartSession(sectionId: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('sessions', 'readwrite')
  const session = await tx.store.get(sectionId)
  if (!session) return

  session.currentIndex = 0
  session.completed = false

  await tx.store.put(session)
  await tx.done
}

export async function completeSession(sectionId: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('sessions', 'readwrite')
  const session = await tx.store.get(sectionId)
  if (!session) return

  session.completed = true

  await tx.store.put(session)
  await tx.done
}

export async function deleteSession(sectionId: string): Promise<void> {
  const db = await getDB()
  await db.delete('sessions', sectionId)
}

export async function resetSessionKeepStats(sectionId: string): Promise<void> {
  await restartSession(sectionId)
}

export async function fullReset(sectionId: string): Promise<void> {
  await clearStats(sectionId)
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit src/lib/storage.ts
```

Expected: no type errors.

---

### Task 3: Write storage tests

**Files:**

- Create: `src/lib/__tests__/storage.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
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
```

- [ ] **Step 2: Run the tests**

```bash
npx vitest run src/lib/__tests__/storage.test.ts
```

Expected: all 13 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/storage.ts src/lib/__tests__/storage.test.ts
git commit -m "feat: add IndexedDB storage module with session tracking"
```

---

### Task 4: Create `ConfirmDialog` component

**Files:**

- Create: `src/components/ConfirmDialog.tsx`

- [ ] **Step 1: Write the component**

```typescript
interface ConfirmAction {
  label: string
  variant: 'primary' | 'danger' | 'secondary'
  onClick: () => void
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  actions: ConfirmAction[]
}

export function ConfirmDialog({
  open,
  title,
  message,
  actions,
}: ConfirmDialogProps) {
  if (!open) return null

  const variantStyles: Record<ConfirmAction['variant'], string> = {
    primary:
      'rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700',
    danger:
      'rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700',
    secondary:
      'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mb-5 text-sm leading-relaxed text-gray-600">{message}</p>
        <div className="flex justify-end gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={variantStyles[action.variant]}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit src/components/ConfirmDialog.tsx
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ConfirmDialog.tsx
git commit -m "feat: add reusable ConfirmDialog modal component"
```

---

### Task 5: Update `SectionCard` to use async stats

**Files:**

- Modify: `src/components/SectionCard.tsx`

- [ ] **Step 1: Rewrite SectionCard with async stats loading**

```typescript
import type { SectionData } from '#/lib/questions'
import {
  getMemorizedCount,
  getStats,
  getWeakQuestionNumbers,
} from '#/lib/storage'
import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

interface SectionCardProps {
  sectionId: string
  section: SectionData
  to?: string
}

export function SectionCard({
  sectionId,
  section,
  to = '/train/$sectionId',
}: SectionCardProps) {
  const [attempted, setAttempted] = useState(0)
  const [memorized, setMemorized] = useState(0)
  const [weakCount, setWeakCount] = useState(0)

  useEffect(() => {
    let ignore = false
    async function load() {
      const [stats, mem, weak] = await Promise.all([
        getStats(sectionId),
        getMemorizedCount(sectionId),
        getWeakQuestionNumbers(sectionId),
      ])
      if (ignore) return
      setAttempted(stats.length)
      setMemorized(mem)
      setWeakCount(weak.length)
    }
    load()
    return () => {
      ignore = true
    }
  }, [sectionId])

  const total = section.questionCount
  const progressPercent =
    total > 0 ? Math.min(Math.round((attempted / total) * 100), 100) : 0

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between">
        <h2 className="font-semibold text-gray-900">{section.name}</h2>
        <span className="text-sm text-gray-500">
          {attempted}/{total}
        </span>
      </div>
      <div className="mb-1 h-2 w-full rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-green-600 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      {attempted > 0 && (
        <p className="mt-1 text-xs text-gray-500">{memorized} memorized</p>
      )}
      <div className="mt-3 flex justify-start gap-2">
        <Link
          to={to}
          params={{ sectionId }}
          className="rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Train
        </Link>
        {weakCount > 0 && (
          <Link
            to={to}
            params={{ sectionId }}
            search={{ mode: 'weak' }}
            className="rounded-lg bg-amber-600 px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-amber-700"
          >
            Train on Weak ({weakCount})
          </Link>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit src/components/SectionCard.tsx
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/SectionCard.tsx
git commit -m "refactor: update SectionCard to use async IndexedDB stats"
```

---

### Task 6: Update summary index page to async stats

**Files:**

- Modify: `src/routes/_layout/summary/index.tsx`

- [ ] **Step 1: Rewrite with async stats loading**

```typescript
import { loadQuestions, type QuestionsData } from '#/lib/questions'
import {
  getConfidenceRatio,
  getMemorizedCount,
  getTotalAttempts,
} from '#/lib/storage'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

interface SectionSummary {
  id: string
  memorized: number
  total: number
  confidence: number
  correct: number
  wrong: number
}

export const Route = createFileRoute('/_layout/summary/')({
  component: SummaryIndex,
})

function SummaryIndex() {
  const [data, setData] = useState<QuestionsData | null>(null)
  const [summaries, setSummaries] = useState<Record<string, SectionSummary>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const questionsData = await loadQuestions()
        if (ignore) return
        setData(questionsData)

        const entries = await Promise.all(
          Object.keys(questionsData.sections).map(async (id) => {
            const [memorized, confidence, attempts] = await Promise.all([
              getMemorizedCount(id),
              getConfidenceRatio(id),
              getTotalAttempts(id),
            ])
            return [
              id,
              {
                id,
                memorized,
                total: questionsData.sections[id].questionCount,
                confidence,
                correct: attempts.correct,
                wrong: attempts.wrong,
              },
            ] as const
          }),
        )
        if (ignore) return
        setSummaries(Object.fromEntries(entries))
      } catch (e) {
        if (!ignore)
          setError(e instanceof Error ? e.message : 'Failed to load')
      }
    }
    load()
    return () => {
      ignore = true
    }
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
      <h1 className="mb-4 text-xl font-bold text-gray-900">Statistics</h1>
      <div className="flex flex-col gap-3">
        {Object.entries(data.sections).map(([id, section]) => {
          const s = summaries[id]
          if (!s) return null

          return (
            <Link
              key={id}
              to="/summary/$sectionId"
              params={{ sectionId: id }}
              className="block rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <h2 className="mb-2 font-semibold text-gray-900">
                {section.name}
              </h2>
              <div className="mb-2 flex gap-4 text-sm text-gray-600">
                <span>
                  {s.memorized}/{s.total} memorized
                </span>
                <span>{s.confidence}% confidence</span>
              </div>
              <div className="mb-2 text-xs text-gray-500">
                {s.correct} correct, {s.wrong} wrong ({s.correct + s.wrong}{' '}
                total attempts)
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-green-600 transition-all"
                  style={{
                    width: `${s.total > 0 ? Math.min(Math.round((s.memorized / s.total) * 100), 100) : 0}%`,
                  }}
                />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify compiles**

```bash
npx tsc --noEmit src/routes/_layout/summary/index.tsx
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/_layout/summary/index.tsx
git commit -m "refactor: update summary index to use async IndexedDB stats"
```

---

### Task 7: Update summary detail page to async stats

**Files:**

- Modify: `src/routes/_layout/summary/$sectionId.tsx`

- [ ] **Step 1: Rewrite with async stats**

```typescript
import { getSection, loadQuestions, type Question } from '#/lib/questions'
import { getStats, isMemorized, type QuestionStats } from '#/lib/storage'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/_layout/summary/$sectionId')({
  component: SummaryDetail,
})

function SummaryDetail() {
  const { sectionId } = Route.useParams()
  const [questions, setQuestions] = useState<Question[]>([])
  const [statsMap, setStatsMap] = useState<Map<number, QuestionStats>>(
    new Map(),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const [data, stats] = await Promise.all([
          loadQuestions(),
          getStats(sectionId),
        ])
        if (ignore) return
        const section = getSection(data, sectionId)
        if (!section) {
          setError('Section not found')
          return
        }
        setQuestions(section.questions)
        setStatsMap(new Map(stats.map((s) => [s.questionNumber, s])))
      } catch (e) {
        if (!ignore)
          setError(e instanceof Error ? e.message : 'Failed to load')
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [sectionId])

  if (loading)
    return <div className="p-6 text-center text-gray-500">Loading...</div>
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>

  return (
    <div className="p-4">
      <Link to="/summary" className="mb-4 inline-block text-sm text-blue-600">
        &larr; Back
      </Link>
      <div className="flex flex-col gap-2">
        {questions.map((q) => {
          const stat = statsMap.get(q.number)
          const memorized = stat ? isMemorized(stat) : false

          return (
            <div
              key={q.number}
              className="rounded-lg border border-gray-200 bg-white p-3"
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-0.5 text-sm ${memorized ? 'text-green-500' : 'text-gray-300'}`}
                >
                  {memorized ? '\u25CF' : '\u25CB'}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {q.number}. {q.question}
                  </p>
                  {stat ? (
                    <p className="mt-1 text-xs text-gray-500">
                      {'\u2713'}
                      {stat.correct} {'\u2717'}
                      {stat.wrong}
                      {memorized && (
                        <span className="ml-2 text-green-600">Memorized</span>
                      )}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-400">Not attempted</p>
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

- [ ] **Step 2: Verify compiles**

```bash
npx tsc --noEmit src/routes/_layout/summary/$sectionId.tsx
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/_layout/summary/$sectionId.tsx
git commit -m "refactor: update summary detail to use async IndexedDB stats"
```

---

### Task 8: Update settings page to async

**Files:**

- Modify: `src/routes/_layout/settings/index.tsx`

- [ ] **Step 1: Rewrite with async clearAllStats**

```typescript
import { clearAllStats } from '#/lib/storage'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_layout/settings/')({
  component: SettingsPage,
})

function SettingsPage() {
  const [cleared, setCleared] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      await clearAllStats()
      setCleared(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold text-gray-900">Settings</h1>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-1 font-semibold text-gray-900">Statistics</h2>
        <p className="mb-4 text-sm text-gray-500">
          Delete all memorization tracking data. This cannot be undone.
        </p>
        {cleared ? (
          <p className="text-sm font-medium text-green-600">
            All statistics cleared.
          </p>
        ) : (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete All Statistics'}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify compiles**

```bash
npx tsc --noEmit src/routes/_layout/settings/index.tsx
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/_layout/settings/index.tsx
git commit -m "refactor: update settings page to use async IndexedDB clearAllStats"
```

---

### Task 9: Update train page with sessions and dialogs

**Files:**

- Modify: `src/routes/_layout/train/$sectionId.tsx`

- [ ] **Step 1: Rewrite the train page**

```typescript
import { ConfirmDialog } from '#/components/ConfirmDialog'
import { ProgressBar } from '#/components/ProgressBar'
import { QuestionCard } from '#/components/QuestionCard'
import { getSection, loadQuestions, type Question } from '#/lib/questions'
import {
  advanceSession,
  createSession,
  deleteSession,
  fullReset,
  getMemorizedCount,
  getSession,
  getStats,
  getWeakQuestionNumbers,
  isMemorized,
  recordAnswer,
  resetSessionKeepStats,
} from '#/lib/storage'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'

type DialogState =
  | { type: 'none' }
  | { type: 'resume'; currentIndex: number; total: number }
  | { type: 'complete'; weakCount: number }
  | {
      type: 'restart'
    }

export const Route = createFileRoute('/_layout/train/$sectionId')({
  component: QuestionSession,
  validateSearch: (search: Record<string, unknown>) => ({
    mode: (search.mode as string) || undefined,
  }),
})

function QuestionSession() {
  const { sectionId } = Route.useParams()
  const { mode } = Route.useSearch()
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [sectionComplete, setSectionComplete] = useState(false)
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' })
  const [memorizedCount, setMemorizedCount] = useState(0)
  const [attemptedCount, setAttemptedCount] = useState(0)

  useEffect(() => {
    let ignore = false
    async function init() {
      try {
        const data = await loadQuestions()
        if (ignore) return
        const section = getSection(data, sectionId)
        if (!section) {
          setError(`Section "${sectionId}" not found`)
          return
        }

        const allQuestions = section.questions
        const weakNums = await getWeakQuestionNumbers(sectionId)
        const isWeakMode = mode === 'weak'

        let targetQuestions: Question[]
        if (isWeakMode) {
          targetQuestions = allQuestions.filter((q) =>
            weakNums.includes(q.number),
          )
        } else {
          targetQuestions = allQuestions
        }

        setQuestions(targetQuestions)

        if (targetQuestions.length === 0) {
          setSectionComplete(true)
          setLoading(false)
          return
        }

        const session = await getSession(sectionId)

        if (session) {
          if (session.completed) {
            setDialog({ type: 'complete', weakCount: weakNums.length })
            setLoading(false)
            return
          }
          setDialog({
            type: 'resume',
            currentIndex: session.currentIndex + 1,
            total: targetQuestions.length,
          })
          setLoading(false)
          return
        }

        await createSession(
          sectionId,
          isWeakMode ? 'weak' : 'normal',
          targetQuestions.map((q) => q.number),
        )
        setCurrentIndex(0)
        setLoading(false)
      } catch (e) {
        if (!ignore)
          setError(e instanceof Error ? e.message : 'Failed to load')
        setLoading(false)
      }
    }
    init()
    return () => {
      ignore = true
    }
  }, [sectionId, mode])

  const handleResume = async () => {
    setDialog({ type: 'none' })
    try {
      const session = await getSession(sectionId)
      if (session) {
        setCurrentIndex(session.currentIndex)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resume session')
    }
  }

  const handleNewRound = async () => {
    setDialog({ type: 'none' })
    setLoading(true)
    try {
      const isWeakMode = mode === 'weak'
      const weakNums = await getWeakQuestionNumbers(sectionId)
      const data = await loadQuestions()
      const section = getSection(data, sectionId)
      if (!section) return

      let targetQuestions: Question[]
      if (isWeakMode) {
        targetQuestions = section.questions.filter((q) =>
          weakNums.includes(q.number),
        )
      } else {
        targetQuestions = section.questions
      }

      if (targetQuestions.length === 0) {
        setSectionComplete(true)
        return
      }

      setQuestions(targetQuestions)
      await createSession(
        sectionId,
        isWeakMode ? 'weak' : 'normal',
        targetQuestions.map((q) => q.number),
      )
      setCurrentIndex(0)
      setSectionComplete(false)
      setAnswered(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start new round')
    } finally {
      setLoading(false)
    }
  }

  const handleTrainOnWeak = async () => {
    setDialog({ type: 'none' })
    setLoading(true)
    try {
      const weakNums = await getWeakQuestionNumbers(sectionId)
      const data = await loadQuestions()
      const section = getSection(data, sectionId)
      if (!section) return

      const targetQuestions = section.questions.filter((q) =>
        weakNums.includes(q.number),
      )
      if (targetQuestions.length === 0) {
        setSectionComplete(true)
        setLoading(false)
        return
      }

      setQuestions(targetQuestions)
      await createSession(
        sectionId,
        'weak',
        targetQuestions.map((q) => q.number),
      )
      setCurrentIndex(0)
      setSectionComplete(false)
      setAnswered(false)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelDialog = () => {
    setDialog({ type: 'none' })
    navigate({ to: '/' })
  }

  const handleAnswer = useCallback(
    async (correct: boolean) => {
      const question = questions[currentIndex]
      if (!question) return
      await recordAnswer(sectionId, question.number, correct)
      setAnswered(true)
    },
    [questions, currentIndex, sectionId],
  )

  const handleNext = async () => {
    const nextIndex = currentIndex + 1
    if (nextIndex >= questions.length) {
      await advanceSession(sectionId)
      const stats = await getStats(sectionId)
      setMemorizedCount(stats.filter(isMemorized).length)
      setAttemptedCount(stats.length)
      setSectionComplete(true)
    } else {
      setCurrentIndex(nextIndex)
      setAnswered(false)
      await advanceSession(sectionId)
    }
  }

  const handleRestartClick = () => {
    setDialog({ type: 'restart' })
  }

  const handleResetRound = async () => {
    setDialog({ type: 'none' })
    await resetSessionKeepStats(sectionId)
    setCurrentIndex(0)
    setAnswered(false)
    setSectionComplete(false)
  }

  const handleFullReset = async () => {
    setDialog({ type: 'none' })
    await fullReset(sectionId)
    const isWeakMode = mode === 'weak'
    const data = await loadQuestions()
    const section = getSection(data, sectionId)
    if (!section) return

    let targetQuestions: Question[]
    if (isWeakMode) {
      const weakNums = await getWeakQuestionNumbers(sectionId)
      targetQuestions = section.questions.filter((q) =>
        weakNums.includes(q.number),
      )
    } else {
      targetQuestions = section.questions
    }

    setQuestions(targetQuestions)
    if (targetQuestions.length === 0) {
      setSectionComplete(true)
      return
    }

    await createSession(
      sectionId,
      isWeakMode ? 'weak' : 'normal',
      targetQuestions.map((q) => q.number),
    )
    setCurrentIndex(0)
    setAnswered(false)
    setSectionComplete(false)
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">{error}</p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm text-blue-600 underline"
        >
          Back to sections
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Loading questions...</p>
      </div>
    )
  }

  if (sectionComplete) {
    return (
      <div className="p-6 text-center">
        <h2 className="mb-2 text-xl font-bold text-gray-900">
          Section Complete!
        </h2>
        <p className="mb-4 text-gray-600">
          {memorizedCount} / {attemptedCount} memorized
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleNewRound}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Start New Round
          </button>
          <Link to="/" className="text-sm text-blue-600 underline">
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
        <Link
          to="/"
          className="mt-4 inline-block text-sm text-blue-600 underline"
        >
          Back to sections
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4">
      <ProgressBar current={currentIndex + 1} total={questions.length} />
      <QuestionCard
        key={question.number}
        question={question}
        onAnswer={handleAnswer}
      />
      {answered && (
        <button
          onClick={handleNext}
          className="mt-4 w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700"
        >
          Next
        </button>
      )}
      <div className="mt-6 text-center">
        <button
          onClick={handleRestartClick}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          Restart Section
        </button>
      </div>

      <ConfirmDialog
        open={dialog.type === 'resume'}
        title="Training in Progress"
        message={`You have a training round in progress. Resume from question ${(dialog as { type: 'resume'; currentIndex: number; total: number }).currentIndex} of ${(dialog as { type: 'resume'; currentIndex: number; total: number }).total}?`}
        actions={[
          { label: 'Start New Round', variant: 'secondary', onClick: handleNewRound },
          { label: 'Resume', variant: 'primary', onClick: handleResume },
        ]}
      />

      <ConfirmDialog
        open={dialog.type === 'complete'}
        title="Section Completed"
        message="You've completed this section. What would you like to do?"
        actions={[
          { label: 'Cancel', variant: 'secondary', onClick: handleCancelDialog },
          ...(dialog.type === 'complete' && (dialog as { type: 'complete'; weakCount: number }).weakCount > 0
            ? [
                {
                  label: `Train on Weak (${(dialog as { type: 'complete'; weakCount: number }).weakCount})`,
                  variant: 'secondary' as const,
                  onClick: handleTrainOnWeak,
                },
              ]
            : []),
          { label: 'Start New Round', variant: 'primary', onClick: handleNewRound },
        ]}
      />

      <ConfirmDialog
        open={dialog.type === 'restart'}
        title="Restart Section"
        message="Do you want to reset the current round (keeping all stats) or do a full reset (clearing all stats for this section)?"
        actions={[
          {
            label: 'Full Reset',
            variant: 'danger',
            onClick: handleFullReset,
          },
          {
            label: 'Reset Round',
            variant: 'primary',
            onClick: handleResetRound,
          },
        ]}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit src/routes/_layout/train/$sectionId.tsx
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/_layout/train/$sectionId.tsx
git commit -m "feat: add session tracking and dialogs to train page"
```

---

### Task 10: Clean up old files and final verification

**Files:**

- Delete: `src/lib/stats.ts`
- Delete: `src/lib/__tests__/stats.test.ts`

- [ ] **Step 1: Delete old files**

```bash
rm src/lib/stats.ts src/lib/__tests__/stats.test.ts
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all tests pass (storage tests + exam tests + questions tests).

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/stats.ts src/lib/__tests__/stats.test.ts
git commit -m "refactor: remove old localStorage stats module"
```

---

### Task 11: Manual verification checklist

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify migration** — if old stats exist in localStorage, they should appear in the app after loading

- [ ] **Step 3: Train a section** — verify questions advance, answers are recorded

- [ ] **Step 4: Navigate away mid-training and return** — verify resume dialog appears

- [ ] **Step 5: Complete all questions and click Train again** — verify complete dialog appears

- [ ] **Step 6: Click "Start New Round"** — verify training starts from question 1 with stats preserved

- [ ] **Step 7: Click "Restart Section" during training** — verify restart dialog appears with both options

- [ ] **Step 8: Check summary page** — verify stats display correctly

- [ ] **Step 9: Check settings page** — verify "Delete All Statistics" clears everything

- [ ] **Step 10: Refresh page mid-training** — verify state persists and resume dialog appears
