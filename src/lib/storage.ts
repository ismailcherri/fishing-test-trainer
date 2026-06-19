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
    value: { sectionId: string; questionNumber: number; correct: number; wrong: number }
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
  correct: boolean,
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
  let cursor = await tx.store.index('by-section').openCursor(sectionId)
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
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
  sectionId: string,
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
  sectionId: string,
): Promise<number[]> {
  const stats = await getStats(sectionId)
  return stats
    .filter((s) => s.wrong > s.correct)
    .map((s) => s.questionNumber)
}

export async function getSession(
  sectionId: string,
): Promise<TrainingSession | null> {
  await ensureMigrated()
  const db = await getDB()
  const session = await db.get('sessions', sectionId)
  return session ?? null
}

export async function createSession(
  sectionId: string,
  mode: 'normal' | 'weak',
  questionOrder: number[],
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
