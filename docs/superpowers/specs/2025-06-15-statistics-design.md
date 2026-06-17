# Statistics & Summary Tab - Design Spec

**Date**: 2025-06-15

## Overview

Track cumulative correct/wrong counts per question across training sessions. Show memorization progress on Train tab. Add a Summary tab with detailed per-question stats, section success rates, and confidence ratios.

## Stats Model

Replace current `progress.ts` storage. Each section key stores:

```ts
interface QuestionStats {
  questionNumber: number
  correct: number
  wrong: number
}

interface SectionStats {
  [questionNumber: number]: QuestionStats
}
```

localStorage key: `trainer-stats-${sectionId}`

**Memorized**: `correct > wrong + 2`

## Tab Bar

Add 4th tab: **Summary** with `BarChart3` icon, link `/summary`.

## Train Tab Changes

- `SectionCard`: show "X/Y memorized" instead of completed count
- Progress bar: memorization progress
- Remove the correct % line (stale with cumulative tracking)
- `$sectionId` page: continue to work as before — on answer, call `saveStats` instead of `saveProgress`

## Summary Tab

- `/summary/` — section list showing per-section stats:
  - Section name
  - Memorized count (e.g. "45/120 memorized")
  - Success rate: `(total correct) / (total attempts) × 100`
  - Confidence ratio: `(total correct) / (total correct + total wrong) × 100`
  - Progress bar for memorization

- `/summary/$sectionId` — expand per-question details:
  - Question number + question text
  - Correct/Wrong counts (e.g. "✓3 ✗1")
  - Memorized badge (green check) or "Needs practice" (gray)

## Files

| File | Action |
|------|--------|
| `src/lib/stats.ts` | Create — types + save/load stats, memorize logic |
| `src/lib/__tests__/stats.test.ts` | Create — tests |
| `src/lib/progress.ts` | Remove — replaced by stats |
| `src/lib/__tests__/progress.test.ts` | Remove — replaced |
| `src/components/SectionCard.tsx` | Modify — show memorized stats |
| `src/components/BottomTabBar.tsx` | Modify — add Summary tab |
| `src/routes/_layout/train/$sectionId.tsx` | Modify — use saveStats |
| `src/routes/_layout/summary/index.tsx` | Create — summary section list |
| `src/routes/_layout/summary/$sectionId.tsx` | Create — per-question details |
