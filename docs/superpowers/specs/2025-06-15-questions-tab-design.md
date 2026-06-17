# Questions (Study) Tab - Design Spec

**Date**: 2025-06-15

## Overview

Replace the Settings tab with a Questions tab for browsing/studying. Shows questions with correct answer highlighted and full translations/explanation visible at all times. Free back-and-forth navigation.

## Routes

```
/questions/                → Section list
/questions/$sectionId       → Browse questions for section
```

## Tab Bar

- Rename "Settings" → "Questions"
- Icon: `BookOpen` (lucide-react)
- Link to: `/questions`

## Section Browse Page

- Loads section questions, shows in order
- QuestionCard with `showAnswer` mode:
  - Correct answer highlighted green immediately (no user selection needed)
  - Translations + explanation always visible
  - No answer buttons disabled state, no onAnswer callback needed
- Previous and Next buttons always visible (Previous disabled on first question)
- ProgressBar: "Question X / Y"
- Section complete: shows "End of section" with link back

## QuestionCard Changes

Add `showAnswer` prop. When true:

- Answer buttons rendered as static read-only (no click handler)
- Correct answer highlighted green
- Translations + explanation visible immediately
- No `onAnswer` logic

## Files

| File                                          | Action                                              |
| --------------------------------------------- | --------------------------------------------------- |
| `src/routes/_layout/settings/index.tsx`       | Remove (or rename dir)                              |
| `src/routes/_layout/questions/index.tsx`      | Create — section list                               |
| `src/routes/_layout/questions/$sectionId.tsx` | Create — question browse                            |
| `src/components/QuestionCard.tsx`             | Modify — add showAnswer mode                        |
| `src/components/BottomTabBar.tsx`             | Modify — rename Settings → Questions, BookOpen icon |
