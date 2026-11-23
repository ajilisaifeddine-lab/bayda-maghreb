import { Token } from './types';
export declare const CONCEPT_ALIASES: Readonly<Record<string, string>>;
export declare function canonicalizeConcept(concept: string): string;
/**
 * Normalizes a token stream against a dialect keyword map.
 * Matches two-word phrases on the same line (e.g. `idha ken`, `wela idha`, `لا كان`)
 * before single-word lookup, and never matches phrases across newlines.
 */
export declare function normalizeTokens(tokens: Token[], keywords: Record<string, string>): Token[];
