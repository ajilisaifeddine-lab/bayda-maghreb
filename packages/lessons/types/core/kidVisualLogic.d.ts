import { DialectPack } from './types';
export type KidLogicTone = 'action' | 'decision' | 'else' | 'loop' | 'variable' | 'end' | 'value';
export interface KidVisualBlockLabel {
    icon: string;
    text: string;
    tone: KidLogicTone;
}
export interface KidVisualLabels {
    sayWord: string;
    ifWord: string;
    elseWord: string;
    loopWord: string;
    varWord: string;
    trueWord: string;
    falseWord: string;
    endStepWord: string;
    askWord?: string;
    listWord?: string;
    recipeWord?: string;
    returnWord?: string;
}
export declare function formatDialectCardForKids(rawCard: string, pack: DialectPack, labels: KidVisualLabels): KidVisualBlockLabel;
export declare function parseCodeStepsForKids(rawCode: string, pack: DialectPack, labels: KidVisualLabels): KidVisualBlockLabel[];
