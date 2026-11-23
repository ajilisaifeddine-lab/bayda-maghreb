import { parseLearnerProfile } from '../core/achievements';
import { diagnoseCompileError } from '../core/diagnostics';
import { formatDialectCardForKids, parseCodeStepsForKids } from '../core/kidVisualLogic';
import { adaptDialectPack, checkAstRules, computeDialectCurriculumProgress, fillSlots, getShuffledLessonCards, missingConceptsForLesson, partitionLessonsForPack, verifyLessonSolution, verifyLessonSource, verifyReviewQuizChallenge } from '../core/lessons';
import { canonicalizeConcept } from '../core/normalizer';
import { computeSha256Hex, validateDialectPack, verifyPackIntegrity } from '../core/pack';
import { buildAndVerifyFullPack, loadValidatedInstalledPacks, resolveDialectPack } from '../core/packStore';
import { executeAst, traceExecutionAst } from '../core/sandbox';
import { translateDialect } from '../core/translate';
import { DialectPack, DialectPackInput, KidAgeBand, LearnerProfile, LearningMode, LessonTemplate, Target, UiLang } from '../core/types';
import { buildLessonAudioPhrase, buildLessonPronunciationClips } from './audio';
import { LessonUiStrings } from './i18n';
import { LessonSessionOptions } from './session';
export { BaydaEngine, LESSONS_CURRICULUM, adaptDialectPack, checkAstRules, computeDialectCurriculumProgress, defaultInputsForLesson, deterministicShuffleIndices, fillSlots, findConceptWord, generateLessonReviewQuizzes, getShuffledLessonCards, isRepoDialectPackage, missingConceptsForLesson, partitionLessonsForPack, verifyLessonSolution, verifyLessonSource, verifyReviewQuizChallenge, type DialectCurriculumProgress, type LessonReviewQuizItem, type LessonSolutionResult, type PartitionedLessonsResult, type ReviewQuizEvaluation, type ShuffledLessonCard, type VerifyLessonOptions, } from '../core/lessons';
export { CONCEPT_ALIASES, canonicalizeConcept, } from '../core/normalizer';
export { diagnoseCompileError, type DiagnosticHint, } from '../core/diagnostics';
export { MAX_ARRAY_LENGTH, MAX_CALL_DEPTH, MAX_LOOP_ITERATIONS, MAX_OUTPUT_LINES, MAX_RUNTIME_BYTES, MAX_STRING_LENGTH, MAX_TOTAL_STEPS, executeAst, traceExecutionAst, type ExecuteOptions, type RuntimeVal, } from '../core/sandbox';
export { translateDialect, type TranslateOptions } from '../core/translate';
export { FULL_DIALECT_PACKS, STARTER_DIALECT_PACKS, getDialectById, getFullDialectById, } from '../data/dialects';
export { MAX_PACK_JSON_BYTES, computeSha256Hex, validateDialectPack, verifyPackIntegrity, type PackValidationResult, } from '../core/pack';
export { buildAndVerifyFullPack, loadValidatedInstalledPacks, resolveDialectPack, type PackCatalogRecord, type PackState, } from '../core/packStore';
export { LESSON_UI_COPY, LESSON_UI_LANGUAGES, formatLessonVerdictMessage, getLessonUiStrings, isLessonUiLang, resolveAchievementCopy, resolveLessonCopy, type LessonUiLang, type LessonUiStrings, type LessonUiTranslationKey, type ResolvedAchievementCopy, type ResolvedLessonCopy, } from './i18n';
export { ACHIEVEMENT_DEFINITIONS, BRANCH_LESSON_IDS, PRO_SYNTAX_LESSON_IDS, createEmptyLearnerProfile, evaluateAchievements, parseLearnerProfile, type AchievementDefinition, type AchievementProgressItem, } from '../core/achievements';
export { buildKidLessonCompanionGuide, type KidCompanionBubble, type KidLessonCompanionGuide, type KidLessonSceneKind, } from '../core/kidLessonCompanion';
export { filterKidLessonsForBand, resolveKidLessonTier, type KidLessonTierInfo, } from '../core/kidModeStudio';
export { resolveKidTier, visualForConcept, type KidProgressionTier, type ResolvedKidBand, } from '../core/kidProgression';
export { formatDialectCardForKids, parseCodeStepsForKids, type KidLogicTone, type KidVisualBlockLabel, type KidVisualLabels, } from '../core/kidVisualLogic';
export { buildKidVoiceCommandHints, buildLessonAudioPhrase, buildLessonPronunciationClips, detectSpeechLang, extractSelectedCodeSpeech, formatSpeechReadableSnippet, getVoiceRecognitionLang, parseKidVoiceCommand, stripEmojisForSpeech, uiLangToSpeechTag, type KidVoiceCommandKind, type KidVoiceCommandMatch, type LessonAudioClip, type SelectedCodeSpeechSegment, type SelectedCodeSpeechTerm, type SpeechDetectOptions, type SpeechDialectContext, } from './audio';
export { createLessonSession, type HydratedLesson, type LessonReviewSessionState, type LessonSessionController, type LessonSessionOptions, type LessonSessionState, type SerializedLessonProgress, } from './session';
export { TARGET_META, VALID_TARGETS, isRtlTarget, isValidTarget, type AchievementId, type AstNode, type AwaitingInputPrompt, type BadgeUnlockRecord, type DialectPack, type DialectPackInput, type ExecutionResult, type ExecutionStepKind, type ExecutionStepTrace, type ExecutionWarningCode, type KidAgeBand, type LearnerProfile, type LearningMode, type LessonKind, type LessonNodeName, type LessonRule, type LessonTemplate, type LessonVerdict, type PackSource, type RepoDialectPackage, type ScriptKind, type Target, type TranspileResult, type UiLang, } from '../core/types';
export interface LessonsToolkitConfig {
    pack?: DialectPackInput;
    dialects?: DialectPackInput[];
    dialectId?: string;
    useFullPack?: boolean;
    uiLang?: UiLang;
    copyOverrides?: Partial<LessonUiStrings>;
    enforceConsent?: boolean;
    hasConsent?: boolean;
}
/**
 * High-level framework-agnostic facade allowing any external application UI
 * to integrate Bayda Maghreb lessons, dialect packs, verification, quizzes,
 * achievements, kid companion guides, and pronunciation data from one call.
 */
