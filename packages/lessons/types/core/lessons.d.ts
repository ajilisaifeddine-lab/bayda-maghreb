import { executeAst } from './sandbox';
import { translateDialect } from './translate';
import { AstNode, DialectPack, DialectPackInput, ExecutionStepTrace, ExecutionWarningCode, LearningMode, LessonRule, LessonTemplate, LessonVerdict, Target } from './types';
export declare const LESSONS_CURRICULUM: LessonTemplate[];
export declare function isRepoDialectPackage(input: DialectPackInput): input is Exclude<DialectPackInput, DialectPack>;
/**
 * Adapts either a frontend `DialectPack` or a disk-loaded `core/loader.ts`
 * `DialectPackage` (`{ id, manifest, keywords, vocabulary }`) from the main
 * `bayda-maghreb` repository into a normalized `DialectPack`.
 */
export declare function adaptDialectPack(input: DialectPackInput): DialectPack;
export declare function findConceptWord(keywords: Record<string, string>, concept: string): string | null;
export declare function missingConceptsForLesson(lesson: Pick<LessonTemplate, 'requires'>, keywords: Record<string, string>): string[];
export interface PartitionedLessonsResult {
    ready: LessonTemplate[];
    locked: Array<{
        lesson: LessonTemplate;
        id: string;
        status: LessonTemplate['status'];
        missing: string[];
    }>;
}
/**
 * Mirrors `lessonsFor()` / `lockedFor()` from `core/lessons.ts`:
 * evaluates each lesson strictly against the dialect's actual `keywords.json`.
 */
export declare function partitionLessonsForPack(lessons: LessonTemplate[], packOrKeywords: DialectPackInput | Record<string, string>, mode?: LearningMode): PartitionedLessonsResult;
export declare function fillSlots(template: string, keywords: Record<string, string>): {
    ok: true;
    text: string;
} | {
    ok: false;
    missing: string[];
    text: string;
};
export declare function checkAstRules(ast: AstNode, rules: LessonRule[]): LessonRule['op'] | null;
export interface VerifyLessonOptions {
    inputs?: string[];
    interactiveInput?: boolean;
    enforceConsent?: boolean;
    hasConsent?: boolean;
    target?: Target;
    includeTrace?: boolean;
}
export type LessonSolutionResult = {
    status: 'ok';
    outputs: string[];
    transpiledCode?: string;
    steps?: number;
    executionMs?: number;
    warnings?: ExecutionWarningCode[];
    trace?: ExecutionStepTrace[];
} | {
    status: 'wrong';
    failed: LessonRule['op'];
    outputs: string[];
    transpiledCode?: string;
    steps?: number;
    executionMs?: number;
    warnings?: ExecutionWarningCode[];
    trace?: ExecutionStepTrace[];
} | {
    status: 'error';
    message: string;
    hint?: string;
    line?: number;
} | {
    status: 'awaiting_input';
    prompt: string;
    collectedCount: number;
    outputs: string[];
    transpiledCode?: string;
    steps?: number;
} | {
    status: 'consent_required';
    message: string;
};
export declare function defaultInputsForLesson(lesson: Pick<LessonTemplate, 'id'>): string[];
export declare function deterministicShuffleIndices(length: number, seedStr: string): number[];
export interface ShuffledLessonCard {
    index: number;
    text: string;
}
export declare function getShuffledLessonCards(lesson: LessonTemplate, packInput: DialectPackInput): {
    cards: string[];
    shuffled: ShuffledLessonCard[];
};
export declare function verifyLessonSolution(source: string, packInput: DialectPackInput, lesson: LessonTemplate, options?: VerifyLessonOptions): LessonSolutionResult;
export declare function verifyLessonSource(source: string, packInput: DialectPackInput, lesson: LessonTemplate, options?: {
    inputs?: string[];
}): LessonVerdict;
export declare const BaydaEngine: {
    compile: typeof translateDialect;
    execute: typeof executeAst;
    verifyLesson: typeof verifyLessonSource;
    verifySolution: typeof verifyLessonSolution;
    fillTemplate: typeof fillSlots;
    checkRules: typeof checkAstRules;
    missingConcepts: typeof missingConceptsForLesson;
    partitionLessons: typeof partitionLessonsForPack;
    adaptDialect: typeof adaptDialectPack;
    shuffleCards: typeof getShuffledLessonCards;
};
export interface DialectCurriculumProgress {
    dialectId: string;
    totalGuided: number;
    completedCount: number;
    readyInPackCount: number;
    percentage: number;
}
export declare function computeDialectCurriculumProgress(completedIds: string[], lessons: LessonTemplate[], packInput: DialectPackInput): DialectCurriculumProgress;
export interface LessonReviewQuizItem {
    id: string;
    lessonId: string;
    lessonTitleKey: string;
    lessonGoalKey: string;
    kind: 'predict-output' | 'fill-keyword' | 'code-challenge';
    codeSnippet: string;
    starterBrokenCode?: string;
    promptKey: 'quizPredictOutputPrompt' | 'quizFillKeywordPrompt' | 'quizCodeChallengePrompt';
    correctOption: string;
    options: string[];
    spokenPhrase: string;
    expectedOutput: string;
    lesson: LessonTemplate;
}
export declare function generateLessonReviewQuizzes(completedIds: string[], lessons: LessonTemplate[], packInput: DialectPackInput, options?: {
    inputs?: string[];
}): LessonReviewQuizItem[];
export interface ReviewQuizEvaluation {
    ok: boolean;
    outputs: string[];
    verdict?: LessonVerdict;
    error?: string;
}
export declare function verifyReviewQuizChallenge(quiz: LessonReviewQuizItem, submission: string, packInput: DialectPackInput): ReviewQuizEvaluation;
