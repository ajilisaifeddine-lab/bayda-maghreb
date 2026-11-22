import { DialectPack, Target, TranspileResult } from './types';
export interface TranslateOptions {
    target: Target;
    consent?: boolean;
}
export declare function translateDialect(source: string, pack: DialectPack, options: TranslateOptions): TranspileResult;
