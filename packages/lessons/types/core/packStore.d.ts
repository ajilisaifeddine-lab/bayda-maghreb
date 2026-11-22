import { DialectPack, PackSource } from './types';
export interface PackCatalogRecord {
    id: string;
    version: string;
    bytes: number;
    sha256: string;
}
export interface PackState {
    source: PackSource;
    pack: DialectPack;
    installedVersion?: string;
}
export declare function resolveDialectPack(starter: DialectPack, installedMap: Record<string, DialectPack>): PackState;
/**
 * Builds an integrity-verified full dialect pack payload (adding rich analogies,
 * educational examples, and full concepts/vocabulary) and verifies SHA-256 + schema
 * before saving to persistent local storage.
 */
export declare function buildAndVerifyFullPack(starter: DialectPack, fullData: DialectPack): Promise<{
    ok: true;
    pack: DialectPack;
    sha256: string;
    bytes: number;
} | {
    ok: false;
    error: string;
}>;
export declare function loadValidatedInstalledPacks(rawJson: string | null): Record<string, DialectPack>;
