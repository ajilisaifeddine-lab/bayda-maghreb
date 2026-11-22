import { AchievementId, LearnerProfile } from './types';
export interface AchievementDefinition {
    id: AchievementId;
    titleKey: 'achFirstSparkTitle' | 'achDialectExplorerTitle' | 'achBranchNavigatorTitle' | 'achSyntaxMasterTitle' | 'achReviewChampionTitle' | 'achMaghrebPolyglotTitle';
    descKey: 'achFirstSparkDesc' | 'achDialectExplorerDesc' | 'achBranchNavigatorDesc' | 'achSyntaxMasterDesc' | 'achReviewChampionDesc' | 'achMaghrebPolyglotDesc';
    target: number;
}
export interface AchievementProgressItem extends AchievementDefinition {
    current: number;
    unlocked: boolean;
    unlockedAt: string | null;
}
export declare const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[];
export declare const BRANCH_LESSON_IDS: readonly ['kid-door', 'kid-sun-rain', 'bg-if', 'bg-else', 'bg-compare', 'pr-two-ifs', 'pr-nested-if', 'pr-input-guard', 'pr-errors'];
export declare const PRO_SYNTAX_LESSON_IDS: readonly ['pr-two-ifs', 'pr-nested-if', 'pr-while-shape'];
export declare function createEmptyLearnerProfile(): LearnerProfile;
export declare function parseLearnerProfile(raw: string | null): LearnerProfile;
export declare function evaluateAchievements(completedByDialect: Record<string, string[]>, profile: LearnerProfile, nowIso?: string): {
    items: AchievementProgressItem[];
    updatedProfile: LearnerProfile;
    newlyUnlocked: AchievementId[];
};
