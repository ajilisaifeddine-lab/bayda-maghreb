import { ExecutionResult, ProgramTelemetrySnapshot, Target, TranspileResult } from './types';
export declare function utf8ByteLength(text: string): number;
export declare function readBrowserHeapBytes(): number | null;
export declare function buildTelemetrySnapshot(params: {
    sourceCode: string;
    dialectId: string;
    target: Target;
    transpileResult: TranspileResult;
    execResult: ExecutionResult | null;
}): ProgramTelemetrySnapshot;
export declare function formatBytes(bytes: number): string;
export declare function formatMs(ms: number | null): string;
