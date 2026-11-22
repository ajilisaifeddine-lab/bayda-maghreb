import { ResolvedKidBand } from './kidProgression';
import { DialectPack, LessonTemplate, UiLang } from './types';
export type KidBlockKind = 'say' | 'move' | 'jump' | 'turn' | 'gate' | 'repeat' | 'counter' | 'ask' | 'list' | 'recipe';
export type KidGateMode = 'switch' | 'score_gte' | 'score_lt';
export type KidRepeatInnerAction = 'say' | 'move' | 'jump';
export interface KidBlockStep {
    id: string;
    kind: KidBlockKind;
    payload: string;
    truth?: boolean;
    elsePayload?: string;
    gateMode?: KidGateMode;
    compareTarget?: number;
    count?: number;
    incrementCounter?: number;
    innerActions?: KidRepeatInnerAction[];
    startValue?: number;
    stepValue?: number;
    steps?: number;
    direction?: 'right' | 'left';
    items?: string[];
}
export interface KidTileOption {
    value: string;
    emoji: string;
}
export declare const KID_EMOJI_TILES: KidTileOption[];
export declare function getKidLocalePresets(pack: DialectPack, uiLang?: UiLang): {
    tiles: KidTileOption[];
    cheers: string;
    sun: string;
    rain: string;
    star: string;
    score: string;
    askPrompt: string;
    listItems: string[];
    recipeName: string;
};
export declare function buildKidTileOptions(pack: DialectPack, uiLang?: UiLang): KidTileOption[];
export declare function buildKidStarterBlocks(pack: DialectPack, band: ResolvedKidBand, uiLang?: UiLang): KidBlockStep[];
export declare function buildCodeFromKidBlocks(blocks: KidBlockStep[], pack: DialectPack): string;
export interface KidVisualTraceStep {
    id: string;
    blockId: string;
    kind: KidBlockKind;
    stepNumber: number;
    output: string;
    branch?: 'then' | 'else';
    iteration?: number;
    totalIterations?: number;
    counterValue?: number;
    moveDelta?: number;
    jump?: boolean;
    turn?: boolean;
}
export declare function buildKidVisualTrace(blocks: KidBlockStep[]): KidVisualTraceStep[];
export type KidErrorHintKind = 'missing_quote' | 'missing_paren' | 'missing_brace' | 'foreign_word' | 'general';
export interface KidFriendlyErrorGuide {
    kind: KidErrorHintKind;
    fixedCode: string | null;
    suggestedWord?: string;
    foreignWord?: string;
}
export declare function buildKidFriendlyDiagnosis(errorMsg: string, code: string, pack: DialectPack, allPacks: DialectPack[]): KidFriendlyErrorGuide;
export interface KidStoryMission {
    id: string;
    emoji: string;
    titleKey: 'kidMissionGreetingTitle' | 'kidMissionDoorTitle' | 'kidMissionTripleTitle' | 'kidMissionJumpTitle' | 'kidMissionRecipeTitle';
    rule: 'min_two_outputs' | 'uses_if_gate' | 'min_three_outputs' | 'uses_motion' | 'uses_fn_or_list';
    bands?: ResolvedKidBand[];
}
export declare const KID_STORY_MISSIONS: KidStoryMission[];
export declare function getStoryMissionsForBand(band: ResolvedKidBand): KidStoryMission[];
export declare function evaluateStoryMission(mission: KidStoryMission, code: string, pack: DialectPack, outputs: string[], execOk: boolean): boolean;
export interface KidStickerItem {
    id: string;
    emoji: string;
    cost: number;
    labelKey: 'kidStickerFennec' | 'kidStickerLion' | 'kidStickerPalm' | 'kidStickerCamel' | 'kidStickerRocket' | 'kidStickerCastle';
}
export declare const KID_STICKERS: KidStickerItem[];
export interface MathGateChallenge {
    a: number;
    b: number;
    answer: number;
}
export declare function createMathGateChallenge(seed?: number): MathGateChallenge;
export interface KidLessonTierInfo {
    band: ResolvedKidBand;
    emoji: string;
    labelKey: 'kidLessonEasy' | 'kidLessonMedium' | 'kidLessonChallenge';
}
export declare function resolveKidLessonTier(lesson: LessonTemplate): KidLessonTierInfo;
export declare function filterKidLessonsForBand(lessons: LessonTemplate[], band: ResolvedKidBand): LessonTemplate[];
