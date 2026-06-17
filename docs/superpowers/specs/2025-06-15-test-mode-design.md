# Test Mode (Mock Exam) - Design Spec

**Date**: 2025-06-15

## Overview

Add a mock exam mode to the Test tab that simulates the real fishing license exam: 60 random questions (12 per section), 120-minute timer, no feedback during test, pass/fail with per-section scoring.

## Route

`/test` — single page, no sub-routes. Replaces the existing "Coming soon" placeholder.

## Exam Rules

- 60 questions total: 12 randomly selected from each of 5 sections
- 120-minute countdown timer
- No feedback during test (no green/red, no translations, no explanation)
- Answer selection auto-advances to next question
- Timer expiry auto-ends the test (unanswered = wrong)
- Passing: ≥45 correct AND ≤6 wrong in any single section

## Component Tree

```
TestPage (/test)
├── StartScreen (rules + "Start Test" button)
├── ExamSession (during test)
│   ├── Timer (countdown, red when < 5 min)
│   ├── ProgressBar (Question X / 60)
│   └── QuestionCard (exam mode: no feedback)
└── TestResults (after completion)
    ├── PASS/FAIL verdict
    ├── Overall score (X/60)
    └── Per-section breakdown (section name, correct/12)
```

## QuestionCard Exam Mode

Add an `examMode` prop to `QuestionCard`:

- When `true`: no color feedback on selection, no English/explanation section, auto-advance after answer via callback
- When `false` (default): existing behavior unchanged

## Timer Component

- Props: `totalSeconds`, `onExpire`
- Displays `MM:SS` format
- Turns red text when < 300 seconds remaining
- Calls `onExpire` when reaching 0

## Test Session State

Managed in `TestPage` component:

- Phase: `"start"` | `"exam"` | `"results"`
- Session question pool (60 shuffled questions)
- Current question index
- Per-question results: `{ questionNumber, sectionId, selectedAnswer, correct }[]`
- Timer running state

## Question Selection

```ts
function generateTest(data: QuestionsData): QuestionWithSection[] {
  const pool: QuestionWithSection[] = []
  for (const [sectionId, section] of Object.entries(data.sections)) {
    const picked = shuffleArray([...section.questions]).slice(0, 12)
    for (const q of picked) {
      pool.push({ ...q, sectionId })
    }
  }
  return shuffleArray(pool)
}
```

## Test Results Screen

- PASS in green / FAIL in red, large text
- Overall: "45/60 correct (75%)"
- Per-section breakdown: "I: Fischkunde - 10/12" with green (passing) or red (failing) per section
- "New Test" button to restart

## Files

| File                                | Action | Purpose                           |
| ----------------------------------- | ------ | --------------------------------- |
| `src/routes/_layout/test/index.tsx` | Modify | Full test page implementation     |
| `src/components/QuestionCard.tsx`   | Modify | Add `examMode` prop               |
| `src/components/Timer.tsx`          | Create | Countdown timer display           |
| `src/components/TestResults.tsx`    | Create | Results screen with breakdown     |
| `src/lib/exam.ts`                   | Create | Question pool generation, scoring |

## Non-Goals

- Test history / persistence
- Review mode (revisiting answers after completion)
- Pause timer
- Skipping questions during exam
