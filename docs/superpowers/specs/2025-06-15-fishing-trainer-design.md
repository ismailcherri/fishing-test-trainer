# Fishing License Trainer - Design Spec

**Date**: 2025-06-15

## Overview

Mobile-like SPA/PWA for training on the Brandenburg fishing license exam question bank. Three tabs (Train, Test, Settings). This spec covers the **Train** tab only; Test and Settings are placeholders.

## Data Source

`public/questions.json` — 597 questions across 5 sections:
- I: Fischkunde und -hege (120 questions)
- II: Pflege der Fischgewässer (120 questions)
- III: Fanggeräte und deren Gebrauch (120 questions)
- IV: Behandlung der gefangenen Fische (120 questions)
- V: Einschlägige Rechtsvorschriften (117 questions)

Each question: German text, English text, 3 answers (A/B/C) in both languages, correct answer letter, and explanation.

## Routes

```
/ (__root.tsx)
└── _layout.tsx          → Bottom tab bar + <Outlet />
    ├── /train/           → Section list (index)
    │   └── /train/$sectionId  → Active question session
    ├── /test/            → Placeholder
    └── /settings/        → Placeholder
```

## Component Tree

```
App
└── _layout
    ├── BottomTabBar (Train / Test / Settings tabs)
    └── <Outlet>
        └── Train routes
            ├── SectionList (/train)
            │   └── SectionCard × 5 (name, count, progress)
            └── QuestionSession (/train/$sectionId)
                ├── ProgressBar (Question X / Y)
                ├── QuestionCard (question text + 3 shuffled answer buttons)
                └── AnswerFeedback (green/red highlights, translations, explanation)
```

## Data Flow

1. **Progress**: `localStorage` keyed by `sectionId` stores `{ questionNumber, correct: boolean }[]` for each attempted question
2. **Section entry**: Load all questions for the section, shuffle each question's answers, start at first unanswered question
3. **Answer flow**: User taps answer → buttons lock → correct answer highlighted green, wrong selection highlighted red → English translations + explanation appear → "Next" button enabled
4. **Next**: Advance to next question. If all questions answered, show completion summary with score and "Restart" button
5. **Shuffling**: Fisher-Yates shuffle applied to the answer order for each question on session start

## Edge Cases

- **All questions completed**: Show "Section complete" screen with score (correct/total) and "Restart" button that clears progress for that section
- **Empty localStorage**: All sections show 0/X progress
- **JSON load failure**: Error boundary with reload prompt
- **Browser back**: Breadcrumb navigation supported via router

## Settings Tab

Placeholder page displaying "Coming soon" text.

## Test Tab

Placeholder page displaying "Coming soon" text.

## Styling

- Mobile-first, max-width constrained to `max-w-md` (430px) centered on desktop
- Tailwind v4 with existing project setup
- lucide-react icons for tabs: GraduationCap (Train), ClipboardCheck (Test), Settings (Settings)

## Non-Goals

- Test mode (timed exams, randomized question selection)
- Settings (language toggle, reset progress)
- PWA manifest / service worker installation
- Server-side data fetching
