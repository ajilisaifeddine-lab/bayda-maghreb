import { AchievementProgressItem } from '../core/achievements';
import { KidLessonCompanionGuide } from '../core/kidLessonCompanion';
import { KidLessonTierInfo } from '../core/kidModeStudio';
import { ResolvedKidBand } from '../core/kidProgression';
import { KidVisualBlockLabel } from '../core/kidVisualLogic';
import { DialectCurriculumProgress, LessonReviewQuizItem, LessonSolutionResult, ReviewQuizEvaluation, ShuffledLessonCard } from '../core/lessons';
import { AchievementId, DialectPack, DialectPackInput, KidAgeBand, LearnerProfile, LearningMode, LessonTemplate, Target, UiLang } from '../core/types';
import { LessonAudioClip } from './audio';
import { LessonUiStrings, ResolvedLessonCopy } from './i18n';
export interface LessonReviewSessionState {
    active: boolean;
    quizzes: LessonReviewQuizItem[];
    index: number;
    pick: string | null;
    codeInput: string;
    evaluation: ReviewQuizEvaluation | null;
    score: number;
    answeredCount: number;
    attemptedIds: string[];
    passedIds: string[];
}
export interface HydratedLesson {
    lesson: LessonTemplate;
    copy: ResolvedLessonCopy;
    starterCode: string;
    missingConcepts: string[];
    isLocked: boolean;
    isCompleted: boolean;
    isConsentBlocked: boolean;
    shuffledCards?: ShuffledLessonCard[];
    visualCards?: Array<KidVisualBlockLabel & {
        index: number;
        rawText: string;
    }>;
    kidTier?: KidLessonTierInfo;
    companionGuide?: KidLessonCompanionGuide;
    pronunciationClips: LessonAudioClip[];
    currentInput: string;
    selectedCardIndices: number[];
    revealedHints: number;
    verdict?: LessonSolutionResult;
    verdictMessage?: string;
    pendingPrompt?: string | null;
}
export interface LessonSessionState {
    mode: LearningMode;
    kidAgeBand: KidAgeBand;
    kidStars: number;
    resolvedKidBand: ResolvedKidBand | null;
    kidLessonFilter: 'age' | 'all';
    pack: DialectPack;
    uiLang: UiLang;
    hasConsent: boolean;
    enforceConsent: boolean;
    target: Target;
    includeTrace: boolean;
    completedByDialect: Record<string, string[]>;
    profile: LearnerProfile;
    achievementItems: AchievementProgressItem[];
    recentUnlockedBadges: AchievementId[];
    inputsByLesson: Record<string, string>;
    arrangeByLesson: Record<string, number[]>;
    hintCounts: Record<string, number>;
    verdicts: Record<string, LessonSolutionResult>;
    promptInputsByLesson: Record<string, string[]>;
    pendingPromptByLesson: Record<string, string | null>;
    reviewSession: LessonReviewSessionState;
}
export interface LessonSessionOptions {
    pack?: DialectPackInput;
    dialects?: DialectPackInput[];
    uiLang?: UiLang;
    mode?: LearningMode;
    kidAgeBand?: KidAgeBand;
    kidStars?: number;
    kidLessonFilter?: 'age' | 'all';
    hasConsent?: boolean;
    enforceConsent?: boolean;
    target?: Target;
    includeTrace?: boolean;
    completedByDialect?: Record<string, string[]>;
    profile?: LearnerProfile;
    lessons?: LessonTemplate[];
    copyOverrides?: Partial<LessonUiStrings>;
}
export interface SerializedLessonProgress {
    version: 1;
    completedByDialect: Record<string, string[]>;
    profile: LearnerProfile;
}
export interface LessonSessionController {
    getState: () => LessonSessionState;
    subscribe: (listener: (state: LessonSessionState) => void) => () => void;
    setMode: (mode: LearningMode) => void;
    setDialect: (pack: DialectPackInput) => void;
    setDialectById: (dialectId: string, useFullPack?: boolean) => void;
    setUiLang: (uiLang: UiLang) => void;
    setKidAgeBand: (band: KidAgeBand) => void;
    setKidStars: (stars: number) => void;
    setKidLessonFilter: (filter: 'age' | 'all') => void;
    setConsent: (granted: boolean) => void;
    setEnforceConsent: (enforce: boolean) => void;
    getVisibleLessons: () => LessonTemplate[];
    getHydratedLesson: (lessonId: string) => HydratedLesson | null;
    getHydratedLessons: () => HydratedLesson[];
    setLessonCode: (lessonId: string, code: string) => void;
    loadSampleIntoLesson: (lessonId: string) => void;
    toggleArrangeCard: (lessonId: string, cardIndex: number) => void;
    resetArrange: (lessonId: string) => void;
    revealHint: (lessonId: string) => void;
    submitInputPrompt: (lessonId: string, value: string) => LessonSolutionResult | null;
    resetPromptInputs: (lessonId: string) => void;
    verifyLesson: (lessonId: string) => LessonSolutionResult | null;
    startReview: () => void;
    setReviewCodeInput: (code: string) => void;
    answerReview: (submission: string) => ReviewQuizEvaluation | null;
    nextReview: () => void;
    closeReview: () => void;
    dismissBadge: (id: AchievementId) => void;
    getProgress: () => DialectCurriculumProgress;
    serializeProgress: () => string;
    hydrateProgress: (rawJson: string) => boolean;
}
export declare function createLessonSession(options?: LessonSessionOptions): LessonSessionController;
