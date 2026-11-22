import { DialectPack } from './types';
export declare const MAX_PACK_JSON_BYTES: number;
export declare function cleanDict(src: Record<string, string>): Record<string, string>;
export declare function sanitizeStringMap(raw: unknown, maxEntries?: number): Record<string, string> | null;
export type PackValidationResult = {
    ok: true;
    pack: DialectPack;
} | {
    ok: false;
    error: string;
};
export declare function validateDialectPack(raw: unknown): PackValidationResult;
/**
 * Deterministic SHA-256 hex digest using Web Crypto when available, or Node/sync SHA-256 fallback,
 * plus deterministic integrity verification over pack JSON payload.
 */
export declare function computeSha256Hex(text: string): Promise<string>;
export declare function verifyPackIntegrity(serializedJson: string, expectedSha256: string, expectedBytes: number): Promise<{
    ok: true;
} | {
    ok: false;
    error: string;
}>;
