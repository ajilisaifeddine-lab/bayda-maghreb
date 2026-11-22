import { executeAst } from './sandbox';
import { translateDialect } from './translate';
import { AstNode, DialectPack, ExecutionStepTrace, ExecutionWarningCode, LessonRule, LessonTemplate, LessonVerdict, Target } from './types';
export declare const LESSONS_CURRICULUM: LessonTemplate[];
export declare function findConceptWord(keywords: Record<string, string>, concept: string): string | null;
export declare function missingConceptsForLesson(lesson: LessonTemplate, keywords: Record<string, string>): string[];
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
export declare function getShuffledLessonCards(lesson: LessonTemplate, pack: DialectPack): {
    cards: string[];
    shuffled: ShuffledLessonCard[];
};
export declare function verifyLessonSolution(source: string, pack: DialectPack, lesson: LessonTemplate, options?: VerifyLessonOptions): LessonSolutionResult;
export declare function verifyLessonSource(source: string, pack: DialectPack, lesson: LessonTemplate, options?: {
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
    shuffleCards: typeof getShuffledLessonCards;
};
export interface DialectCurriculumProgress {
    dialectId: string;
    totalGuided: number;
    completedCount: number;
    readyInPackCount: number;
    percentage: number;
}
export declare function computeDialectCurriculumProgress(completedIds: string[], lessons: LessonTemplate[], pack: DialectPack): DialectCurriculumProgress;
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
export declare function generateLessonReviewQuizzes(completedIds: string[], lessons: LessonTemplate[], pack: DialectPack, options?: {
    inputs?: string[];
}): LessonReviewQuizItem[];
export interface ReviewQuizEvaluation {
    ok: boolean;
    outputs: string[];
    verdict?: LessonVerdict;
    error?: string;
}
export declare function verifyReviewQuizChallenge(quiz: LessonReviewQuizItem, submission: string, pack: DialectPack): ReviewQuizEvaluation;
