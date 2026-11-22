import { DialectPack, LessonTemplate } from '../core/types';
export interface LessonAudioClip {
    keyword: string;
    concept: string;
    phrase: string;
    speechLang: string;
    syllables: number;
}
export interface SpeechDetectOptions {
    uiLang?: string;
    packRtl?: boolean;
    preferDialect?: boolean;
}
export interface SpeechDialectContext {
    id: string;
    name: string;
    rtl: boolean;
}
export interface SelectedCodeSpeechTerm {
    term: string;
    meaning: string;
    kind: 'keyword' | 'vocabulary';
}
export interface SelectedCodeSpeechSegment {
    rawSnippet: string;
    spokenText: string;
    lang: string;
    dialectCtx: SpeechDialectContext;
    matchedTerms: SelectedCodeSpeechTerm[];
}
export type KidVoiceCommandKind = 'run' | 'clear' | 'add_say' | 'add_move' | 'add_jump' | 'add_repeat' | 'undo';
export interface KidVoiceCommandMatch {
    kind: KidVoiceCommandKind;
    matchedTerm: string;
    payload?: string;
}
export declare function buildLessonAudioPhrase(lesson: LessonTemplate, pack: DialectPack): {
    keyword: string;
    phrase: string;
    speechLang: string;
};
export declare function buildLessonPronunciationClips(lesson: LessonTemplate, pack: DialectPack): LessonAudioClip[];
export declare function stripEmojisForSpeech(text: string): string;
export declare function uiLangToSpeechTag(uiLang?: string): string;
export declare function detectSpeechLang(text: string, opts?: SpeechDetectOptions): string;
export declare function formatSpeechReadableSnippet(text: string): string;
export declare function extractSelectedCodeSpeech(selectedText: string, pack: Pick<DialectPack, 'id' | 'name' | 'rtl' | 'keywords' | 'vocabulary'>, uiLang?: string): SelectedCodeSpeechSegment | null;
export declare function getVoiceRecognitionLang(pack: DialectPack, uiLang?: string): string;
export declare function buildKidVoiceCommandHints(pack: DialectPack): {
    runWord: string;
    clearWord: string;
    sayWord: string;
};
export declare function parseKidVoiceCommand(transcript: string, pack: DialectPack): KidVoiceCommandMatch | null;