export declare function createLessonsToolkit(config?: LessonsToolkitConfig): {
    version: '1.0.0';
    curriculum: LessonTemplate[];
    dialects: DialectPack[];
    starterDialects: DialectPack[];
    fullDialects: DialectPack[];
    engine: {
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
    adaptDialect: typeof adaptDialectPack;
    canonicalizeConcept: typeof canonicalizeConcept;
    getStrings: (lang?: UiLang) => LessonUiStrings;
    getLessonsForMode: (mode: LearningMode, kidBand?: KidAgeBand, stars?: number) => LessonTemplate[];
    partitionLessons: (packOrKeywords?: DialectPackInput | Record<string, string>, mode?: LearningMode) => import(".").PartitionedLessonsResult;
    resolveLesson: (lesson: LessonTemplate, packInput?: DialectPackInput, lang?: UiLang) => {
        lesson: LessonTemplate;
        copy: import("./i18n").ResolvedLessonCopy;
        starterCode: string;
        missingConcepts: string[];
        shuffledCards: {
            cards: string[];
            shuffled: import(".").ShuffledLessonCard[];
        } | undefined;
        kidTier: import(".").KidLessonTierInfo | undefined;
        companionGuide: import(".").KidLessonCompanionGuide | undefined;
        pronunciationClips: import("./audio").LessonAudioClip[];
    };
    verifySolution: (source: string, lesson: LessonTemplate, packInput?: DialectPackInput, options?: {
        inputs?: string[];
        interactiveInput?: boolean;
        target?: Target;
        includeTrace?: boolean;
        hasConsent?: boolean;
        uiLang?: UiLang;
    }) => {
        status: 'ok';
        outputs: string[];
        transpiledCode?: string;
        steps?: number;
        executionMs?: number;
        warnings?: import(".").ExecutionWarningCode[];
        trace?: import(".").ExecutionStepTrace[];
        localizedMessage: string;
    } | {
        status: 'wrong';
        failed: import(".").LessonRule['op'];
        outputs: string[];
        transpiledCode?: string;
        steps?: number;
        executionMs?: number;
        warnings?: import(".").ExecutionWarningCode[];
        trace?: import(".").ExecutionStepTrace[];
        localizedMessage: string;
    } | {
        status: 'error';
        message: string;
        hint?: string;
        line?: number;
        localizedMessage: string;
    } | {
        status: 'awaiting_input';
        prompt: string;
        collectedCount: number;
        outputs: string[];
        transpiledCode?: string;
        steps?: number;
        localizedMessage: string;
    } | {
        status: 'consent_required';
        message: string;
        localizedMessage: string;
    };
    createSession: (sessionOpts?: LessonSessionOptions) => import("./session").LessonSessionController;
    evaluateAchievements: (completedByDialect: Record<string, string[]>, profile?: LearnerProfile, lang?: UiLang) => {
        items: import(".").AchievementProgressItem[];
        updatedProfile: LearnerProfile;
        newlyUnlocked: import(".").AchievementId[];
        localizedItems: {
            titleKey: 'achFirstSparkTitle' | 'achDialectExplorerTitle' | 'achBranchNavigatorTitle' | 'achSyntaxMasterTitle' | 'achReviewChampionTitle' | 'achMaghrebPolyglotTitle';
            descKey: 'achFirstSparkDesc' | 'achDialectExplorerDesc' | 'achBranchNavigatorDesc' | 'achSyntaxMasterDesc' | 'achReviewChampionDesc' | 'achMaghrebPolyglotDesc';
            current: number;
            unlocked: boolean;
            unlockedAt: string | null;
            id: import(".").AchievementDefinition['id'];
            title: string;
            description: string;
            target: number;
        }[];
    };
    generateReviewQuizzes: (completedIds: string[], packInput?: DialectPackInput, mode?: LearningMode) => import(".").LessonReviewQuizItem[];
    verifyReviewQuiz: typeof verifyReviewQuizChallenge;
    formatVisualCard: typeof formatDialectCardForKids;
    parseVisualSteps: typeof parseCodeStepsForKids;
    buildAudioPhrase: typeof buildLessonAudioPhrase;
    buildPronunciationClips: typeof buildLessonPronunciationClips;
    compile: typeof translateDialect;
    execute: typeof executeAst;
    trace: typeof traceExecutionAst;
    diagnoseError: typeof diagnoseCompileError;
    resolveDialectPack: typeof resolveDialectPack;
    buildAndVerifyFullPack: typeof buildAndVerifyFullPack;
    loadValidatedInstalledPacks: typeof loadValidatedInstalledPacks;
    validateDialectPack: typeof validateDialectPack;
    verifyPackIntegrity: typeof verifyPackIntegrity;
    computeSha256Hex: typeof computeSha256Hex;
    parseLearnerProfile: typeof parseLearnerProfile;
    achievementDefinitions: import(".").AchievementDefinition[];
    branchLessonIds: readonly ["kid-door", "kid-sun-rain", "bg-if", "bg-else", "bg-compare", "pr-two-ifs", "pr-nested-if", "pr-input-guard", "pr-errors"];
    proSyntaxLessonIds: readonly ["pr-two-ifs", "pr-nested-if", "pr-while-shape"];
    computeProgress: typeof computeDialectCurriculumProgress;
    lessonsUiCopy: Record<UiLang, LessonUiStrings>;
    lessonsUiLanguages: readonly [{
        readonly code: "ar";
        readonly label: "Arabic";
        readonly nativeLabel: "العربية";
        readonly flag: "🇸🇦";
        readonly rtl: true;
    }, {
        readonly code: "en";
        readonly label: "English";
        readonly nativeLabel: "English";
        readonly flag: "🇬🇧";
        readonly rtl: false;
    }, {
        readonly code: "fr";
        readonly label: "French";
        readonly nativeLabel: "Français";
        readonly flag: "🇫🇷";
        readonly rtl: false;
    }, {
        readonly code: "es";
        readonly label: "Spanish";
        readonly nativeLabel: "Español";
        readonly flag: "🇪🇸";
        readonly rtl: false;
    }, {
        readonly code: "pt-BR";
        readonly label: "Portuguese (Brazil)";
        readonly nativeLabel: "Português (Brasil)";
        readonly flag: "🇧🇷";
        readonly rtl: false;
    }, {
        readonly code: "it";
        readonly label: "Italian";
        readonly nativeLabel: "Italiano";
        readonly flag: "🇮🇹";
        readonly rtl: false;
    }, {
        readonly code: "de";
        readonly label: "German";
        readonly nativeLabel: "Deutsch";
        readonly flag: "🇩🇪";
        readonly rtl: false;
    }, {
        readonly code: "nl";
        readonly label: "Dutch";
        readonly nativeLabel: "Nederlands";
        readonly flag: "🇳🇱";
        readonly rtl: false;
    }, {
        readonly code: "arn";
        readonly label: "Mapudungun";
        readonly nativeLabel: "Mapudungun";
        readonly flag: "🇨🇱";
        readonly rtl: false;
    }, {
        readonly code: "ht";
        readonly label: "Haitian Creole";
        readonly nativeLabel: "Kreyòl Ayisyen";
        readonly flag: "🇭🇹";
        readonly rtl: false;
    }];
};
