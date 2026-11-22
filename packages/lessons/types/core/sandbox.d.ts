import { AstNode, ExecutionResult, ExecutionStepTrace } from './types';
export declare const MAX_LOOP_ITERATIONS = 500;
export declare const MAX_TOTAL_STEPS = 15000;
export declare const MAX_CALL_DEPTH = 64;
export declare const MAX_ARRAY_LENGTH = 2000;
export declare const MAX_STRING_LENGTH = 16384;
export declare const MAX_OUTPUT_LINES = 400;
export declare const MAX_RUNTIME_BYTES: number;
export declare const MAX_VALUE_NESTING = 32;
export type RuntimeVal = string | number | boolean | null | RuntimeVal[];
export interface ExecuteOptions {
    inputs?: string[];
}
export declare function executeAst(ast: AstNode, options?: ExecuteOptions): ExecutionResult;
export declare function traceExecutionAst(ast: AstNode, maxEvents?: number, options?: ExecuteOptions): ExecutionStepTrace[];
