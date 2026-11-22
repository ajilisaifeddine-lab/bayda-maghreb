import { DialectPack, KidAgeBand, LessonTemplate } from './types';
export type ResolvedKidBand = '4-5' | '6-7' | '8-9';
export interface KidProgressionTier {
    band: ResolvedKidBand;
    levelNumber: 1 | 2 | 3;
    stars: number;
    nextBandThreshold: number | null;
    progressPercent: number;
    optionCount: 2 | 3 | 4;
    visualFirst: boolean;
}
export declare function resolveKidTier(stars: number, override?: KidAgeBand): KidProgressionTier;
export interface AdaptiveWordChallenge {
    id: string;
    dialectWord: string;
    correctConcept: string;
    visualCue: string;
    options: {
        concept: string;
        visualCue: string;
    }[];
}
export declare function visualForConcept(concept: string): string;
export declare function buildAdaptiveWordRound(pack: DialectPack, tier: KidProgressionTier): AdaptiveWordChallenge[];
export interface AdaptiveGateChallenge {
    id: string;
    isTrue: boolean;
    code: string;
    visualPrompt: string;
    ifLabel: string;
    elseLabel: string;
}
export declare function buildAdaptiveMagicGate(pack: DialectPack, tier: KidProgressionTier, seed: number): AdaptiveGateChallenge;
export interface SoundPictureRound {
    id: string;
    spokenWord: string;
    concept: string;
    targetEmoji: string;
    options: {
        emoji: string;
        concept: string;
    }[];
}
export declare function buildSoundPictureRounds(pack: DialectPack): SoundPictureRound[];
export interface PatternTrailRound {
    id: string;
    sequence: (string | null)[];
    missingIndex: number;
    correctEmoji: string;
    dialectHint: string;
    options: {
        emoji: string;
        label: string;
    }[];
}
export declare function buildPatternTrailRounds(pack: DialectPack): PatternTrailRound[];
export interface StoryBlockRound {
    id: string;
    titleHint: string;
    blocks: {
        id: string;
        code: string;
        emoji: string;
    }[];
    correctOrder: string[];
    expectedOutput: string;
}
export declare function buildStoryBlockRounds(pack: DialectPack): StoryBlockRound[];
export interface WordDetectiveRound {
    id: string;
    groupTopic: string;
    cards: {
        word: string;
        meaning: string;
        emoji: string;
        isOdd: boolean;
    }[];
}
export declare function buildWordDetectiveRounds(pack: DialectPack): WordDetectiveRound[];
export interface LoopTracerRound {
    id: string;
    code: string;
    correctOutput: string;
    options: string[];
}
export declare function buildLoopTracerRounds(pack: DialectPack): LoopTracerRound[];
export interface ConditionLabRound {
    id: string;
    goalText: string;
    templateBefore: string;
    templateAfter: string;
    options: {
        expr: string;
        isCorrect: boolean;
    }[];
}
export declare function buildConditionLabRounds(pack: DialectPack): ConditionLabRound[];
export interface BubblePopRound {
    id: string;
    targetEmoji: string;
    targetConcept: string;
    correctWord: string;
    bubbles: {
        word: string;
        emoji: string;
        colorClass: string;
        bobDelay: number;
    }[];
}
export declare function buildBubblePopRounds(pack: DialectPack): BubblePopRound[];
export interface MemoryMatchCard {
    cardId: string;
    pairId: string;
    display: string;
    spoken: string;
    isEmoji: boolean;
}
export interface MemoryMatchRound {
    id: string;
    cards: MemoryMatchCard[];
}
export declare function buildMemoryMatchRounds(pack: DialectPack): MemoryMatchRound[];
export interface BridgeBuilderRound {
    id: string;
    goalText: string;
    planks: {
        id: string;
        label: string;
        codePart: string;
        icon: string;
    }[];
    correctOrder: string[];
    expectedOutput: string;
}
export declare function buildBridgeBuilderRounds(pack: DialectPack): BridgeBuilderRound[];
export interface EchoSynthRound {
    id: string;
    targetSequence: {
        word: string;
        emoji: string;
        toneColor: string;
    }[];
    keypadWords: {
        word: string;
        emoji: string;
        toneColor: string;
    }[];
}
export declare function buildEchoSynthRounds(pack: DialectPack): EchoSynthRound[];
export interface VaultCrackerRound {
    id: string;
    code: string;
    targetVar: string;
    correctValue: number;
    initialDial: number;
    minDial: number;
    maxDial: number;
}
export declare function buildVaultCrackerRounds(pack: DialectPack): VaultCrackerRound[];
export interface CodeFixerRound {
    id: string;
    goalText: string;
    prefixCode: string;
    brokenLine: string;
    suffixCode: string;
    options: {
        line: string;
        isCorrect: boolean;
    }[];
}
export declare function buildCodeFixerRounds(pack: DialectPack): CodeFixerRound[];
export interface AgeBandVisualPalette {
    shellBg: string;
    shellBorder: string;
    badgeClass: string;
    activeCardClass: string;
    arenaGlow: string;
}
export declare function getAgeBandPalette(band: ResolvedKidBand): AgeBandVisualPalette;
export interface EmojiGardenRound {
    id: string;
    targetEmoji: string;
    targetLabel: string;
    printKeyword: string;
    choices: {
        emoji: string;
        label: string;
        code: string;
        expectedOutput: string;
    }[];
}
export declare function buildEmojiGardenRounds(pack: DialectPack): EmojiGardenRound[];
export interface SayMirrorRound {
    id: string;
    spokenTarget: string;
    meaningLabel: string;
    printKeyword: string;
    keywordPart: string;
    argParts: {
        label: string;
        codeFragment: string;
        isCorrect: boolean;
    }[];
    expectedOutput: string;
}
export declare function buildSayMirrorRounds(pack: DialectPack): SayMirrorRound[];
export interface SentenceChefRound {
    id: string;
    goalText: string;
    cards: {
        id: string;
        label: string;
        emoji: string;
        codePart: string;
    }[];
    correctOrder: string[];
    expectedOutputs: string[];
    lessonRule: LessonTemplate;
}
export declare function buildSentenceChefRounds(pack: DialectPack): SentenceChefRound[];
export interface BranchHopperRound {
    id: string;
    ifKeyword: string;
    elseKeyword: string;
    printKeyword: string;
    trueKeyword: string;
    falseKeyword: string;
    trueOutput: string;
    falseOutput: string;
    targetGoalOutput: string;
    shouldBeTrue: boolean;
}
export declare function buildBranchHopperRounds(pack: DialectPack): BranchHopperRound[];
export interface TracePredictRound {
    id: string;
    code: string;
    correctOutput: string;
    options: string[];
    jsEquivalent: string;
}
export declare function buildTracePredictRounds(pack: DialectPack): TracePredictRound[];
export interface MiniStudioRound {
    id: string;
    goalText: string;
    starterCode: string;
    hintCode: string;
    chips: string[];
    lessonSpec: LessonTemplate;
}
export declare function buildMiniStudioRounds(pack: DialectPack): MiniStudioRound[];
