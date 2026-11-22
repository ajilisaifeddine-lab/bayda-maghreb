/**
 * Shared cybersecurity primitives for Bayda Maghreb (usable in browser, Service Worker,
 * unit tests, and Node Express server without external dependencies).
 */
export declare const FORBIDDEN_PROTO_KEYS: Set<string>;
export declare function isPlainObject(val: unknown): val is Record<string, unknown>;
/**
 * Recursively checks parsed JSON structures for prototype-pollution keys
 * or excessive nesting depth.
 */
export declare function hasForbiddenKeys(val: unknown, maxDepth?: number, depth?: number): boolean;
/**
 * Safely parses JSON with UTF-8 size cap and prototype-pollution guards.
 */
export declare function safeJsonParse<T = unknown>(raw: string, maxBytes?: number): {
    ok: true;
    value: T;
} | {
    ok: false;
    error: string;
};
export declare function containsTrojanOrControlChars(text: string, options?: {
    allowNewlines?: boolean;
}): boolean;
export declare function stripTrojanAndControlChars(text: string, options?: {
    allowNewlines?: boolean;
}): {
    cleaned: string;
    removedCount: number;
};
export declare function sanitizeExportFilename(raw: string, fallback?: string): string;
/**
 * Synchronous FIPS 180-4 SHA-256 hex digest over UTF-8 text.
 * Enables offline deterministic integrity verification inside synchronous React/core helpers.
 */
export declare function sha256HexSync(input: string): string;
export declare function constantTimeEqual(a: string, b: string): boolean;
export interface SlidingRateLimiterOptions {
    windowMs: number;
    maxRequests: number;
    maxTrackedKeys?: number;
}
export interface RateLimitVerdict {
    allowed: boolean;
    remaining: number;
    retryAfterSec: number;
}
/**
 * Bounded-memory sliding-window rate limiter for API routes.
 */
export declare class SlidingWindowRateLimiter {
    private readonly hits;
    private readonly windowMs;
    private readonly maxRequests;
    private readonly maxTrackedKeys;
    constructor(options: SlidingRateLimiterOptions);
    check(key: string, nowMs?: number): RateLimitVerdict;
}
