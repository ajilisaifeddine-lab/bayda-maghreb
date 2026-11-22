import { Token } from './types';
export declare const MAX_SOURCE_CHARS = 50000;
export declare const MAX_TOKENS = 12000;
export declare const MAX_STRING_LITERAL_CHARS = 16384;
/**
 * Franco-Arabic aware lexer:
 * Treats digits inside or prefixed to word characters (e.g. `9oul`, `3lik`, `5ayb`, `7a9`, `2idha`)
 * as part of an IDENT token rather than splitting into NUMBER + IDENT.
 */
export declare function lex(source: string): Token[];
