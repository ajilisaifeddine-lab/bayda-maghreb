import { DialectPack } from '../core/types';
export declare const STARTER_DIALECT_PACKS: DialectPack[];
export declare const FULL_DIALECT_PACKS: DialectPack[];
export declare const DIALECT_PACKS: DialectPack[];
export declare function getDialectById(id: string, installedMap?: Record<string, DialectPack>): DialectPack;
export declare function getFullDialectById(id: string): DialectPack;
export declare function findKeywordForConcept(pack: DialectPack, concept: string): string;
