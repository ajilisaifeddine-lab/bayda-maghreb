import { DialectPack } from './types';
/**
 * Generates friendly, educational error hints in UI-ready keys or readable prose
 * when parsing or lexing fails (e.g. missing ')', unclosed '{', missing quotes,
 * or typing a keyword from another Maghreb dialect).
 */
export interface DiagnosticHint {
    kind: 'unclosed_call' | 'unclosed_block' | 'unterminated_string' | 'cross_dialect_keyword' | 'unexpected_token';
    suggestion?: string;
    foreignWord?: string;
    suggestedWord?: string;
}
export declare function diagnoseCompileError(rawError: string, source: string, activePack: DialectPack, allPacks: DialectPack[]): DiagnosticHint;
