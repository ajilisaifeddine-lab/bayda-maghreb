# @ajilisaifeddine-lab/bayda-lessons

Self-contained, framework-agnostic (zero React / DOM dependencies) lessons engine and dialect mechanics package for **Bayda Maghreb**.

## Features Included

- **30-Lesson Curriculum (`LESSONS_CURRICULUM`)**: Kids, Beginners, and Pro tracks with AST rule checkers, slot templates, and deterministic card shuffling (`getShuffledLessonCards`, `deterministicShuffleIndices`).
- **Execution & Verification Engine (`BaydaEngine`, `verifyLessonSolution`)**: Compiles & executes dialect code safely in a bounded sandbox, supports `awaiting_input` interactive prompt pause/resume, consent gating, and execution AST tracing.
- **10-Language Localization (`LESSON_UI_COPY`, `resolveLessonCopy`, `formatLessonVerdictMessage`)**: Embedded copy for `ar`, `en`, `fr`, `es`, `pt-BR`, `it`, `de`, `nl`, `arn`, `ht`.
- **Headless Session Controller (`createLessonSession`)**: Drop-in state controller for any UI framework (React, Vue, Svelte, vanilla JS, React Native, or CLI) with JSON progress export/import.
- **Review Quizzes, Achievements & Kid Companion**: `generateLessonReviewQuizzes`, `evaluateAchievements`, `buildKidLessonCompanionGuide`, `formatDialectCardForKids`, and pure browser-safe pronunciation helpers (`buildLessonPronunciationClips`, `parseKidVoiceCommand`).
- **Dialect Registry & Integrity (`STARTER_DIALECT_PACKS`, `FULL_DIALECT_PACKS`, `verifyPackIntegrity`)**: Built-in Maghrebi & Amazigh packs plus SHA-256 pack verification.

## Quick Usage

```ts
import {
  createLessonsToolkit,
  createLessonSession,
  getFullDialectById,
} from '@ajilisaifeddine-lab/bayda-lessons';

const toolkit = createLessonsToolkit({ dialectId: 'ma-arab', uiLang: 'ar' });
const session = createLessonSession({
  pack: getFullDialectById('tn-latn'),
  uiLang: 'fr',
  mode: 'kid',
});

const hydrated = session.getHydratedLessons();
console.log(hydrated.length, hydrated[0].copy.title);
```

## Installing from GitHub Packages

Add `.npmrc` to the consuming project (or configure npm globally):

```ini
@ajilisaifeddine-lab:registry=https://npm.pkg.github.com
```

Then install:

```bash
npm install @ajilisaifeddine-lab/bayda-lessons
```
