import { DialectPack, LessonTemplate } from './types';
export type KidLessonSceneKind = 'talk' | 'twice' | 'door' | 'sun-rain' | 'ask' | 'basket' | 'generic';
export interface KidCompanionBubble {
    id: string;
    emoji: string;
    text: string;
    keywordBadge?: string;
    sceneFocus: 'intro' | 'action' | 'branch-a' | 'branch-b';
}
export interface KidLessonCompanionGuide {
    scene: KidLessonSceneKind;
    greetingBadge: string;
    bubbles: KidCompanionBubble[];
}
export declare function buildKidLessonCompanionGuide(lesson: LessonTemplate, pack: DialectPack): KidLessonCompanionGuide;
