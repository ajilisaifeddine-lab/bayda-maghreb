export type Target = 'js' | 'py' | 'algo' | 'alif' | 'kalimat' | 'qalb' | 'c' | 'cpp' | 'java' | 'php';
export declare const VALID_TARGETS: readonly Target[];
export interface TargetMetadata {
    label: string;
    ext: string;
    rtl: boolean;
}
export declare const TARGET_META: Record<Target, TargetMetadata>;
export declare function isRtlTarget(target: Target): boolean;
export declare function isValidTarget(val: unknown): val is Target;
export type UiLang = 'ar' | 'en' | 'fr' | 'es' | 'pt-BR' | 'it' | 'de' | 'nl' | 'arn' | 'ht';
export type LearningMode = 'kid' | 'beginner' | 'pro';
export type AppView = 'playground' | 'dictionary' | 'lessons' | 'games' | 'notebook';
export type KidAgeBand = 'auto' | '4-5' | '6-7' | '8-9';
export type AppTheme = 'light' | 'dark' | 'comfort';
export type KidTheme = 'candy' | 'jungle' | 'ocean' | 'desert';
export type ExecutionStepKind = 'assign' | 'print' | 'if' | 'while' | 'for' | 'fn' | 'call' | 'return' | 'input' | 'array';
export interface ExecutionStepTrace {
    step: number;
    kind: ExecutionStepKind;
    summary: string;
    varsSnapshot: Record<string, string>;
    outputsSnapshot: string[];
    callStack?: string[];
}
export interface Token {
    type: 'IDENT' | 'NUMBER' | 'STRING' | 'SYMBOL' | 'OP' | 'EOF';
    value: string;
    line: number;
    column: number;
    concept?: string;
}
export type ExprToken = {
    type: Token['type'];
    value: string;
    concept?: string;
};
export type ArgNode = {
    type: 'StringLiteral';
    value: string;
} | {
    type: 'NumberLiteral';
    value: number;
} | {
    type: 'Identifier';
    name: string;
    concept?: string;
} | {
    type: 'RawExpr';
    tokens: ExprToken[];
};
export type AstNode = {
    type: 'Program';
    body: AstNode[];
} | {
    type: 'Call';
    name: string;
    concept?: string;
    args: ArgNode[];
} | {
    type: 'VarAssign';
    name: string;
    isDeclaration: boolean;
    value: ExprToken[];
} | {
    type: 'IndexAssign';
    target: string;
    index: ExprToken[];
    op: '=' | '+=' | '-=';
    value: ExprToken[];
} | {
    type: 'If';
    test: {
        tokens: ExprToken[];
    };
    then: AstNode[];
    else?: AstNode[];
} | {
    type: 'While';
    test: {
        tokens: ExprToken[];
    };
    body: AstNode[];
} | {
    type: 'For';
    variant: 'range' | 'each' | 'cstyle';
    iterator?: string;
    start?: ExprToken[];
    end?: ExprToken[];
    iterable?: ExprToken[];
    init?: AstNode | null;
    test?: ExprToken[] | null;
    step?: AstNode | null;
    body: AstNode[];
} | {
    type: 'FunctionDecl';
    name: string;
    params: string[];
    body: AstNode[];
} | {
    type: 'Return';
    value?: ExprToken[];
};
export type ScriptKind = 'Latin' | 'Arabic' | 'Tifinagh';
export interface DictMetaEntry {
    role?: string;
    analogy?: string;
    example?: string;
}
export interface DialectPack {
    id: string;
    code: string;
    name: string;
    nativeName: string;
    country: string;
    regionLabel: string;
    script: ScriptKind;
    rtl: boolean;
    iso639_3?: string;
    reviewStatus: 'verified' | 'pending';
    requiresConsent?: boolean;
    version: string;
    description: string;
    tribute?: string;
    keywords: Record<string, string>;
    vocabulary: Record<string, string>;
    starterCode: string;
    meta?: Record<string, DictMetaEntry>;
}
export type PackSource = 'example' | 'downloaded';
export interface TranspileMetrics {
    transpileMs: number;
    tokenCount: number;
    astNodeCount: number;
    outputBytes: number;
}
export interface TranspileResult {
    ok: boolean;
    code: string;
    ast?: AstNode;
    tokens?: Token[];
    error?: string;
    hint?: string;
    line?: number;
    metrics?: TranspileMetrics;
}
export interface AwaitingInputPrompt {
    prompt: string;
    collectedCount: number;
}
export type ExecutionWarningCode = 'steps_high' | 'memory_high' | 'array_large' | 'recursion_deep' | 'output_large';
export interface ExecutionResult {
    ok: boolean;
    outputs: string[];
    error?: string;
    warnings?: ExecutionWarningCode[];
    awaitingInput?: AwaitingInputPrompt;
    steps: number;
    executionMs?: number;
    variablesCount?: number;
    estimatedMemoryBytes?: number;
}
export interface MemoryBreakdownBytes {
    sourceTokensBytes: number;
    astBytes: number;
    runtimeEnvBytes: number;
    targetOutputBytes: number;
}
export interface ProgramTelemetrySnapshot {
    id: string;
    timestamp: number;
    dialectId: string;
    target: Target;
    ok: boolean;
    transpileMs: number;
    executionMs: number | null;
    estimatedMemoryBytes: number;
    heapUsedBytes: number | null;
    steps: number;
    tokenCount: number;
    astNodeCount: number;
    outputBytes: number;
    breakdown: MemoryBreakdownBytes;
}
export type LessonKind = 'type' | 'arrange';
export type LessonNodeName = 'if' | 'while' | 'for' | 'fn' | 'return' | 'input' | 'array' | 'let';
export type LessonRule = {
    op: 'prints_text';
    value: string;
} | {
    op: 'prints_number';
    value: string;
} | {
    op: 'prints_bool';
    value: 'true' | 'false';
} | {
    op: 'prints_in_order';
    values: string[];
} | {
    op: 'min_prints';
    min: number;
} | {
    op: 'has_node';
    node: LessonNodeName;
} | {
    op: 'min_nodes';
    node: LessonNodeName;
    min: number;
} | {
    op: 'has_else';
} | {
    op: 'nested_if';
} | {
    op: 'test_token';
    node: LessonNodeName;
    value: string;
} | {
    op: 'test_compares';
    node: LessonNodeName;
} | {
    op: 'min_functions';
    min: number;
} | {
    op: 'has_return';
} | {
    op: 'uses_input';
} | {
    op: 'uses_array';
};
export interface LessonTemplate {
    id: string;
    mode: LearningMode;
    order: number;
    status: 'ready' | 'planned';
    kind?: LessonKind;
    requires: string[];
    titleKey: string;
    goalKey: string;
    explainKeys: string[];
    hintKeys: string[];
    template?: string;
    cards?: string[];
    answer?: number[];
    wrong?: string;
    check: LessonRule[];
}
export type LessonVerdict = {
    status: 'ok';
    outputs: string[];
} | {
    status: 'wrong';
    failed: LessonRule['op'];
    outputs: string[];
} | {
    status: 'error';
    message: string;
    hint?: string;
};
export interface NotebookEntry {
    id: string;
    dialectId: string;
    term: string;
    meaning: string;
    kind: 'keyword' | 'vocabulary' | 'snippet';
    notes: string;
    snippet: string;
    box: 1 | 2 | 3 | 4 | 5;
    lastReviewedAt: string | null;
    createdAt: string;
}
export type AchievementId = 'first-spark' | 'dialect-explorer' | 'branch-navigator' | 'syntax-master' | 'review-champion' | 'maghreb-polyglot';
export interface BadgeUnlockRecord {
    badgeId: AchievementId;
    unlockedAt: string;
}
export interface LearnerProfile {
    version: 1;
    badges: Partial<Record<AchievementId, BadgeUnlockRecord>>;
    reviewPasses: number;
    lastUpdatedAt: string | null;
}
