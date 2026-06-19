# Storage & Session Refactor Design

## Problem

The current `stats.ts` stores cumulative correct/wrong per-question counts in localStorage. The training page (`$sectionId.tsx`) uses the absence of a stats entry to determine the starting question. Once all questions have been attempted, clicking "Train" always shows "Section Complete!" — there is no way to start a new training round without deleting all data. "Restart Section" only resets React component state (not localStorage), so it fails after page refresh.

## Solution

Replace localStorage with IndexedDB via the `idb` library. Add a session model to track training round state separately from cumulative stats.

---

## 1. Storage Schema

**Database:** `angleschein-trainer`, version 1

### Object Store: `stats` (cumulative per-question)

| Field | Type | Key |
|---|---|---|
| `sectionId` | `string` | compound `[sectionId, questionNumber]` |
| `questionNumber` | `number` | compound `[sectionId, questionNumber]` |
| `correct` | `number` | — |
| `wrong` | `number` | — |

Index: `by-section` on `sectionId`.

### Object Store: `sessions` (active training round)

| Field | Type | Notes |
|---|---|---|
| `sectionId` | `string` | Primary key |
| `currentIndex` | `number` | 0-based position |
| `mode` | `'normal' \| 'weak'` | Training mode |
| `questionOrder` | `number[]` | Ordered question numbers |
| `completed` | `boolean` | Whether this round reached the end |

---

## 2. API (`src/lib/storage.ts`)

Replaces `src/lib/stats.ts`. All functions return `Promise`.

### Stats CRUD
- `getStats(sectionId)` → `QuestionStats[]`
- `recordAnswer(sectionId, questionNumber, correct)` → void
- `clearStats(sectionId)` → void
- `clearAllStats()` → void (also deletes all sessions)

### Derived Stats
- `getMemorizedCount(sectionId)` → number
- `getTotalAttempts(sectionId)` → `{correct, wrong}`
- `getConfidenceRatio(sectionId)` → number
- `getWeakQuestionNumbers(sectionId)` → number[]
- `isMemorized(stats)` → boolean (stays sync, pure computation)

### Sessions
- `getSession(sectionId)` → `TrainingSession | null`
- `createSession(sectionId, mode, questionOrder)` → void
- `advanceSession(sectionId)` → void (index++, mark completed if at end)
- `restartSession(sectionId)` → void (index=0, completed=false)
- `deleteSession(sectionId)` → void

### Migration
- `migrateFromLocalStorage()` — reads old `trainer-stats-*` keys, writes to IndexedDB, removes old keys. Called once on app startup.

---

## 3. Component Changes

### Train Page (`_layout/train/$sectionId.tsx`)

**On mount** (async `useEffect`):

- No session exists → auto-create session, start from index 0
- Active session (not completed) → dialog: "Resume from question X of Y?" with `[Resume]` `[Start New Round]`
- Completed session → dialog: "Section completed. What next?" with `[Start New Round]` `[Train on Weak (N)]` `[Cancel]`

**"Restart Section" button** (during training): confirmation dialog with `[Reset current round (keep stats)]` `[Full reset (clear all stats)]`

**"Section Complete!" screen** (after finishing last question): shows memorized/stats, buttons `[Start New Round]` `[Back to Sections]`

### New Component: `ConfirmDialog`

Reusable modal: `title`, `message`, and action buttons. Used by all three dialog cases.

### Other Pages

- `SectionCard.tsx` — call async stats functions in `useEffect`
- `summary/index.tsx` — async stats loading
- `summary/$sectionId.tsx` — async stats loading
- `settings/index.tsx` — call `clearAllStats()` async

---

## 4. Error Handling & Edge Cases

- **IndexedDB blocked** (private browsing): fall back to in-memory Map, show banner "Progress won't be saved"
- **Migration failure**: catch, log, start fresh. Don't block app startup.
- **Corrupt data**: validate shape on read, filter corrupt entries (same as today)
- **Empty weak filter**: show "No weak questions" with `[Start New Round]` button
- **Clear all stats**: also clears all sessions

---

## 5. Testing

- **Unit tests** (`lib/__tests__/storage.test.ts`): Use `fake-indexeddb` with vitest/jsdom. Port all existing `stats.test.ts` tests, add session tests.
- **Component tests**: Test train page dialogs with `@testing-library/react`, mock the storage module.
- **Migration test**: Write old localStorage keys, call `migrateFromLocalStorage()`, verify IndexedDB.

---

## 6. Files Changed

| File | Change |
|---|---|
| `src/lib/storage.ts` (new) | IndexedDB module, replaces `stats.ts` |
| `src/lib/stats.ts` | Deleted |
| `src/components/ConfirmDialog.tsx` (new) | Reusable modal dialog |
| `src/routes/_layout/train/$sectionId.tsx` | Async loading, dialogs, revised flow |
| `src/components/SectionCard.tsx` | Async stats functions |
| `src/routes/_layout/summary/index.tsx` | Async stats functions |
| `src/routes/_layout/summary/$sectionId.tsx` | Async stats functions |
| `src/routes/_layout/settings/index.tsx` | Async `clearAllStats()` |
| `src/lib/__tests__/storage.test.ts` | Ported tests + session tests |
| `package.json` | Add `idb` dependency |
