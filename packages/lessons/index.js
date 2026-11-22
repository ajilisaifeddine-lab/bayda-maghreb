// src/core/security.ts
var FORBIDDEN_PROTO_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
var TROJAN_OR_CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200E\u200F\u202A-\u202E\u2066-\u2069\u061C\uFEFF\u2028\u2029]/gu;
var INLINE_CONTROL_RE = /[\u0000-\u001F\u007F\u200E\u200F\u202A-\u202E\u2066-\u2069\u061C\uFEFF\u2028\u2029]/gu;
function isPlainObject(val) {
  if (typeof val !== "object" || val === null || Array.isArray(val)) return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}
function hasForbiddenKeys(val, maxDepth = 16, depth = 0) {
  if (depth > maxDepth) return true;
  if (val === null || typeof val !== "object") return false;
  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i++) {
      if (hasForbiddenKeys(val[i], maxDepth, depth + 1)) return true;
    }
    return false;
  }
  const proto = Object.getPrototypeOf(val);
  if (proto !== Object.prototype && proto !== null) {
    return true;
  }
  for (const key of Object.keys(val)) {
    if (FORBIDDEN_PROTO_KEYS.has(key)) {
      return true;
    }
    const child = val[key];
    if (hasForbiddenKeys(child, maxDepth, depth + 1)) {
      return true;
    }
  }
  return false;
}
function safeJsonParse(raw, maxBytes = 256 * 1024) {
  if (typeof raw !== "string") {
    return { ok: false, error: "Payload is not a string." };
  }
  const byteLength = new TextEncoder().encode(raw).length;
  if (byteLength > maxBytes) {
    return { ok: false, error: "Payload exceeds maximum allowed byte size." };
  }
  let parsed;
  try {
    let foundForbidden = false;
    parsed = JSON.parse(raw, (key, value) => {
      if (FORBIDDEN_PROTO_KEYS.has(key)) {
        foundForbidden = true;
        return void 0;
      }
      return value;
    });
    if (foundForbidden || hasForbiddenKeys(parsed)) {
      return { ok: false, error: "Unsafe prototype property detected in JSON payload." };
    }
    return { ok: true, value: parsed };
  } catch {
    return { ok: false, error: "Malformed JSON payload." };
  }
}
function containsTrojanOrControlChars(text, options) {
  if (!text) return false;
  const allowNewlines = options?.allowNewlines ?? true;
  const re = allowNewlines ? TROJAN_OR_CONTROL_RE : INLINE_CONTROL_RE;
  re.lastIndex = 0;
  return re.test(text);
}
function stripTrojanAndControlChars(text, options) {
  if (!text) return { cleaned: "", removedCount: 0 };
  const allowNewlines = options?.allowNewlines ?? true;
  const re = allowNewlines ? TROJAN_OR_CONTROL_RE : INLINE_CONTROL_RE;
  let removedCount = 0;
  const cleaned = text.replace(re, () => {
    removedCount += 1;
    return "";
  });
  return { cleaned, removedCount };
}
var SHA256_K = new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
function rotr(value, bits) {
  return value >>> bits | value << 32 - bits;
}
function sha256HexSync(input) {
  const bytes = new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 128;
  const view = new DataView(padded.buffer);
  const highBits = Math.floor(bitLen / 4294967296);
  const lowBits = bitLen >>> 0;
  view.setUint32(paddedLen - 8, highBits, false);
  view.setUint32(paddedLen - 4, lowBits, false);
  let h0 = 1779033703;
  let h1 = 3144134277;
  let h2 = 1013904242;
  let h3 = 2773480762;
  let h4 = 1359893119;
  let h5 = 2600822924;
  let h6 = 528734635;
  let h7 = 1541459225;
  const w = new Uint32Array(64);
  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ w[i - 15] >>> 3;
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ w[i - 2] >>> 10;
      w[i] = w[i - 16] + s0 + w[i - 7] + s1 >>> 0;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = e & f ^ ~e & g;
      const temp1 = h + S1 + ch + SHA256_K[i] + w[i] >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = a & b ^ a & c ^ b & c;
      const temp2 = S0 + maj >>> 0;
      h = g;
      g = f;
      f = e;
      e = d + temp1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = temp1 + temp2 >>> 0;
    }
    h0 = h0 + a >>> 0;
    h1 = h1 + b >>> 0;
    h2 = h2 + c >>> 0;
    h3 = h3 + d >>> 0;
    h4 = h4 + e >>> 0;
    h5 = h5 + f >>> 0;
    h6 = h6 + g >>> 0;
    h7 = h7 + h >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map((n) => n.toString(16).padStart(8, "0")).join("");
}
function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// src/core/achievements.ts
var ACHIEVEMENT_DEFINITIONS = [
  {
    id: "first-spark",
    titleKey: "achFirstSparkTitle",
    descKey: "achFirstSparkDesc",
    target: 1
  },
  {
    id: "dialect-explorer",
    titleKey: "achDialectExplorerTitle",
    descKey: "achDialectExplorerDesc",
    target: 2
  },
  {
    id: "branch-navigator",
    titleKey: "achBranchNavigatorTitle",
    descKey: "achBranchNavigatorDesc",
    target: 2
  },
  {
    id: "syntax-master",
    titleKey: "achSyntaxMasterTitle",
    descKey: "achSyntaxMasterDesc",
    target: 3
  },
  {
    id: "review-champion",
    titleKey: "achReviewChampionTitle",
    descKey: "achReviewChampionDesc",
    target: 3
  },
  {
    id: "maghreb-polyglot",
    titleKey: "achMaghrebPolyglotTitle",
    descKey: "achMaghrebPolyglotDesc",
    target: 10
  }
];
var VALID_BADGE_IDS = new Set(
  ACHIEVEMENT_DEFINITIONS.map((d) => d.id)
);
var BRANCH_LESSON_IDS = [
  "kid-door",
  "kid-sun-rain",
  "bg-if",
  "bg-else",
  "bg-compare",
  "pr-two-ifs",
  "pr-nested-if",
  "pr-input-guard",
  "pr-errors"
];
var PRO_SYNTAX_LESSON_IDS = [
  "pr-two-ifs",
  "pr-nested-if",
  "pr-while-shape"
];
function createEmptyLearnerProfile() {
  return {
    version: 1,
    badges: {},
    reviewPasses: 0,
    lastUpdatedAt: null
  };
}
function parseLearnerProfile(raw) {
  if (!raw) return createEmptyLearnerProfile();
  const jsonResult = safeJsonParse(raw, 64 * 1024);
  if (!jsonResult.ok || !isPlainObject(jsonResult.value)) {
    return createEmptyLearnerProfile();
  }
  const parsed = jsonResult.value;
  const badges = {};
  if (isPlainObject(parsed.badges)) {
    for (const [key, val] of Object.entries(parsed.badges)) {
      if (VALID_BADGE_IDS.has(key) && isPlainObject(val) && typeof val.unlockedAt === "string") {
        const badgeId = key;
        badges[badgeId] = {
          badgeId,
          unlockedAt: val.unlockedAt.slice(0, 48)
        };
      }
    }
  }
  const reviewPasses = typeof parsed.reviewPasses === "number" && Number.isFinite(parsed.reviewPasses) && parsed.reviewPasses >= 0 ? Math.min(1e5, Math.floor(parsed.reviewPasses)) : 0;
  return {
    version: 1,
    badges,
    reviewPasses,
    lastUpdatedAt: typeof parsed.lastUpdatedAt === "string" ? parsed.lastUpdatedAt.slice(0, 48) : null
  };
}
function evaluateAchievements(completedByDialect, profile, nowIso = (/* @__PURE__ */ new Date()).toISOString()) {
  let totalLessonCompletions = 0;
  let distinctDialectsCount = 0;
  const allUniqueLessons = /* @__PURE__ */ new Set();
  for (const list of Object.values(completedByDialect)) {
    if (!Array.isArray(list)) continue;
    const uniqueForDialect = new Set(list.filter((x) => typeof x === "string" && x.length > 0));
    if (uniqueForDialect.size > 0) {
      distinctDialectsCount += 1;
      totalLessonCompletions += uniqueForDialect.size;
      for (const id of uniqueForDialect) {
        allUniqueLessons.add(id);
      }
    }
  }
  const branchCompletedCount = BRANCH_LESSON_IDS.filter(
    (id) => allUniqueLessons.has(id)
  ).length;
  const proCompletedCount = PRO_SYNTAX_LESSON_IDS.filter(
    (id) => id === "pr-nested-if" ? allUniqueLessons.has("pr-nested-if") || allUniqueLessons.has("pr-nested") : allUniqueLessons.has(id)
  ).length;
  const progressMap = {
    "first-spark": Math.min(1, totalLessonCompletions),
    "dialect-explorer": Math.min(2, distinctDialectsCount),
    "branch-navigator": Math.min(2, branchCompletedCount),
    "syntax-master": Math.min(3, proCompletedCount),
    "review-champion": Math.min(3, profile.reviewPasses),
    "maghreb-polyglot": Math.min(10, totalLessonCompletions)
  };
  const nextBadges = {
    ...profile.badges
  };
  const newlyUnlocked = [];
  const items = ACHIEVEMENT_DEFINITIONS.map((def) => {
    const existing = nextBadges[def.id];
    const current = progressMap[def.id];
    const metNow = current >= def.target;
    if (metNow && !existing) {
      const record = {
        badgeId: def.id,
        unlockedAt: nowIso
      };
      nextBadges[def.id] = record;
      newlyUnlocked.push(def.id);
      return {
        ...def,
        current: def.target,
        unlocked: true,
        unlockedAt: record.unlockedAt
      };
    }
    return {
      ...def,
      current: existing ? def.target : current,
      unlocked: Boolean(existing),
      unlockedAt: existing?.unlockedAt ?? null
    };
  });
  const updatedProfile = newlyUnlocked.length > 0 ? {
    ...profile,
    badges: nextBadges,
    lastUpdatedAt: nowIso
  } : profile;
  return { items, updatedProfile, newlyUnlocked };
}

// src/core/diagnostics.ts
function diagnoseCompileError(rawError, source, activePack, allPacks) {
  if (/Unterminated string literal/i.test(rawError)) {
    return { kind: "unterminated_string" };
  }
  if (/Unclosed call/i.test(rawError) || /Expected '\('/i.test(rawError)) {
    return { kind: "unclosed_call" };
  }
  if (/Unclosed '\{'/i.test(rawError) || /Expected '\{'/i.test(rawError)) {
    return { kind: "unclosed_block" };
  }
  const unexpectedMatch = /Unexpected token '([^']+)'/i.exec(rawError);
  if (unexpectedMatch) {
    const token = unexpectedMatch[1].toLowerCase();
    for (const other of allPacks) {
      if (other.id === activePack.id) continue;
      for (const [word, concept] of Object.entries(other.keywords)) {
        if (word.toLowerCase() === token) {
          const nativeEquiv = Object.entries(activePack.keywords).find(([, c]) => c === concept)?.[0];
          if (nativeEquiv) {
            return {
              kind: "cross_dialect_keyword",
              foreignWord: unexpectedMatch[1],
              suggestedWord: nativeEquiv,
              suggestion: `${unexpectedMatch[1]} (${other.id}) -> ${nativeEquiv}`
            };
          }
        }
      }
    }
  }
  const firstWord = source.trim().split(/[\s(]+/)[0]?.toLowerCase();
  if (firstWord && activePack.keywords[firstWord] === "print" && /Unexpected|Undefined variable/i.test(rawError)) {
    return { kind: "unexpected_token", suggestion: `${firstWord}("salam")` };
  }
  return { kind: "unexpected_token" };
}

// src/core/sandbox.ts
var MAX_LOOP_ITERATIONS = 500;
var MAX_TOTAL_STEPS = 15e3;
var MAX_CALL_DEPTH = 64;
var MAX_ARRAY_LENGTH = 2e3;
var MAX_STRING_LENGTH = 16384;
var MAX_OUTPUT_LINES = 400;
var MAX_RUNTIME_BYTES = 2 * 1024 * 1024;
var MAX_VALUE_NESTING = 32;
var WARN_RATIO = 0.75;
var ReturnSignal = class {
  constructor(value) {
    this.value = value;
  }
};
var InputAwaitSignal = class {
  constructor(prompt, collectedCount) {
    this.prompt = prompt;
    this.collectedCount = collectedCount;
  }
};
function createSandboxGuards(warningSet) {
  const onWarning = (code) => {
    warningSet.add(code);
  };
  return {
    onWarning,
    checkOutputCount(count) {
      if (count > MAX_OUTPUT_LINES) {
        throw new Error(`Output line limit (${MAX_OUTPUT_LINES}) exceeded`);
      }
      if (count >= Math.floor(MAX_OUTPUT_LINES * WARN_RATIO)) {
        onWarning("output_large");
      }
    },
    checkArrayLength(len) {
      if (len > MAX_ARRAY_LENGTH) {
        throw new Error(`Array length limit (${MAX_ARRAY_LENGTH}) exceeded`);
      }
      if (len >= Math.floor(MAX_ARRAY_LENGTH * WARN_RATIO)) {
        onWarning("array_large");
      }
    },
    checkStringLength(len) {
      if (len > MAX_STRING_LENGTH) {
        throw new Error(`String length limit (${MAX_STRING_LENGTH} characters) exceeded`);
      }
    },
    checkCallDepth(depth) {
      if (depth >= MAX_CALL_DEPTH) {
        throw new Error(`Maximum call stack depth (${MAX_CALL_DEPTH}) exceeded`);
      }
      if (depth >= Math.floor(MAX_CALL_DEPTH * WARN_RATIO)) {
        onWarning("recursion_deep");
      }
    },
    checkSteps(steps) {
      if (steps > MAX_TOTAL_STEPS) {
        throw new Error("Execution step limit exceeded (possible infinite loop)");
      }
      if (steps >= Math.floor(MAX_TOTAL_STEPS * WARN_RATIO)) {
        onWarning("steps_high");
      }
    }
  };
}
function containsArrayReference(container, candidateTarget, visited = /* @__PURE__ */ new Set(), depth = 0) {
  if (depth > MAX_VALUE_NESTING || !Array.isArray(container)) return false;
  if (container === candidateTarget) return true;
  if (visited.has(container)) return false;
  visited.add(container);
  for (let i = 0; i < container.length; i++) {
    if (containsArrayReference(container[i], candidateTarget, visited, depth + 1)) {
      return true;
    }
  }
  return false;
}
function safePushToArray(target, items, guards) {
  guards.checkArrayLength(target.length + items.length);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (Array.isArray(item) && containsArrayReference(item, target)) {
      throw new Error("Cyclic self-referential array push is not allowed");
    }
    target.push(item);
  }
}
function formatRuntimeVal(v, visited = /* @__PURE__ */ new Set(), depth = 0) {
  if (Array.isArray(v)) {
    if (visited.has(v) || depth > MAX_VALUE_NESTING) {
      return "[...]";
    }
    visited.add(v);
    try {
      const rendered = `[${v.map((item) => formatRuntimeVal(item, visited, depth + 1)).join(", ")}]`;
      return rendered.length > MAX_STRING_LENGTH ? `${rendered.slice(0, MAX_STRING_LENGTH)}...` : rendered;
    } finally {
      visited.delete(v);
    }
  }
  if (v === null) return "null";
  return String(v);
}
function parseUserInputValue(raw) {
  const safe = raw.length > MAX_STRING_LENGTH ? raw.slice(0, MAX_STRING_LENGTH) : raw;
  const trimmed = safe.trim();
  if (trimmed.length > 0 && /^-?\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    if (Number.isFinite(n)) return n;
  }
  return safe;
}
function assertSafeIdentifier(name) {
  if (FORBIDDEN_PROTO_KEYS.has(name)) {
    throw new Error(`Reserved identifier '${name}' is not allowed`);
  }
}
function lookupVar(scope, name) {
  assertSafeIdentifier(name);
  let cur = scope;
  while (cur) {
    if (cur.vars.has(name)) {
      return { found: true, value: cur.vars.get(name) };
    }
    cur = cur.parent;
  }
  return { found: false, value: null };
}
function assignVar(scope, name, value, isDeclaration) {
  assertSafeIdentifier(name);
  if (isDeclaration) {
    scope.vars.set(name, value);
    return;
  }
  let cur = scope;
  while (cur) {
    if (cur.vars.has(name)) {
      cur.vars.set(name, value);
      return;
    }
    cur = cur.parent;
  }
  scope.vars.set(name, value);
}
function estimateRuntimeMemoryBytes(rootScope, outputs, steps) {
  const enc = new TextEncoder();
  let bytes = steps * 24;
  const visited = /* @__PURE__ */ new Set();
  const countValBytes = (v, depth = 0) => {
    if (Array.isArray(v)) {
      if (visited.has(v) || depth > MAX_VALUE_NESTING) return 24;
      visited.add(v);
      let sum = 24;
      for (const item of v) {
        sum += countValBytes(item, depth + 1);
        if (bytes + sum > MAX_RUNTIME_BYTES * 2) break;
      }
      return sum;
    }
    return typeof v === "string" ? enc.encode(v).length : 8;
  };
  for (const [k, v] of rootScope.vars.entries()) {
    bytes += 40 + enc.encode(k).length + countValBytes(v);
  }
  for (const out of outputs) {
    bytes += 24 + enc.encode(out).length;
  }
  return bytes;
}
function createEvaluator(dispatchCall, consumeInput, guards) {
  function evalExprTokens(tokens, scope) {
    let idx = 0;
    let exprDepth = 0;
    function enterExpr() {
      exprDepth++;
      if (exprDepth > MAX_VALUE_NESTING + 16) {
        throw new Error("Maximum expression nesting depth exceeded");
      }
    }
    function leaveExpr() {
      if (exprDepth > 0) exprDepth--;
    }
    function peek() {
      return tokens[idx];
    }
    function consume() {
      return tokens[idx++];
    }
    function parseOr() {
      let left = parseAnd();
      while (peek()?.type === "OP" && peek()?.value === "||" || peek()?.concept === "or") {
        consume();
        const right = parseAnd();
        left = Boolean(left) || Boolean(right);
      }
      return left;
    }
    function parseAnd() {
      let left = parseEquality();
      while (peek()?.type === "OP" && peek()?.value === "&&" || peek()?.concept === "and") {
        consume();
        const right = parseEquality();
        left = Boolean(left) && Boolean(right);
      }
      return left;
    }
    function parseEquality() {
      let left = parseComparison();
      while (peek()?.type === "OP" && (peek()?.value === "==" || peek()?.value === "!=")) {
        const op = consume().value;
        const right = parseComparison();
        left = op === "==" ? left === right : left !== right;
      }
      return left;
    }
    function parseComparison() {
      let left = parseAdditive();
      while (peek()?.type === "OP" && (peek()?.value === "<" || peek()?.value === ">" || peek()?.value === "<=" || peek()?.value === ">=")) {
        const op = consume().value;
        const right = parseAdditive();
        const a = Number(left);
        const b = Number(right);
        if (op === "<") left = a < b;
        else if (op === ">") left = a > b;
        else if (op === "<=") left = a <= b;
        else left = a >= b;
      }
      return left;
    }
    function parseAdditive() {
      let left = parseMultiplicative();
      while (peek()?.type === "OP" && (peek()?.value === "+" || peek()?.value === "-")) {
        const op = consume().value;
        const right = parseMultiplicative();
        if (op === "+") {
          if (typeof left === "string" || typeof right === "string") {
            const combined = `${formatRuntimeVal(left)}${formatRuntimeVal(right)}`;
            guards.checkStringLength(combined.length);
            left = combined;
          } else {
            left = Number(left) + Number(right);
          }
        } else {
          left = Number(left) - Number(right);
        }
      }
      return left;
    }
    function parseMultiplicative() {
      let left = parseUnary();
      while (peek()?.type === "OP" && (peek()?.value === "*" || peek()?.value === "/" || peek()?.value === "%")) {
        const op = consume().value;
        const right = parseUnary();
        if (op === "*") left = Number(left) * Number(right);
        else if (op === "/") {
          if (Number(right) === 0) throw new Error("Division by zero");
          left = Number(left) / Number(right);
        } else {
          left = Number(left) % Number(right);
        }
      }
      return left;
    }
    function parseUnary() {
      const t = peek();
      if (t?.type === "OP" && t.value === "!" || t?.concept === "not") {
        consume();
        return !Boolean(parseUnary());
      }
      if (t?.type === "OP" && t.value === "-") {
        consume();
        return -Number(parseUnary());
      }
      return parsePostfix();
    }
    function parseArgValues() {
      consume();
      const args = [];
      if (!(peek()?.type === "SYMBOL" && peek()?.value === ")")) {
        while (idx < tokens.length) {
          args.push(parseOr());
          if (peek()?.type === "SYMBOL" && peek()?.value === ",") {
            consume();
          } else {
            break;
          }
        }
      }
      if (peek()?.type === "SYMBOL" && peek()?.value === ")") {
        consume();
      }
      return args;
    }
    function parsePostfix() {
      let val = parsePrimary();
      while (peek()?.type === "SYMBOL" && (peek()?.value === "[" || peek()?.value === ".")) {
        const sym = consume().value;
        if (sym === "[") {
          const indexVal = parseOr();
          if (peek()?.type === "SYMBOL" && peek()?.value === "]") {
            consume();
          }
          const i = Math.trunc(Number(indexVal));
          if (Array.isArray(val)) {
            if (!Number.isFinite(i) || i < 0 || i >= val.length) {
              throw new Error(`Array index ${i} out of bounds (length ${val.length})`);
            }
            val = val[i];
          } else if (typeof val === "string") {
            if (!Number.isFinite(i) || i < 0 || i >= val.length) {
              throw new Error(`Text index ${i} out of bounds (length ${val.length})`);
            }
            val = val[i];
          } else {
            throw new Error("Cannot index non-list value");
          }
        } else if (sym === ".") {
          const prop = peek();
          if (!prop || prop.type !== "IDENT") {
            throw new Error(`Expected property name after '.'`);
          }
          consume();
          if (peek()?.type === "SYMBOL" && peek()?.value === "(") {
            const methodArgs = parseArgValues();
            if (prop.concept === "push" || prop.value === "push") {
              if (!Array.isArray(val)) {
                throw new Error(`Cannot call '${prop.value}' on non-list value`);
              }
              safePushToArray(val, methodArgs, guards);
              val = val.length;
            } else {
              throw new Error(`Unsupported method '.${prop.value}()'`);
            }
          } else if (prop.value === "length" || prop.concept === "len") {
            if (Array.isArray(val) || typeof val === "string") {
              val = val.length;
            } else {
              throw new Error(`Cannot read '.${prop.value}' on non-list value`);
            }
          } else {
            throw new Error(`Unknown property '.${prop.value}'`);
          }
        }
      }
      return val;
    }
    function parsePrimary() {
      const t = peek();
      if (!t) throw new Error("Unexpected end of expression");
      if (t.type === "SYMBOL" && t.value === "(") {
        enterExpr();
        try {
          consume();
          const val = parseOr();
          if (peek()?.type === "SYMBOL" && peek()?.value === ")") {
            consume();
          }
          return val;
        } finally {
          leaveExpr();
        }
      }
      if (t.type === "SYMBOL" && t.value === "[") {
        enterExpr();
        try {
          consume();
          const items = [];
          if (!(peek()?.type === "SYMBOL" && peek()?.value === "]")) {
            while (idx < tokens.length) {
              items.push(parseOr());
              guards.checkArrayLength(items.length);
              if (peek()?.type === "SYMBOL" && peek()?.value === ",") {
                consume();
              } else {
                break;
              }
            }
          }
          if (!(peek()?.type === "SYMBOL" && peek()?.value === "]")) {
            throw new Error("Unclosed '[' array literal");
          }
          consume();
          return items;
        } finally {
          leaveExpr();
        }
      }
      if (t.type === "STRING") {
        consume();
        return t.value;
      }
      if (t.type === "NUMBER") {
        consume();
        return Number(t.value);
      }
      if (t.type === "IDENT") {
        consume();
        if (peek()?.type === "SYMBOL" && peek()?.value === "(") {
          const callArgs = parseArgValues();
          if (t.concept === "input") {
            const prompt = callArgs.length > 0 ? formatRuntimeVal(callArgs[0]) : "";
            return consumeInput(prompt);
          }
          if (t.concept === "len" || t.value === "len") {
            const target = callArgs[0];
            if (Array.isArray(target) || typeof target === "string") {
              return target.length;
            }
            throw new Error(`'${t.value}' expects a list or string`);
          }
          if (t.concept === "push" || t.value === "push") {
            const list = callArgs[0];
            if (!Array.isArray(list)) {
              throw new Error(`First argument of '${t.value}' must be a list`);
            }
            safePushToArray(list, callArgs.slice(1), guards);
            return list.length;
          }
          return dispatchCall(t.value, t.concept, callArgs);
        }
        if (t.concept === "true") return true;
        if (t.concept === "false") return false;
        const found = lookupVar(scope, t.value);
        if (found.found) return found.value;
        throw new Error(`Undefined variable '${t.value}'`);
      }
      throw new Error(`Unexpected token '${t.value}' in expression`);
    }
    return parseOr();
  }
  function evalArg(arg, scope) {
    switch (arg.type) {
      case "StringLiteral":
        return arg.value;
      case "NumberLiteral":
        return arg.value;
      case "Identifier": {
        if (arg.concept === "true") return true;
        if (arg.concept === "false") return false;
        const found = lookupVar(scope, arg.name);
        if (found.found) return found.value;
        throw new Error(`Undefined variable '${arg.name}'`);
      }
      case "RawExpr":
        return evalExprTokens(arg.tokens, scope);
    }
  }
  return { evalExprTokens, evalArg };
}
function hoistFunctions(node, functions) {
  if (node.type === "Program") {
    for (const stmt of node.body) {
      if (stmt.type === "FunctionDecl") {
        assertSafeIdentifier(stmt.name);
        functions.set(stmt.name, stmt);
      }
    }
  }
}
function executeAst(ast, options) {
  const outputs = [];
  const rootScope = { vars: /* @__PURE__ */ new Map(), parent: null };
  const functions = /* @__PURE__ */ new Map();
  const warningSet = /* @__PURE__ */ new Set();
  const guards = createSandboxGuards(warningSet);
  const inputs = options?.inputs ?? [];
  let inputIdx = 0;
  let steps = 0;
  let callDepth = 0;
  const checkLiveMemory = () => {
    const est = estimateRuntimeMemoryBytes(rootScope, outputs, steps);
    if (est > MAX_RUNTIME_BYTES) {
      throw new Error(`Memory safety limit (${Math.round(MAX_RUNTIME_BYTES / (1024 * 1024))} MB) exceeded`);
    }
    if (est >= Math.floor(MAX_RUNTIME_BYTES * WARN_RATIO)) {
      guards.onWarning("memory_high");
    }
    return est;
  };
  hoistFunctions(ast, functions);
  const consumeInput = (prompt) => {
    if (inputIdx < inputs.length) {
      const val = parseUserInputValue(inputs[inputIdx]);
      inputIdx++;
      return val;
    }
    throw new InputAwaitSignal(prompt, inputIdx);
  };
  const { evalExprTokens, evalArg } = createEvaluator(
    (name, concept, args) => callNamedFunction(name, concept, args),
    consumeInput,
    guards
  );
  function callNamedFunction(name, concept, args) {
    if (concept === "print" || concept === "log" || concept === "console.log") {
      const rendered = args.map((v) => formatRuntimeVal(v)).join(" ");
      guards.checkStringLength(rendered.length);
      outputs.push(rendered);
      guards.checkOutputCount(outputs.length);
      return null;
    }
    assertSafeIdentifier(name);
    const fnDecl = functions.get(name);
    if (!fnDecl) {
      throw new Error(`Function '${name}' is not defined in playground runtime`);
    }
    guards.checkCallDepth(callDepth);
    const fnScope = { vars: /* @__PURE__ */ new Map(), parent: rootScope };
    for (let i = 0; i < fnDecl.params.length; i++) {
      assertSafeIdentifier(fnDecl.params[i]);
      fnScope.vars.set(fnDecl.params[i], i < args.length ? args[i] : null);
    }
    callDepth++;
    try {
      for (const stmt of fnDecl.body) {
        runNode(stmt, fnScope);
      }
      return null;
    } catch (sig) {
      if (sig instanceof ReturnSignal) {
        return sig.value;
      }
      throw sig;
    } finally {
      callDepth--;
    }
  }
  function runNode(node, scope) {
    steps++;
    guards.checkSteps(steps);
    if (steps % 100 === 0) {
      checkLiveMemory();
    }
    switch (node.type) {
      case "Program":
        for (const stmt of node.body) runNode(stmt, scope);
        break;
      case "FunctionDecl":
        assertSafeIdentifier(node.name);
        functions.set(node.name, node);
        break;
      case "Return": {
        const val = node.value ? evalExprTokens(node.value, scope) : null;
        throw new ReturnSignal(val);
      }
      case "VarAssign": {
        const val = evalExprTokens(node.value, scope);
        assignVar(scope, node.name, val, node.isDeclaration);
        break;
      }
      case "IndexAssign": {
        const found = lookupVar(scope, node.target);
        if (!found.found || !Array.isArray(found.value)) {
          throw new Error(`Variable '${node.target}' is not a list`);
        }
        const indexVal = Math.trunc(Number(evalExprTokens(node.index, scope)));
        if (!Number.isFinite(indexVal) || indexVal < 0 || indexVal >= found.value.length) {
          throw new Error(
            `Array index ${indexVal} out of bounds for '${node.target}' (length ${found.value.length})`
          );
        }
        const rhs = evalExprTokens(node.value, scope);
        if (Array.isArray(rhs) && containsArrayReference(rhs, found.value)) {
          throw new Error("Cyclic self-referential array assignment is not allowed");
        }
        if (node.op === "=") {
          found.value[indexVal] = rhs;
        } else if (node.op === "+=") {
          const cur = found.value[indexVal];
          if (typeof cur === "string" || typeof rhs === "string") {
            const combined = `${formatRuntimeVal(cur)}${formatRuntimeVal(rhs)}`;
            guards.checkStringLength(combined.length);
            found.value[indexVal] = combined;
          } else {
            found.value[indexVal] = Number(cur) + Number(rhs);
          }
        } else {
          found.value[indexVal] = Number(found.value[indexVal]) - Number(rhs);
        }
        break;
      }
      case "Call": {
        if (node.concept === "input") {
          const prompt = node.args[0] ? formatRuntimeVal(evalArg(node.args[0], scope)) : "";
          consumeInput(prompt);
          break;
        }
        if (node.concept === "push" || node.name === "push") {
          const vals2 = node.args.map((a) => evalArg(a, scope));
          const list = vals2[0];
          if (!Array.isArray(list)) {
            throw new Error(`First argument of '${node.name}' must be a list`);
          }
          safePushToArray(list, vals2.slice(1), guards);
          checkLiveMemory();
          break;
        }
        const vals = node.args.map((a) => evalArg(a, scope));
        callNamedFunction(node.name, node.concept, vals);
        break;
      }
      case "If": {
        const cond = Boolean(evalExprTokens(node.test.tokens, scope));
        if (cond) {
          for (const stmt of node.then) runNode(stmt, scope);
        } else if (node.else) {
          for (const stmt of node.else) runNode(stmt, scope);
        }
        break;
      }
      case "While": {
        let iterations = 0;
        while (Boolean(evalExprTokens(node.test.tokens, scope))) {
          iterations++;
          if (iterations > MAX_LOOP_ITERATIONS) {
            throw new Error(`While loop exceeded ${MAX_LOOP_ITERATIONS} iterations`);
          }
          for (const stmt of node.body) runNode(stmt, scope);
        }
        break;
      }
      case "For": {
        if (node.variant === "range" && node.iterator && node.start && node.end) {
          const startNum = Math.trunc(Number(evalExprTokens(node.start, scope)));
          const endNum = Math.trunc(Number(evalExprTokens(node.end, scope)));
          if (!Number.isFinite(startNum) || !Number.isFinite(endNum)) {
            throw new Error("For-range bounds must be numbers");
          }
          let iterations = 0;
          const stepDir = startNum <= endNum ? 1 : -1;
          for (let val = startNum; stepDir > 0 ? val <= endNum : val >= endNum; val += stepDir) {
            iterations++;
            if (iterations > MAX_LOOP_ITERATIONS) {
              throw new Error(`For loop exceeded ${MAX_LOOP_ITERATIONS} iterations`);
            }
            assignVar(scope, node.iterator, val, false);
            for (const stmt of node.body) runNode(stmt, scope);
          }
        } else if (node.variant === "each" && node.iterator && node.iterable) {
          const col = evalExprTokens(node.iterable, scope);
          const items = Array.isArray(col) ? [...col] : typeof col === "string" ? col.split("") : [];
          if (!Array.isArray(col) && typeof col !== "string") {
            throw new Error("For-each loop requires a list or string");
          }
          let iterations = 0;
          for (const item of items) {
            iterations++;
            if (iterations > MAX_LOOP_ITERATIONS) {
              throw new Error(`For loop exceeded ${MAX_LOOP_ITERATIONS} iterations`);
            }
            assignVar(scope, node.iterator, item, false);
            for (const stmt of node.body) runNode(stmt, scope);
          }
        } else if (node.variant === "cstyle") {
          const loopScope = { vars: /* @__PURE__ */ new Map(), parent: scope };
          if (node.init) runNode(node.init, loopScope);
          let iterations = 0;
          while (!node.test || Boolean(evalExprTokens(node.test, loopScope))) {
            iterations++;
            if (iterations > MAX_LOOP_ITERATIONS) {
              throw new Error(`For loop exceeded ${MAX_LOOP_ITERATIONS} iterations`);
            }
            for (const stmt of node.body) runNode(stmt, loopScope);
            if (node.step) runNode(node.step, loopScope);
          }
        }
        break;
      }
    }
  }
  const t0 = performance.now();
  try {
    runNode(ast, rootScope);
    const estBytes = checkLiveMemory();
    const executionMs = Math.max(0.01, performance.now() - t0);
    const warnings = warningSet.size > 0 ? Array.from(warningSet) : void 0;
    return {
      ok: true,
      outputs,
      ...warnings ? { warnings } : {},
      steps,
      executionMs,
      variablesCount: rootScope.vars.size,
      estimatedMemoryBytes: estBytes
    };
  } catch (err) {
    const executionMs = Math.max(0.01, performance.now() - t0);
    const estBytes = estimateRuntimeMemoryBytes(rootScope, outputs, steps);
    const warnings = warningSet.size > 0 ? Array.from(warningSet) : void 0;
    if (err instanceof InputAwaitSignal) {
      return {
        ok: false,
        outputs,
        ...warnings ? { warnings } : {},
        awaitingInput: {
          prompt: err.prompt,
          collectedCount: err.collectedCount
        },
        steps,
        executionMs,
        variablesCount: rootScope.vars.size,
        estimatedMemoryBytes: estBytes
      };
    }
    return {
      ok: false,
      outputs,
      ...warnings ? { warnings } : {},
      error: err instanceof Error ? err.message : String(err),
      steps,
      executionMs,
      variablesCount: rootScope.vars.size,
      estimatedMemoryBytes: estBytes
    };
  }
}
function traceExecutionAst(ast, maxEvents = 60, options) {
  const outputs = [];
  const rootScope = { vars: /* @__PURE__ */ new Map(), parent: null };
  const functions = /* @__PURE__ */ new Map();
  const trace = [];
  const callStack = [];
  const warningSet = /* @__PURE__ */ new Set();
  const guards = createSandboxGuards(warningSet);
  const inputs = options?.inputs ?? [];
  let inputIdx = 0;
  let steps = 0;
  hoistFunctions(ast, functions);
  const snapVars = (scope) => {
    const merged = /* @__PURE__ */ new Map();
    const chain = [];
    let cur = scope;
    while (cur) {
      chain.unshift(cur);
      cur = cur.parent;
    }
    for (const frame of chain) {
      for (const [k, v] of frame.vars.entries()) {
        if (!FORBIDDEN_PROTO_KEYS.has(k)) {
          merged.set(k, v);
        }
      }
    }
    const out = /* @__PURE__ */ Object.create(null);
    for (const [k, v] of merged.entries()) {
      out[k] = formatRuntimeVal(v);
    }
    return out;
  };
  const record = (kind, summary, scope) => {
    if (trace.length >= maxEvents) return;
    trace.push({
      step: trace.length + 1,
      kind,
      summary: summary.length > 500 ? `${summary.slice(0, 500)}...` : summary,
      varsSnapshot: snapVars(scope),
      outputsSnapshot: [...outputs],
      callStack: [...callStack]
    });
  };
  const consumeInput = (prompt) => {
    if (inputIdx < inputs.length) {
      const val = parseUserInputValue(inputs[inputIdx]);
      inputIdx++;
      record("input", `input("${prompt}") -> ${formatRuntimeVal(val)}`, rootScope);
      return val;
    }
    throw new InputAwaitSignal(prompt, inputIdx);
  };
  const { evalExprTokens, evalArg } = createEvaluator(
    (name, concept, args) => callNamedFunction(name, concept, args, rootScope),
    consumeInput,
    guards
  );
  function callNamedFunction(name, concept, args, callerScope) {
    if (concept === "print" || concept === "log" || concept === "console.log") {
      const line = args.map((v) => formatRuntimeVal(v)).join(" ");
      guards.checkStringLength(line.length);
      outputs.push(line);
      guards.checkOutputCount(outputs.length);
      record("print", `${name}("${line}")`, callerScope);
      return null;
    }
    assertSafeIdentifier(name);
    const fnDecl = functions.get(name);
    if (!fnDecl) {
      throw new Error(`Function '${name}' is not defined in playground runtime`);
    }
    guards.checkCallDepth(callStack.length);
    const fnScope = { vars: /* @__PURE__ */ new Map(), parent: rootScope };
    for (let i = 0; i < fnDecl.params.length; i++) {
      assertSafeIdentifier(fnDecl.params[i]);
      fnScope.vars.set(fnDecl.params[i], i < args.length ? args[i] : null);
    }
    const callSummary = `${name}(${args.map((a) => formatRuntimeVal(a)).join(", ")})`;
    callStack.push(name);
    record("call", `call ${callSummary}`, fnScope);
    try {
      for (const stmt of fnDecl.body) {
        runNode(stmt, fnScope);
      }
      return null;
    } catch (sig) {
      if (sig instanceof ReturnSignal) {
        record("return", `return ${formatRuntimeVal(sig.value)}`, fnScope);
        return sig.value;
      }
      throw sig;
    } finally {
      callStack.pop();
    }
  }
  function runNode(node, scope) {
    steps++;
    guards.checkSteps(steps);
    switch (node.type) {
      case "Program":
        for (const stmt of node.body) runNode(stmt, scope);
        break;
      case "FunctionDecl":
        assertSafeIdentifier(node.name);
        functions.set(node.name, node);
        record("fn", `fn ${node.name}(${node.params.join(", ")})`, scope);
        break;
      case "Return": {
        const val = node.value ? evalExprTokens(node.value, scope) : null;
        throw new ReturnSignal(val);
      }
      case "VarAssign": {
        const val = evalExprTokens(node.value, scope);
        assignVar(scope, node.name, val, node.isDeclaration);
        record(
          Array.isArray(val) ? "array" : "assign",
          `${node.name} = ${formatRuntimeVal(val)}`,
          scope
        );
        break;
      }
      case "IndexAssign": {
        const found = lookupVar(scope, node.target);
        if (!found.found || !Array.isArray(found.value)) {
          throw new Error(`Variable '${node.target}' is not a list`);
        }
        const indexVal = Math.trunc(Number(evalExprTokens(node.index, scope)));
        if (!Number.isFinite(indexVal) || indexVal < 0 || indexVal >= found.value.length) {
          throw new Error(`Array index ${indexVal} out of bounds`);
        }
        const rhs = evalExprTokens(node.value, scope);
        if (Array.isArray(rhs) && containsArrayReference(rhs, found.value)) {
          throw new Error("Cyclic self-referential array assignment is not allowed");
        }
        found.value[indexVal] = node.op === "=" ? rhs : node.op === "+=" ? typeof found.value[indexVal] === "string" || typeof rhs === "string" ? `${formatRuntimeVal(found.value[indexVal])}${formatRuntimeVal(rhs)}` : Number(found.value[indexVal]) + Number(rhs) : Number(found.value[indexVal]) - Number(rhs);
        record("array", `${node.target}[${indexVal}] ${node.op} ${formatRuntimeVal(rhs)}`, scope);
        break;
      }
      case "Call": {
        if (node.concept === "input") {
          const prompt = node.args[0] ? formatRuntimeVal(evalArg(node.args[0], scope)) : "";
          consumeInput(prompt);
          break;
        }
        if (node.concept === "push" || node.name === "push") {
          const vals2 = node.args.map((a) => evalArg(a, scope));
          const list = vals2[0];
          if (Array.isArray(list)) {
            safePushToArray(list, vals2.slice(1), guards);
            record(
              "array",
              `${node.name}(..., ${vals2.slice(1).map((item) => formatRuntimeVal(item)).join(", ")})`,
              scope
            );
          }
          break;
        }
        const vals = node.args.map((a) => evalArg(a, scope));
        callNamedFunction(node.name, node.concept, vals, scope);
        break;
      }
      case "If": {
        const cond = Boolean(evalExprTokens(node.test.tokens, scope));
        const exprText = node.test.tokens.map((t) => t.value).join(" ");
        record("if", `if (${exprText}) -> ${cond ? "true" : "false"}`, scope);
        if (cond) {
          for (const stmt of node.then) runNode(stmt, scope);
        } else if (node.else) {
          for (const stmt of node.else) runNode(stmt, scope);
        }
        break;
      }
      case "While": {
        let iterations = 0;
        const exprText = node.test.tokens.map((t) => t.value).join(" ");
        while (Boolean(evalExprTokens(node.test.tokens, scope))) {
          iterations++;
          if (iterations > MAX_LOOP_ITERATIONS) {
            throw new Error(`While loop exceeded ${MAX_LOOP_ITERATIONS} iterations`);
          }
          record("while", `while (${exprText}) #${iterations}`, scope);
          for (const stmt of node.body) runNode(stmt, scope);
        }
        break;
      }
      case "For": {
        if (node.variant === "range" && node.iterator && node.start && node.end) {
          const startNum = Math.trunc(Number(evalExprTokens(node.start, scope)));
          const endNum = Math.trunc(Number(evalExprTokens(node.end, scope)));
          const stepDir = startNum <= endNum ? 1 : -1;
          let iterations = 0;
          for (let val = startNum; stepDir > 0 ? val <= endNum : val >= endNum; val += stepDir) {
            iterations++;
            if (iterations > MAX_LOOP_ITERATIONS) break;
            assignVar(scope, node.iterator, val, false);
            record("for", `for ${node.iterator} = ${val}`, scope);
            for (const stmt of node.body) runNode(stmt, scope);
          }
        } else if (node.variant === "each" && node.iterator && node.iterable) {
          const col = evalExprTokens(node.iterable, scope);
          const items = Array.isArray(col) ? [...col] : typeof col === "string" ? col.split("") : [];
          let iterations = 0;
          for (const item of items) {
            iterations++;
            if (iterations > MAX_LOOP_ITERATIONS) break;
            assignVar(scope, node.iterator, item, false);
            record("for", `for ${node.iterator} = ${formatRuntimeVal(item)}`, scope);
            for (const stmt of node.body) runNode(stmt, scope);
          }
        } else if (node.variant === "cstyle") {
          const loopScope = { vars: /* @__PURE__ */ new Map(), parent: scope };
          if (node.init) runNode(node.init, loopScope);
          let iterations = 0;
          while (!node.test || Boolean(evalExprTokens(node.test, loopScope))) {
            iterations++;
            if (iterations > MAX_LOOP_ITERATIONS) break;
            record("for", `for #${iterations}`, loopScope);
            for (const stmt of node.body) runNode(stmt, loopScope);
            if (node.step) runNode(node.step, loopScope);
          }
        }
        break;
      }
    }
  }
  try {
    runNode(ast, rootScope);
  } catch {
  }
  return trace;
}

// src/core/lexer.ts
var MAX_SOURCE_CHARS = 5e4;
var MAX_TOKENS = 12e3;
var MAX_STRING_LITERAL_CHARS = 16384;
var TWO_CHAR_OPS = /* @__PURE__ */ new Set(["==", "!=", "<=", ">=", "&&", "||", "+=", "-="]);
var ONE_CHAR_OPS = /* @__PURE__ */ new Set(["+", "-", "*", "/", "%", "=", "<", ">", "!"]);
var SYMBOLS = /* @__PURE__ */ new Set(["(", ")", "{", "}", "[", "]", ",", ";", ":", "\u060C", "\u061B"]);
function isWhitespace(ch) {
  return ch === " " || ch === "	" || ch === "\r" || ch === "\n";
}
function isDigit(ch) {
  return ch >= "0" && ch <= "9";
}
function isLetterOrUnicodeWord(ch) {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  if (code >= 65 && code <= 90 || code >= 97 && code <= 122 || code === 95) {
    return true;
  }
  if (code >= 192 && code <= 591) return true;
  if (code >= 1536 && code <= 1791 || code >= 1872 && code <= 1919 || code >= 2208 && code <= 2303) {
    return true;
  }
  if (code >= 11568 && code <= 11647) return true;
  return false;
}
function lex(source) {
  if (source.length > MAX_SOURCE_CHARS) {
    throw new Error(`Source code exceeds maximum safe size (${MAX_SOURCE_CHARS} characters)`);
  }
  if (containsTrojanOrControlChars(source, { allowNewlines: true })) {
    const lines = source.split("\n");
    const badLine = lines.findIndex((ln) => containsTrojanOrControlChars(ln, { allowNewlines: true }));
    throw new Error(
      `Hidden bidirectional override or unsafe control character detected at line ${badLine >= 0 ? badLine + 1 : 1}`
    );
  }
  const tokens = [];
  let i = 0;
  let line = 1;
  let column = 1;
  const len = source.length;
  const pushToken = (tok) => {
    if (tokens.length >= MAX_TOKENS) {
      throw new Error(`Maximum token limit (${MAX_TOKENS}) exceeded at line ${tok.line}`);
    }
    tokens.push(tok);
  };
  while (i < len) {
    const ch = source[i];
    if (ch === "\n") {
      i++;
      line++;
      column = 1;
      continue;
    }
    if (isWhitespace(ch)) {
      i++;
      column++;
      continue;
    }
    if (ch === "/" && source[i + 1] === "/" || ch === "#") {
      while (i < len && source[i] !== "\n") {
        i++;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const startLine = line;
      const startCol = column;
      i++;
      column++;
      let value = "";
      let closed = false;
      while (i < len) {
        const cur = source[i];
        if (cur === "\\" && i + 1 < len) {
          const next = source[i + 1];
          if (next === "n") value += "\n";
          else if (next === "r") value += "\r";
          else if (next === "t") value += "	";
          else if (next === '"') value += '"';
          else if (next === "'") value += "'";
          else if (next === "\\") value += "\\";
          else value += next;
          i += 2;
          column += 2;
        } else if (cur === quote) {
          closed = true;
          i++;
          column++;
          break;
        } else if (cur === "\n") {
          throw new Error(`Unterminated string literal at line ${startLine}`);
        } else {
          value += cur;
          i++;
          column++;
        }
        if (value.length > MAX_STRING_LITERAL_CHARS) {
          throw new Error(
            `String literal exceeds maximum length (${MAX_STRING_LITERAL_CHARS}) at line ${startLine}`
          );
        }
      }
      if (!closed) {
        throw new Error(`Unterminated string literal at line ${startLine}`);
      }
      pushToken({ type: "STRING", value, line: startLine, column: startCol });
      continue;
    }
    if (isLetterOrUnicodeWord(ch) || isDigit(ch)) {
      const startCol = column;
      let raw = "";
      let hasLetter = false;
      let hasDot = false;
      while (i < len) {
        const cur = source[i];
        if (isLetterOrUnicodeWord(cur)) {
          hasLetter = true;
          raw += cur;
          i++;
          column++;
        } else if (isDigit(cur)) {
          raw += cur;
          i++;
          column++;
        } else if (cur === "." && !hasLetter && !hasDot && i + 1 < len && isDigit(source[i + 1])) {
          hasDot = true;
          raw += cur;
          i++;
          column++;
        } else {
          break;
        }
      }
      pushToken({
        type: hasLetter ? "IDENT" : "NUMBER",
        value: raw,
        line,
        column: startCol
      });
      continue;
    }
    const two = source.slice(i, i + 2);
    if (TWO_CHAR_OPS.has(two)) {
      pushToken({ type: "OP", value: two, line, column });
      i += 2;
      column += 2;
      continue;
    }
    if (ONE_CHAR_OPS.has(ch)) {
      pushToken({ type: "OP", value: ch, line, column });
      i++;
      column++;
      continue;
    }
    if (ch === "." && source[i + 1] === ".") {
      pushToken({ type: "SYMBOL", value: "..", line, column });
      i += 2;
      column += 2;
      continue;
    }
    if (ch === ".") {
      pushToken({ type: "SYMBOL", value: ".", line, column });
      i++;
      column++;
      continue;
    }
    if (SYMBOLS.has(ch)) {
      const normalizedSym = ch === "\u060C" ? "," : ch === "\u061B" ? ";" : ch;
      pushToken({ type: "SYMBOL", value: normalizedSym, line, column });
      i++;
      column++;
      continue;
    }
    throw new Error(`Unexpected character '${ch}' at line ${line}, column ${column}`);
  }
  tokens.push({ type: "EOF", value: "", line, column });
  return tokens;
}

// src/core/normalizer.ts
function normalizeWord(word) {
  return word.trim().toLowerCase();
}
function normalizeTokens(tokens, keywords) {
  const lowerKeywords = /* @__PURE__ */ new Map();
  for (const [k, v] of Object.entries(keywords)) {
    lowerKeywords.set(normalizeWord(k), v);
  }
  const out = [];
  let i = 0;
  while (i < tokens.length) {
    const cur = tokens[i];
    if (cur.type === "EOF") {
      out.push(cur);
      break;
    }
    const next = tokens[i + 1];
    if (cur.type === "IDENT" && next && next.type === "IDENT" && cur.line === next.line) {
      const phrase = `${normalizeWord(cur.value)} ${normalizeWord(next.value)}`;
      const phraseConcept = lowerKeywords.get(phrase);
      if (phraseConcept) {
        out.push({
          type: "IDENT",
          value: `${cur.value} ${next.value}`,
          line: cur.line,
          column: cur.column,
          concept: phraseConcept
        });
        i += 2;
        continue;
      }
    }
    if (cur.type === "IDENT") {
      const concept = lowerKeywords.get(normalizeWord(cur.value));
      if (concept) {
        out.push({ ...cur, concept });
        i++;
        continue;
      }
    }
    out.push(cur);
    i++;
  }
  return out;
}

// src/core/program.ts
var MAX_AST_DEPTH = 48;
var MAX_EXPR_DEPTH = 48;
var CONTEXTUAL_IN_WORDS = /* @__PURE__ */ new Set(["in", "fi", "\u0641\u064A", "f", "deg", "g"]);
function assertSafeIdentifier2(name, line) {
  if (FORBIDDEN_PROTO_KEYS.has(name)) {
    throw new Error(`Reserved identifier '${name}' is not allowed at line ${line}`);
  }
}
function toExprTokens(tokens) {
  return tokens.map((t) => ({
    type: t.type,
    value: t.value,
    concept: t.concept
  }));
}
function classifyArg(tokens) {
  if (tokens.length === 1) {
    const t = tokens[0];
    if (t.type === "STRING") {
      return { type: "StringLiteral", value: t.value };
    }
    if (t.type === "NUMBER") {
      return { type: "NumberLiteral", value: Number(t.value) };
    }
    if (t.type === "IDENT") {
      return { type: "Identifier", name: t.value, concept: t.concept };
    }
  }
  return { type: "RawExpr", tokens: toExprTokens(tokens) };
}
function stripOuterParens(tokens) {
  let current = tokens;
  while (current.length >= 2 && current[0].type === "SYMBOL" && current[0].value === "(" && current[current.length - 1].type === "SYMBOL" && current[current.length - 1].value === ")") {
    let depth = 0;
    let wrapsWhole = true;
    for (let i = 0; i < current.length; i++) {
      if (current[i].type === "SYMBOL" && current[i].value === "(") depth++;
      if (current[i].type === "SYMBOL" && current[i].value === ")") depth--;
      if (depth === 0 && i < current.length - 1) {
        wrapsWhole = false;
        break;
      }
    }
    if (!wrapsWhole) break;
    current = current.slice(1, -1);
  }
  return current;
}
var ProgramParser = class _ProgramParser {
  constructor(tokens, initialDepth = 0) {
    this.pos = 0;
    this.astDepth = 0;
    this.tokens = tokens;
    this.astDepth = initialDepth;
  }
  enterDepth(line) {
    this.astDepth++;
    if (this.astDepth > MAX_AST_DEPTH) {
      throw new Error(`Maximum block nesting depth (${MAX_AST_DEPTH}) exceeded at line ${line}`);
    }
  }
  leaveDepth() {
    if (this.astDepth > 0) this.astDepth--;
  }
  peek(offset = 0) {
    return this.tokens[this.pos + offset] ?? this.tokens[this.tokens.length - 1];
  }
  isAtEnd() {
    return this.peek().type === "EOF";
  }
  advance() {
    const t = this.peek();
    if (!this.isAtEnd()) this.pos++;
    return t;
  }
  checkSymbol(sym) {
    const t = this.peek();
    return t.type === "SYMBOL" && t.value === sym;
  }
  matchSymbol(sym) {
    if (this.checkSymbol(sym)) {
      this.advance();
      return true;
    }
    return false;
  }
  expectSymbol(sym, msg) {
    if (this.matchSymbol(sym)) return this.tokens[this.pos - 1];
    const t = this.peek();
    throw new Error(`${msg} (line ${t.line})`);
  }
  skipSemicolons() {
    while (this.matchSymbol(";")) {
    }
  }
  parse() {
    const body = [];
    this.skipSemicolons();
    while (!this.isAtEnd()) {
      body.push(this.statement());
      this.skipSemicolons();
    }
    return { type: "Program", body };
  }
  readConditionTokens(keywordLine) {
    const collected = [];
    let parenDepth = 0;
    let bracketDepth = 0;
    while (!this.isAtEnd()) {
      const t = this.peek();
      if (t.type === "SYMBOL" && t.value === "{" && parenDepth === 0 && bracketDepth === 0) {
        break;
      }
      if (t.type === "SYMBOL" && t.value === "(") {
        parenDepth++;
        if (parenDepth > MAX_EXPR_DEPTH) {
          throw new Error(`Maximum expression nesting depth (${MAX_EXPR_DEPTH}) exceeded at line ${t.line}`);
        }
      }
      if (t.type === "SYMBOL" && t.value === ")") {
        parenDepth--;
        if (parenDepth < 0) {
          throw new Error(`Unexpected ')' in condition at line ${t.line}`);
        }
      }
      if (t.type === "SYMBOL" && t.value === "[") {
        bracketDepth++;
        if (bracketDepth > MAX_EXPR_DEPTH) {
          throw new Error(`Maximum bracket nesting depth (${MAX_EXPR_DEPTH}) exceeded at line ${t.line}`);
        }
      }
      if (t.type === "SYMBOL" && t.value === "]") {
        bracketDepth--;
        if (bracketDepth < 0) {
          throw new Error(`Unexpected ']' in condition at line ${t.line}`);
        }
      }
      collected.push(this.advance());
    }
    if (parenDepth !== 0) {
      throw new Error(`Unclosed '(' in condition starting at line ${keywordLine}`);
    }
    if (bracketDepth !== 0) {
      throw new Error(`Unclosed '[' in condition starting at line ${keywordLine}`);
    }
    if (collected.length === 0) {
      throw new Error(`Empty condition before '{' at line ${keywordLine}`);
    }
    return stripOuterParens(collected);
  }
  readStatementExprTokens(startLine) {
    const valueTokens = [];
    let parenDepth = 0;
    let bracketDepth = 0;
    while (!this.isAtEnd()) {
      const t = this.peek();
      if (t.type === "SYMBOL" && t.value === ";" && parenDepth === 0 && bracketDepth === 0) {
        this.advance();
        break;
      }
      if (t.type === "SYMBOL" && t.value === "}" && parenDepth === 0 && bracketDepth === 0) {
        break;
      }
      if (t.line !== startLine && parenDepth === 0 && bracketDepth === 0) {
        break;
      }
      if (t.type === "SYMBOL" && t.value === "(") {
        parenDepth++;
        if (parenDepth > MAX_EXPR_DEPTH) {
          throw new Error(`Maximum expression nesting depth (${MAX_EXPR_DEPTH}) exceeded at line ${t.line}`);
        }
      }
      if (t.type === "SYMBOL" && t.value === ")") parenDepth--;
      if (t.type === "SYMBOL" && t.value === "[") {
        bracketDepth++;
        if (bracketDepth > MAX_EXPR_DEPTH) {
          throw new Error(`Maximum bracket nesting depth (${MAX_EXPR_DEPTH}) exceeded at line ${t.line}`);
        }
      }
      if (t.type === "SYMBOL" && t.value === "]") bracketDepth--;
      valueTokens.push(this.advance());
    }
    if (parenDepth !== 0) {
      throw new Error(`Unclosed '(' in expression starting at line ${startLine}`);
    }
    if (bracketDepth !== 0) {
      throw new Error(`Unclosed '[' in expression starting at line ${startLine}`);
    }
    return valueTokens;
  }
  parseBlock(openLine) {
    this.expectSymbol("{", `Expected '{' to start block`);
    this.enterDepth(openLine);
    try {
      const stmts = [];
      this.skipSemicolons();
      while (!this.checkSymbol("}") && !this.isAtEnd()) {
        stmts.push(this.statement());
        this.skipSemicolons();
      }
      if (!this.matchSymbol("}")) {
        throw new Error(`Unclosed '{' block started at line ${openLine}`);
      }
      return stmts;
    } finally {
      this.leaveDepth();
    }
  }
  parseIfStatement() {
    const ifToken = this.advance();
    this.enterDepth(ifToken.line);
    try {
      const condTokens = this.readConditionTokens(ifToken.line);
      const thenBranch = this.parseBlock(ifToken.line);
      let elseBranch;
      const next = this.peek();
      if (next.type === "IDENT" && next.concept === "else_if") {
        elseBranch = [this.parseIfStatement()];
      } else if (next.type === "IDENT" && next.concept === "else") {
        const elseToken = this.advance();
        const afterElse = this.peek();
        if (afterElse.type === "IDENT" && afterElse.concept === "if") {
          elseBranch = [this.parseIfStatement()];
        } else {
          elseBranch = this.parseBlock(elseToken.line);
        }
      }
      return {
        type: "If",
        test: { tokens: toExprTokens(condTokens) },
        then: thenBranch,
        else: elseBranch
      };
    } finally {
      this.leaveDepth();
    }
  }
  parseWhileStatement() {
    const whileToken = this.advance();
    const condTokens = this.readConditionTokens(whileToken.line);
    const body = this.parseBlock(whileToken.line);
    return {
      type: "While",
      test: { tokens: toExprTokens(condTokens) },
      body
    };
  }
  parseForStatement() {
    const forToken = this.advance();
    const header = this.readConditionTokens(forToken.line);
    const parts = [[]];
    let pDepth = 0;
    let bDepth = 0;
    for (const tok of header) {
      if (tok.type === "SYMBOL" && tok.value === "(") pDepth++;
      else if (tok.type === "SYMBOL" && tok.value === ")") pDepth--;
      else if (tok.type === "SYMBOL" && tok.value === "[") bDepth++;
      else if (tok.type === "SYMBOL" && tok.value === "]") bDepth--;
      if (tok.type === "SYMBOL" && tok.value === ";" && pDepth === 0 && bDepth === 0) {
        parts.push([]);
      } else {
        parts[parts.length - 1].push(tok);
      }
    }
    if (parts.length > 1) {
      if (parts.length !== 3) {
        throw new Error(`Expected 'for (init; test; step)' with 2 semicolons at line ${forToken.line}`);
      }
      const parseMiniStmt = (seg) => {
        if (seg.length === 0) return null;
        const eofTok = { type: "EOF", value: "", line: seg[seg.length - 1].line, column: 1 };
        const mini = new _ProgramParser([...seg, eofTok], this.astDepth);
        return mini.statement();
      };
      const init = parseMiniStmt(parts[0]);
      const test = parts[1].length > 0 ? toExprTokens(parts[1]) : null;
      const step = parseMiniStmt(parts[2]);
      const body = this.parseBlock(forToken.line);
      return {
        type: "For",
        variant: "cstyle",
        init,
        test,
        step,
        body
      };
    }
    if (header.length >= 3 && header[0].type === "IDENT" && (header[1].type === "IDENT" && (header[1].concept === "in" || CONTEXTUAL_IN_WORDS.has(header[1].value.toLowerCase())) || header[1].type === "SYMBOL" && header[1].value === ":")) {
      const iterator = header[0].value;
      assertSafeIdentifier2(iterator, header[0].line);
      const rhs = header.slice(2);
      let pd = 0;
      let bd = 0;
      let dotDotIdx = -1;
      for (let i = 0; i < rhs.length; i++) {
        const tok = rhs[i];
        if (tok.type === "SYMBOL" && tok.value === "(") pd++;
        else if (tok.type === "SYMBOL" && tok.value === ")") pd--;
        else if (tok.type === "SYMBOL" && tok.value === "[") bd++;
        else if (tok.type === "SYMBOL" && tok.value === "]") bd--;
        else if (tok.type === "SYMBOL" && tok.value === ".." && pd === 0 && bd === 0) {
          dotDotIdx = i;
          break;
        }
      }
      const body = this.parseBlock(forToken.line);
      if (dotDotIdx >= 0) {
        const startToks = rhs.slice(0, dotDotIdx);
        const endToks = rhs.slice(dotDotIdx + 1);
        if (startToks.length === 0 || endToks.length === 0) {
          throw new Error(`Invalid range syntax '..' in loop at line ${forToken.line}`);
        }
        return {
          type: "For",
          variant: "range",
          iterator,
          start: toExprTokens(startToks),
          end: toExprTokens(endToks),
          body
        };
      }
      return {
        type: "For",
        variant: "each",
        iterator,
        iterable: toExprTokens(rhs),
        body
      };
    }
    throw new Error(`Invalid for-loop header at line ${forToken.line}`);
  }
  parseFunctionDecl() {
    const fnToken = this.advance();
    const nameToken = this.peek();
    if (nameToken.type !== "IDENT") {
      throw new Error(`Expected function name after '${fnToken.value}' at line ${fnToken.line}`);
    }
    assertSafeIdentifier2(nameToken.value, nameToken.line);
    this.advance();
    this.expectSymbol("(", `Expected '(' after function name '${nameToken.value}'`);
    const params = [];
    if (!this.checkSymbol(")")) {
      while (!this.isAtEnd()) {
        const pTok = this.peek();
        if (pTok.type !== "IDENT") {
          throw new Error(`Expected parameter name in '${nameToken.value}' at line ${pTok.line}`);
        }
        assertSafeIdentifier2(pTok.value, pTok.line);
        params.push(this.advance().value);
        if (!this.matchSymbol(",")) break;
      }
    }
    this.expectSymbol(")", `Expected ')' after parameters of '${nameToken.value}'`);
    const body = this.parseBlock(fnToken.line);
    return {
      type: "FunctionDecl",
      name: nameToken.value,
      params,
      body
    };
  }
  parseReturnStatement() {
    const retToken = this.advance();
    const next = this.peek();
    if (next.type === "EOF" || next.type === "SYMBOL" && (next.value === ";" || next.value === "}") || next.line !== retToken.line) {
      this.matchSymbol(";");
      return { type: "Return" };
    }
    const valueTokens = this.readStatementExprTokens(retToken.line);
    if (valueTokens.length === 0) {
      return { type: "Return" };
    }
    return { type: "Return", value: toExprTokens(valueTokens) };
  }
  readArgList(openParenLine, label) {
    this.expectSymbol("(", `Expected '(' after '${label}'`);
    const args = [];
    if (!this.checkSymbol(")")) {
      let currentArg = [];
      let parenDepth = 0;
      let bracketDepth = 0;
      while (!this.isAtEnd()) {
        const t = this.peek();
        if (t.type === "SYMBOL" && t.value === "(") {
          parenDepth++;
          if (parenDepth > MAX_EXPR_DEPTH) {
            throw new Error(`Maximum expression nesting depth (${MAX_EXPR_DEPTH}) exceeded at line ${t.line}`);
          }
          currentArg.push(this.advance());
          continue;
        }
        if (t.type === "SYMBOL" && t.value === ")") {
          if (parenDepth === 0 && bracketDepth === 0) {
            if (currentArg.length > 0) {
              args.push(classifyArg(currentArg));
            }
            break;
          }
          parenDepth--;
          currentArg.push(this.advance());
          continue;
        }
        if (t.type === "SYMBOL" && t.value === "[") {
          bracketDepth++;
          if (bracketDepth > MAX_EXPR_DEPTH) {
            throw new Error(`Maximum bracket nesting depth (${MAX_EXPR_DEPTH}) exceeded at line ${t.line}`);
          }
          currentArg.push(this.advance());
          continue;
        }
        if (t.type === "SYMBOL" && t.value === "]") {
          bracketDepth--;
          currentArg.push(this.advance());
          continue;
        }
        if (t.type === "SYMBOL" && t.value === "," && parenDepth === 0 && bracketDepth === 0) {
          if (currentArg.length === 0) {
            throw new Error(`Empty argument before ',' at line ${t.line}`);
          }
          args.push(classifyArg(currentArg));
          currentArg = [];
          this.advance();
          continue;
        }
        currentArg.push(this.advance());
      }
    }
    this.expectSymbol(")", `Unclosed call '${label}(' starting at line ${openParenLine}`);
    return args;
  }
  parseCallStatement(nameToken) {
    const args = this.readArgList(nameToken.line, nameToken.value);
    return {
      type: "Call",
      name: nameToken.value,
      concept: nameToken.concept,
      args
    };
  }
  tryFindBracketAssignOffset() {
    let offset = 1;
    let depth = 0;
    while (this.pos + offset < this.tokens.length) {
      const tok = this.peek(offset);
      if (tok.type === "EOF") return -1;
      if (tok.type === "SYMBOL" && tok.value === "[") depth++;
      else if (tok.type === "SYMBOL" && tok.value === "]") {
        depth--;
        if (depth === 0) {
          const after = this.peek(offset + 1);
          if (after.type === "OP" && (after.value === "=" || after.value === "+=" || after.value === "-=")) {
            return offset + 1;
          }
          return -1;
        }
      }
      offset++;
    }
    return -1;
  }
  parseIndexAssignStatement() {
    const targetToken = this.advance();
    assertSafeIdentifier2(targetToken.value, targetToken.line);
    this.expectSymbol("[", `Expected '[' after '${targetToken.value}'`);
    const indexTokens = [];
    let depth = 1;
    while (!this.isAtEnd() && depth > 0) {
      const t = this.peek();
      if (t.type === "SYMBOL" && t.value === "[") {
        depth++;
        if (depth > MAX_EXPR_DEPTH) {
          throw new Error(`Maximum bracket nesting depth (${MAX_EXPR_DEPTH}) exceeded at line ${t.line}`);
        }
        indexTokens.push(this.advance());
      } else if (t.type === "SYMBOL" && t.value === "]") {
        depth--;
        if (depth === 0) {
          this.advance();
          break;
        }
        indexTokens.push(this.advance());
      } else {
        indexTokens.push(this.advance());
      }
    }
    if (indexTokens.length === 0) {
      throw new Error(`Empty index expression for '${targetToken.value}[]' at line ${targetToken.line}`);
    }
    const opTok = this.advance();
    const op = opTok.value === "+=" || opTok.value === "-=" ? opTok.value : "=";
    const valueTokens = this.readStatementExprTokens(targetToken.line);
    if (valueTokens.length === 0) {
      throw new Error(`Expected expression after '${op}' at line ${targetToken.line}`);
    }
    return {
      type: "IndexAssign",
      target: targetToken.value,
      index: toExprTokens(indexTokens),
      op,
      value: toExprTokens(valueTokens)
    };
  }
  parseVarStatement(isDeclaration) {
    if (isDeclaration) {
      this.advance();
    }
    const nameToken = this.peek();
    if (nameToken.type !== "IDENT") {
      throw new Error(`Expected variable name at line ${nameToken.line}`);
    }
    assertSafeIdentifier2(nameToken.value, nameToken.line);
    this.advance();
    const op = this.peek();
    if (op.type !== "OP" || op.value !== "=" && op.value !== "+=" && op.value !== "-=") {
      throw new Error(`Expected '=' after '${nameToken.value}' at line ${op.line}`);
    }
    const opVal = op.value;
    this.advance();
    const valueTokens = this.readStatementExprTokens(nameToken.line);
    if (valueTokens.length === 0) {
      throw new Error(`Expected expression after '${opVal}' at line ${nameToken.line}`);
    }
    if (opVal === "+=" || opVal === "-=") {
      const binaryOp = opVal[0];
      const expanded = [
        { type: "IDENT", value: nameToken.value, concept: nameToken.concept },
        { type: "OP", value: binaryOp },
        { type: "SYMBOL", value: "(" },
        ...toExprTokens(valueTokens),
        { type: "SYMBOL", value: ")" }
      ];
      return {
        type: "VarAssign",
        name: nameToken.value,
        isDeclaration: false,
        value: expanded
      };
    }
    return {
      type: "VarAssign",
      name: nameToken.value,
      isDeclaration,
      value: toExprTokens(valueTokens)
    };
  }
  statement() {
    const t = this.peek();
    if (t.type === "IDENT" && t.concept === "if") {
      return this.parseIfStatement();
    }
    if (t.type === "IDENT" && t.concept === "while") {
      return this.parseWhileStatement();
    }
    if (t.type === "IDENT" && t.concept === "for") {
      return this.parseForStatement();
    }
    if (t.type === "IDENT" && (t.concept === "fn" || t.concept === "function")) {
      return this.parseFunctionDecl();
    }
    if (t.type === "IDENT" && t.concept === "return") {
      return this.parseReturnStatement();
    }
    if (t.type === "IDENT" && t.concept === "let") {
      return this.parseVarStatement(true);
    }
    if (t.type === "IDENT") {
      const next = this.peek(1);
      if (next.type === "SYMBOL" && next.value === "(") {
        const nameToken = this.advance();
        return this.parseCallStatement(nameToken);
      }
      if (next.type === "SYMBOL" && next.value === "." && this.peek(2).type === "IDENT" && this.peek(3).type === "SYMBOL" && this.peek(3).value === "(") {
        const objTok = this.advance();
        this.advance();
        const methodTok = this.advance();
        const methodArgs = this.readArgList(methodTok.line, `${objTok.value}.${methodTok.value}`);
        return {
          type: "Call",
          name: methodTok.value,
          concept: methodTok.concept ?? (methodTok.value === "push" ? "push" : void 0),
          args: [{ type: "Identifier", name: objTok.value, concept: objTok.concept }, ...methodArgs]
        };
      }
      if (next.type === "SYMBOL" && next.value === "[" && this.tryFindBracketAssignOffset() > 0) {
        return this.parseIndexAssignStatement();
      }
      if (next.type === "OP" && (next.value === "=" || next.value === "+=" || next.value === "-=")) {
        return this.parseVarStatement(false);
      }
      if ((t.concept === "print" || t.concept === "log") && (next.type === "STRING" || next.type === "NUMBER" || next.type === "IDENT" || next.type === "SYMBOL" && next.value === "[") && next.line === t.line) {
        const nameToken = this.advance();
        const argTokens = [];
        while (!this.isAtEnd() && this.peek().line === nameToken.line && !this.checkSymbol(";") && !this.checkSymbol("}")) {
          argTokens.push(this.advance());
        }
        return {
          type: "Call",
          name: nameToken.value,
          concept: nameToken.concept,
          args: argTokens.length > 0 ? [classifyArg(argTokens)] : []
        };
      }
    }
    throw new Error(`Unexpected token '${t.value || t.type}' at line ${t.line}`);
  }
};
function parseProgram(tokens) {
  return new ProgramParser(tokens).parse();
}

// src/core/telemetry.ts
var textEncoder = new TextEncoder();
function utf8ByteLength(text) {
  return textEncoder.encode(text).length;
}

// src/core/types.ts
var VALID_TARGETS = [
  "js",
  "py",
  "algo",
  "alif",
  "kalimat",
  "qalb",
  "c",
  "cpp",
  "java",
  "php"
];
var TARGET_META = {
  js: { label: "JS", ext: "js", rtl: false },
  py: { label: "PY", ext: "py", rtl: false },
  algo: { label: "\u0627\u0644\u062E\u0648\u0627\u0631\u0632\u0645\u064A\u0629", ext: "txt", rtl: true },
  alif: { label: "\u0623\u0644\u0641 (Alif)", ext: "alif", rtl: true },
  kalimat: { label: "\u0643\u0644\u0645\u0627\u062A (Kalimat)", ext: "kal", rtl: true },
  qalb: { label: "\u0642\u0644\u0628 (Qalb)", ext: "qlb", rtl: true },
  c: { label: "C", ext: "c", rtl: false },
  cpp: { label: "C++", ext: "cpp", rtl: false },
  java: { label: "Java", ext: "java", rtl: false },
  php: { label: "PHP", ext: "php", rtl: false }
};
function isRtlTarget(target) {
  return TARGET_META[target].rtl;
}
function isValidTarget(val) {
  return typeof val === "string" && VALID_TARGETS.includes(val);
}

// src/core/writers.ts
function isStandardArabicTarget(target) {
  return target === "algo" || target === "alif" || target === "kalimat";
}
function mapConceptWord(token, target) {
  const c = token.concept;
  if (!c) return token.value;
  if (c === "true") {
    if (target === "py") return "True";
    if (target === "qalb") return "\u0646\u0639\u0645";
    if (isStandardArabicTarget(target)) return "\u0635\u062D\u064A\u062D";
    if (target === "c") return "1";
    return "true";
  }
  if (c === "false") {
    if (target === "py") return "False";
    if (target === "qalb") return "\u0644\u0627";
    if (isStandardArabicTarget(target)) return "\u062E\u0637\u0623";
    if (target === "c") return "0";
    return "false";
  }
  if (c === "and") {
    if (target === "py") return "and";
    if (isStandardArabicTarget(target) || target === "qalb") return "\u0648";
    return "&&";
  }
  if (c === "or") {
    if (target === "py") return "or";
    if (isStandardArabicTarget(target) || target === "qalb") return "\u0623\u0648";
    return "||";
  }
  if (c === "not") {
    if (target === "py") return "not";
    if (isStandardArabicTarget(target) || target === "qalb") return "\u0644\u064A\u0633";
    return "!";
  }
  if (c === "input") {
    if (target === "js") return "prompt";
    if (target === "py") return "input";
    if (target === "php") return "readline";
    if (target === "alif") return "\u0625\u062F\u062E\u0627\u0644";
    if (target === "algo" || target === "kalimat" || target === "qalb") return "\u0627\u0642\u0631\u0623";
    if (target === "java") return "baydaInput";
    return "bayda_input";
  }
  if (c === "len") {
    if (target === "py") return "len";
    if (target === "php") return "count";
    if (isStandardArabicTarget(target) || target === "qalb") return "\u0637\u0648\u0644";
    return "len";
  }
  if (c === "push") {
    if (target === "py") return "append";
    if (target === "php") return "array_push";
    if (isStandardArabicTarget(target) || target === "qalb") return "\u0623\u0636\u0641";
    return "push";
  }
  return token.value;
}
function splitTopLevelCommas(tokens) {
  const groups = [];
  let current = [];
  let pDepth = 0;
  let bDepth = 0;
  for (const t of tokens) {
    if (t.type === "SYMBOL" && t.value === "(") pDepth++;
    else if (t.type === "SYMBOL" && t.value === ")") pDepth--;
    else if (t.type === "SYMBOL" && t.value === "[") bDepth++;
    else if (t.type === "SYMBOL" && t.value === "]") bDepth--;
    if (t.type === "SYMBOL" && t.value === "," && pDepth === 0 && bDepth === 0) {
      groups.push(current);
      current = [];
    } else {
      current.push(t);
    }
  }
  if (current.length > 0 || groups.length > 0) {
    groups.push(current);
  }
  return groups;
}
function findMatchingClose(tokens, openIdx, openChar, closeChar) {
  let depth = 0;
  for (let i = openIdx; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === "SYMBOL" && t.value === openChar) depth++;
    else if (t.type === "SYMBOL" && t.value === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return tokens.length - 1;
}
var MAX_RENDER_DEPTH = 48;
function renderQalbTokens(tokens) {
  if (tokens.length === 0) return "\u0644\u0627";
  let idx = 0;
  let exprDepth = 0;
  const enterExpr = () => {
    exprDepth++;
    if (exprDepth > MAX_RENDER_DEPTH) {
      throw new Error(`Maximum expression nesting depth (${MAX_RENDER_DEPTH}) exceeded`);
    }
  };
  const leaveExpr = () => {
    if (exprDepth > 0) exprDepth--;
  };
  const peek = () => tokens[idx];
  const consume = () => tokens[idx++];
  const parseOr = () => {
    let left = parseAnd();
    while (peek()?.type === "OP" && peek()?.value === "||" || peek()?.concept === "or") {
      consume();
      const right = parseAnd();
      left = `(\u0623\u0648 ${left} ${right})`;
    }
    return left;
  };
  const parseAnd = () => {
    let left = parseEquality();
    while (peek()?.type === "OP" && peek()?.value === "&&" || peek()?.concept === "and") {
      consume();
      const right = parseEquality();
      left = `(\u0648 ${left} ${right})`;
    }
    return left;
  };
  const parseEquality = () => {
    let left = parseComparison();
    while (peek()?.type === "OP" && (peek()?.value === "==" || peek()?.value === "!=")) {
      const op = consume().value === "==" ? "=" : "!=";
      const right = parseComparison();
      left = `(${op} ${left} ${right})`;
    }
    return left;
  };
  const parseComparison = () => {
    let left = parseAdditive();
    while (peek()?.type === "OP" && (peek()?.value === "<" || peek()?.value === ">" || peek()?.value === "<=" || peek()?.value === ">=")) {
      const op = consume().value;
      const right = parseAdditive();
      left = `(${op} ${left} ${right})`;
    }
    return left;
  };
  const parseAdditive = () => {
    let left = parseMultiplicative();
    while (peek()?.type === "OP" && (peek()?.value === "+" || peek()?.value === "-")) {
      const op = consume().value;
      const right = parseMultiplicative();
      left = `(${op} ${left} ${right})`;
    }
    return left;
  };
  const parseMultiplicative = () => {
    let left = parseUnary();
    while (peek()?.type === "OP" && (peek()?.value === "*" || peek()?.value === "/" || peek()?.value === "%")) {
      const op = consume().value;
      const right = parseUnary();
      left = `(${op} ${left} ${right})`;
    }
    return left;
  };
  const parseUnary = () => {
    const t = peek();
    if (t?.type === "OP" && t.value === "!" || t?.concept === "not") {
      consume();
      return `(\u0644\u064A\u0633 ${parseUnary()})`;
    }
    if (t?.type === "OP" && t.value === "-") {
      consume();
      return `(- 0 ${parseUnary()})`;
    }
    return parsePostfix();
  };
  const parsePostfix = () => {
    let val = parsePrimary();
    while (peek()?.type === "SYMBOL" && (peek()?.value === "[" || peek()?.value === ".")) {
      const sym = consume().value;
      if (sym === "[") {
        const indexExpr = parseOr();
        if (peek()?.type === "SYMBOL" && peek()?.value === "]") consume();
        val = `(\u0639\u0646\u0635\u0631 ${val} ${indexExpr})`;
      } else {
        const prop = peek();
        if (prop && prop.type === "IDENT") {
          consume();
          if (prop.value === "length" || prop.concept === "len") {
            val = `(\u0637\u0648\u0644 ${val})`;
          }
        }
      }
    }
    return val;
  };
  const parsePrimary = () => {
    const t = peek();
    if (!t) return "\u0644\u0627";
    if (t.type === "SYMBOL" && t.value === "(") {
      enterExpr();
      try {
        consume();
        const inner = parseOr();
        if (peek()?.type === "SYMBOL" && peek()?.value === ")") {
          consume();
        }
        return inner;
      } finally {
        leaveExpr();
      }
    }
    if (t.type === "SYMBOL" && t.value === "[") {
      enterExpr();
      try {
        consume();
        const elems = [];
        if (!(peek()?.type === "SYMBOL" && peek()?.value === "]")) {
          while (idx < tokens.length) {
            elems.push(parseOr());
            if (peek()?.type === "SYMBOL" && peek()?.value === ",") consume();
            else break;
          }
        }
        if (peek()?.type === "SYMBOL" && peek()?.value === "]") consume();
        return `(\u0645\u0635\u0641\u0648\u0641\u0629${elems.length ? " " + elems.join(" ") : ""})`;
      } finally {
        leaveExpr();
      }
    }
    consume();
    if (t.type === "STRING") return JSON.stringify(t.value);
    if (t.type === "NUMBER") return t.value;
    if (t.type === "IDENT") {
      if (peek()?.type === "SYMBOL" && peek()?.value === "(") {
        consume();
        const callArgs = [];
        if (!(peek()?.type === "SYMBOL" && peek()?.value === ")")) {
          while (idx < tokens.length) {
            callArgs.push(parseOr());
            if (peek()?.type === "SYMBOL" && peek()?.value === ",") consume();
            else break;
          }
        }
        if (peek()?.type === "SYMBOL" && peek()?.value === ")") consume();
        const fnName = mapConceptWord(t, "qalb");
        return `(${fnName}${callArgs.length ? " " + callArgs.join(" ") : ""})`;
      }
      return mapConceptWord(t, "qalb");
    }
    return t.value;
  };
  return parseOr();
}
function renderTokens(tokens, target, mapper, depth = 0) {
  if (depth > MAX_RENDER_DEPTH) {
    throw new Error(`Maximum expression nesting depth (${MAX_RENDER_DEPTH}) exceeded`);
  }
  if (target === "qalb" && !mapper) {
    return renderQalbTokens(tokens);
  }
  const parts = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const prev = i > 0 ? tokens[i - 1] : void 0;
    const isArrayLiteralOpen = t.type === "SYMBOL" && t.value === "[" && (!prev || prev.type !== "IDENT" && prev.value !== ")" && prev.value !== "]");
    if (isArrayLiteralOpen && !mapper) {
      const closeIdx = findMatchingClose(tokens, i, "[", "]");
      const inner = tokens.slice(i + 1, closeIdx);
      const elems = inner.length === 0 ? [] : splitTopLevelCommas(inner).map((g) => renderTokens(g, target, void 0, depth + 1));
      let renderedArr;
      if (target === "c" || target === "cpp") {
        renderedArr = `{${elems.join(", ")}}`;
      } else if (target === "java") {
        renderedArr = elems.length > 0 ? `new java.util.ArrayList<>(java.util.List.of(${elems.join(", ")}))` : "new java.util.ArrayList<>()";
      } else if (isStandardArabicTarget(target)) {
        renderedArr = `[${elems.join("\u060C ")}]`;
      } else {
        renderedArr = `[${elems.join(", ")}]`;
      }
      parts.push(parts.length === 0 ? renderedArr : " " + renderedArr);
      i = closeIdx;
      continue;
    }
    if (!mapper && t.type === "IDENT" && (t.concept === "len" || t.value === "len") && tokens[i + 1]?.type === "SYMBOL" && tokens[i + 1]?.value === "(") {
      const closeIdx = findMatchingClose(tokens, i + 1, "(", ")");
      const inner = tokens.slice(i + 2, closeIdx);
      const renderedArg = renderTokens(inner, target, void 0, depth + 1);
      let exprText;
      if (target === "py") exprText = `len(${renderedArg})`;
      else if (target === "php") exprText = `count(${renderedArg})`;
      else if (target === "js") exprText = `${renderedArg}.length`;
      else if (target === "java" || target === "cpp") exprText = `${renderedArg}.size()`;
      else if (target === "c") exprText = `(sizeof(${renderedArg}) / sizeof(${renderedArg}[0]))`;
      else exprText = `\u0637\u0648\u0644(${renderedArg})`;
      parts.push(parts.length === 0 ? exprText : " " + exprText);
      i = closeIdx;
      continue;
    }
    if (!mapper && t.type === "SYMBOL" && t.value === "." && tokens[i + 1]?.type === "IDENT" && (tokens[i + 1]?.value === "length" || tokens[i + 1]?.concept === "len") && parts.length > 0) {
      const targetExpr = parts.pop().trimStart();
      const leadSpace = parts.length > 0 ? " " : "";
      if (target === "py") parts.push(`${leadSpace}len(${targetExpr})`);
      else if (target === "php") parts.push(`${leadSpace}count(${targetExpr})`);
      else if (target === "java" || target === "cpp") parts.push(`${leadSpace}${targetExpr}.size()`);
      else if (target === "c") parts.push(`${leadSpace}(sizeof(${targetExpr}) / sizeof(${targetExpr}[0]))`);
      else if (isStandardArabicTarget(target)) parts.push(`${leadSpace}\u0637\u0648\u0644(${targetExpr})`);
      else parts.push(`${leadSpace}${targetExpr}.length`);
      i += 1;
      continue;
    }
    let text = "";
    if (t.type === "STRING") {
      text = JSON.stringify(t.value);
    } else if (t.type === "IDENT") {
      const mapped = mapper ? mapper(t) : mapConceptWord(t, target);
      text = target === "php" && !t.concept && tokens[i + 1]?.value !== "(" && prev?.value !== "." ? `$${mapped}` : mapped;
    } else {
      text = t.value;
    }
    if (parts.length === 0) {
      parts.push(text);
      continue;
    }
    const noSpaceBefore = t.value === ")" || t.value === "]" || t.value === "." || t.value === "," || (t.value === "(" || t.value === "[") && (prev.type === "IDENT" || prev.value === ")" || prev.value === "]");
    const noSpaceAfterPrev = prev.value === "(" || prev.value === "[" || prev.value === "." || prev.type === "OP" && prev.value === "!";
    if (noSpaceBefore || noSpaceAfterPrev) {
      parts.push(text);
    } else {
      parts.push(" " + text);
    }
  }
  return parts.join("");
}
function renderArg(arg, target) {
  switch (arg.type) {
    case "StringLiteral":
      return JSON.stringify(arg.value);
    case "NumberLiteral":
      return String(arg.value);
    case "Identifier": {
      const mapped = mapConceptWord({ type: "IDENT", value: arg.name, concept: arg.concept }, target);
      if (target === "php" && !arg.concept) return `$${mapped}`;
      return mapped;
    }
    case "RawExpr":
      return renderTokens(arg.tokens, target);
  }
}
function isPrintCall(node) {
  return node.concept === "print" || node.concept === "log" || node.concept === "console.log";
}
function hasReturnWithValue(nodes) {
  for (const n of nodes) {
    if (n.type === "Return" && n.value && n.value.length > 0) return true;
    if (n.type === "If") {
      if (hasReturnWithValue(n.then)) return true;
      if (n.else && hasReturnWithValue(n.else)) return true;
    }
    if (n.type === "While" || n.type === "For") {
      if (hasReturnWithValue(n.body)) return true;
    }
  }
  return false;
}
function isArrayInitTokens(tokens) {
  return tokens.length >= 2 && tokens[0].type === "SYMBOL" && tokens[0].value === "[";
}
function compileCPrintf(args) {
  if (args.length === 0) return 'printf("\\n");';
  if (args.length === 1) {
    const a = args[0];
    if (a.type === "StringLiteral") return `printf("%s\\n", ${JSON.stringify(a.value)});`;
    if (a.type === "NumberLiteral") return `printf("%g\\n", (double)${a.value});`;
  }
  const rendered = args.map((a) => renderArg(a, "c")).join(", ");
  const specs = args.map((a) => a.type === "StringLiteral" ? "%s" : "%g").join(" ");
  return `printf("${specs}\\n", ${rendered});`;
}
function compileVarAssignInline(node, target) {
  const val = renderTokens(node.value, target);
  if (target === "py") return `${node.name} = ${val}`;
  if (target === "php") return `$${node.name} = ${val}`;
  if (target === "c") {
    if (isArrayInitTokens(node.value)) return `double ${node.name}[] = ${val}`;
    const isStr = node.value.length === 1 && node.value[0].type === "STRING";
    return `${node.isDeclaration ? isStr ? "const char* " : "double " : ""}${node.name} = ${val}`;
  }
  if (target === "cpp") {
    if (isArrayInitTokens(node.value)) return `std::vector<double> ${node.name} = ${val}`;
    return `${node.isDeclaration ? "auto " : ""}${node.name} = ${val}`;
  }
  if (target === "java") return `${node.isDeclaration ? "var " : ""}${node.name} = ${val}`;
  return `${node.isDeclaration ? "let " : ""}${node.name} = ${val}`;
}
function compileNode(node, indentLevel, target) {
  if (indentLevel > MAX_RENDER_DEPTH + 4) {
    throw new Error(`Maximum compilation nesting depth exceeded`);
  }
  const indent = "  ".repeat(indentLevel);
  switch (node.type) {
    case "Program": {
      const innerIndent = target === "c" || target === "cpp" || target === "alif" ? 1 : target === "java" ? 2 : 0;
      const fnDecls = target === "c" || target === "cpp" || target === "java" || target === "alif" ? node.body.filter((n) => n.type === "FunctionDecl") : [];
      const mainStmts = target === "c" || target === "cpp" || target === "java" || target === "alif" ? node.body.filter((n) => n.type !== "FunctionDecl") : node.body;
      const body = mainStmts.map((n) => compileNode(n, innerIndent, target)).join("\n");
      const fnSection = fnDecls.map((fn) => compileNode(fn, target === "java" ? 1 : 0, target)).join("\n\n");
      const fnPrefix = fnSection ? `${fnSection}

` : "";
      if (target === "c") {
        return `#include <stdio.h>

${fnPrefix}int main(void) {
${body}
  return 0;
}`;
      }
      if (target === "cpp") {
        return `#include <iostream>

${fnPrefix}int main() {
${body}
  return 0;
}`;
      }
      if (target === "java") {
        return `public class BaydaProgram {
${fnPrefix}  public static void main(String[] args) {
${body}
  }
}`;
      }
      if (target === "php") {
        return `<?php
${body}`;
      }
      if (target === "alif") {
        return `#\u0623\u0644\u0641
${fnPrefix}\u062F\u0627\u0644\u0629 \u0631\u0626\u064A\u0633\u064A\u0629()
${body}
\u0646\u0647\u0627\u064A\u0629 \u062F\u0627\u0644\u0629`;
      }
      return body;
    }
    case "FunctionDecl": {
      const bodyIndent = target === "qalb" ? indentLevel + 2 : indentLevel + 1;
      const body = node.body.map((n) => compileNode(n, bodyIndent, target)).join("\n");
      const sep = isStandardArabicTarget(target) ? "\u060C " : ", ";
      if (target === "py") {
        const params2 = node.params.join(", ");
        return `${indent}def ${node.name}(${params2}):
${body || `${indent}  pass`}`;
      }
      if (target === "algo" || target === "alif") {
        const params2 = node.params.join(sep);
        return `${indent}\u062F\u0627\u0644\u0629 ${node.name}(${params2})
${body}
${indent}\u0646\u0647\u0627\u064A\u0629 \u062F\u0627\u0644\u0629`;
      }
      if (target === "kalimat") {
        const params2 = node.params.join(sep);
        return `${indent}\u0625\u062C\u0631\u0627\u0621 ${node.name}(${params2})
${body}
${indent}\u0646\u0647\u0627\u064A\u0629 \u0625\u062C\u0631\u0627\u0621`;
      }
      if (target === "qalb") {
        const params2 = node.params.join(" ");
        return `${indent}(\u062F\u0627\u0644\u0629 ${node.name} (${params2})
${indent}  (\u0646\u0641\u0630
${body}
${indent}  )
${indent})`;
      }
      if (target === "php") {
        const params2 = node.params.map((p) => `$${p}`).join(", ");
        return `${indent}function ${node.name}(${params2}) {
${body}
${indent}}`;
      }
      if (target === "c") {
        const retType = hasReturnWithValue(node.body) ? "double" : "void";
        const params2 = node.params.length > 0 ? node.params.map((p) => `double ${p}`).join(", ") : "void";
        return `${indent}${retType} ${node.name}(${params2}) {
${body}
${indent}}`;
      }
      if (target === "cpp") {
        const retType = hasReturnWithValue(node.body) ? "auto" : "void";
        const params2 = node.params.map((p) => `auto ${p}`).join(", ");
        return `${indent}${retType} ${node.name}(${params2}) {
${body}
${indent}}`;
      }
      if (target === "java") {
        const retType = hasReturnWithValue(node.body) ? "Object" : "void";
        const params2 = node.params.map((p) => `Object ${p}`).join(", ");
        return `${indent}static ${retType} ${node.name}(${params2}) {
${body}
${indent}}`;
      }
      const params = node.params.join(", ");
      return `${indent}function ${node.name}(${params}) {
${body}
${indent}}`;
    }
    case "Return": {
      const val = node.value && node.value.length > 0 ? renderTokens(node.value, target) : "";
      if (target === "py") return `${indent}return${val ? " " + val : ""}`;
      if (target === "algo") return `${indent}\u0623\u0631\u062C\u0639${val ? " " + val : ""}\u061B`;
      if (target === "alif") return `${indent}\u0623\u0631\u062C\u0639${val ? " " + val : ""}`;
      if (target === "kalimat") return `${indent}\u0623\u0639\u062F${val ? " " + val : ""}`;
      if (target === "qalb") return `${indent}(\u0623\u0631\u062C\u0639${val ? " " + val : ""})`;
      return `${indent}return${val ? " " + val : ""};`;
    }
    case "VarAssign": {
      const val = renderTokens(node.value, target);
      if (target === "py") return `${indent}${node.name} = ${val}`;
      if (target === "algo") return `${indent}${node.name} \u2190 ${val}\u061B`;
      if (target === "alif" || target === "kalimat") {
        return `${indent}${node.isDeclaration ? "\u0645\u062A\u063A\u064A\u0631 " : ""}${node.name} = ${val}`;
      }
      if (target === "qalb") {
        return `${indent}(${node.isDeclaration ? "\u0639\u0631\u0641" : "\u0628\u062F\u0644"} ${node.name} ${val})`;
      }
      if (target === "php") return `${indent}$${node.name} = ${val};`;
      if (target === "c" || target === "cpp" || target === "java") {
        if (isArrayInitTokens(node.value)) {
          if (target === "c") return `${indent}double ${node.name}[] = ${val};`;
          if (target === "cpp") return `${indent}std::vector<double> ${node.name} = ${val};`;
          return `${indent}${node.isDeclaration ? "var " : ""}${node.name} = ${val};`;
        }
        const isStr = node.value.length === 1 && node.value[0].type === "STRING";
        if (!node.isDeclaration) return `${indent}${node.name} = ${val};`;
        if (target === "java") return `${indent}${isStr ? "String" : "var"} ${node.name} = ${val};`;
        if (target === "cpp") return `${indent}auto ${node.name} = ${val};`;
        return `${indent}${isStr ? "const char*" : "double"} ${node.name} = ${val};`;
      }
      return `${indent}${node.isDeclaration ? "let " : ""}${node.name} = ${val};`;
    }
    case "IndexAssign": {
      const idx = renderTokens(node.index, target);
      const val = renderTokens(node.value, target);
      if (target === "py") return `${indent}${node.target}[${idx}] ${node.op} ${val}`;
      if (target === "algo") return `${indent}${node.target}[${idx}] \u2190 ${val}\u061B`;
      if (target === "alif" || target === "kalimat") return `${indent}${node.target}[${idx}] ${node.op} ${val}`;
      if (target === "qalb") return `${indent}(\u0628\u062F\u0644 (\u0639\u0646\u0635\u0631 ${node.target} ${idx}) ${val})`;
      if (target === "php") return `${indent}$${node.target}[${idx}] ${node.op} ${val};`;
      if (target === "java") return `${indent}${node.target}.set(${idx}, ${val});`;
      return `${indent}${node.target}[${idx}] ${node.op} ${val};`;
    }
    case "Call": {
      const args = node.args.map((a) => renderArg(a, target));
      if (isPrintCall(node)) {
        if (target === "js") return `${indent}console.log(${args.join(", ")});`;
        if (target === "py") return `${indent}print(${args.join(", ")})`;
        if (target === "algo") return `${indent}\u0627\u0637\u0628\u0639(${args.join("\u060C ")})\u061B`;
        if (target === "alif") return `${indent}\u0627\u0637\u0628\u0639(${args.join("\u060C ")})`;
        if (target === "kalimat") return `${indent}\u0627\u0637\u0628\u0639 ${args.join("\u060C ")}`;
        if (target === "qalb") return `${indent}(\u0627\u0637\u0628\u0639 ${args.join(" ")})`;
        if (target === "c") return `${indent}${compileCPrintf(node.args)}`;
        if (target === "cpp") {
          const stream = args.length > 0 ? args.join(' << " " << ') : '""';
          return `${indent}std::cout << ${stream} << std::endl;`;
        }
        if (target === "java") {
          return `${indent}System.out.println(${args.join(' + " " + ')});`;
        }
        if (target === "php") return `${indent}echo ${args.join(", ")}, "\\n";`;
      }
      if (node.concept === "push" || node.name === "push") {
        const list = args[0] ?? "list";
        const item = args[1] ?? "null";
        if (target === "js") return `${indent}${list}.push(${args.slice(1).join(", ")});`;
        if (target === "py") return `${indent}${list}.append(${args.slice(1).join(", ")})`;
        if (target === "php") return `${indent}array_push(${list}, ${args.slice(1).join(", ")});`;
        if (target === "cpp") return `${indent}${list}.push_back(${item});`;
        if (target === "java") return `${indent}${list}.add(${item});`;
        if (target === "c") return `${indent}/* push(${list}, ${item}) */`;
        if (target === "qalb") return `${indent}(\u0623\u0636\u0641 ${list} ${args.slice(1).join(" ")})`;
        if (target === "algo") return `${indent}\u0623\u0636\u0641(${list}\u060C ${args.slice(1).join("\u060C ")})\u061B`;
        return `${indent}\u0623\u0636\u0641(${list}\u060C ${args.slice(1).join("\u060C ")})`;
      }
      if (target === "qalb") {
        return `${indent}(${node.name}${args.length > 0 ? " " + args.join(" ") : ""})`;
      }
      const sep = isStandardArabicTarget(target) ? "\u060C " : ", ";
      const end = target === "py" || target === "alif" || target === "kalimat" ? "" : target === "algo" ? "\u061B" : ";";
      return `${indent}${node.name}(${args.join(sep)})${end}`;
    }
    case "If": {
      const test = renderTokens(node.test.tokens, target);
      const thenIndent = target === "qalb" ? indentLevel + 2 : indentLevel + 1;
      const thenBody = node.then.map((n) => compileNode(n, thenIndent, target)).join("\n");
      if (target === "py") {
        let out2 = `${indent}if ${test}:
${thenBody || `${indent}  pass`}`;
        if (node.else && node.else.length > 0) {
          if (node.else.length === 1 && node.else[0].type === "If") {
            const nested = compileNode(node.else[0], indentLevel, "py").trimStart();
            out2 += `
${indent}el${nested}`;
          } else {
            const elseBody = node.else.map((n) => compileNode(n, indentLevel + 1, "py")).join("\n");
            out2 += `
${indent}else:
${elseBody || `${indent}  pass`}`;
          }
        }
        return out2;
      }
      if (target === "algo") {
        let out2 = `${indent}\u0625\u0630\u0627 (${test}) \u0641\u0625\u0646
${thenBody}`;
        if (node.else && node.else.length > 0) {
          if (node.else.length === 1 && node.else[0].type === "If") {
            const nested = compileNode(node.else[0], indentLevel, "algo").trimStart();
            out2 += `
${indent}\u0648\u0625\u0644\u0627 ${nested}`;
            return out2;
          }
          const elseBody = node.else.map((n) => compileNode(n, indentLevel + 1, "algo")).join("\n");
          out2 += `
${indent}\u0648\u0625\u0644\u0627
${elseBody}`;
        }
        return `${out2}
${indent}\u0646\u0647\u0627\u064A\u0629 \u0625\u0630\u0627`;
      }
      if (target === "alif") {
        let out2 = `${indent}\u0625\u0630\u0627 ${test}
${thenBody}`;
        if (node.else && node.else.length > 0) {
          if (node.else.length === 1 && node.else[0].type === "If") {
            const nested = compileNode(node.else[0], indentLevel, "alif").trimStart();
            out2 += `
${indent}\u0648\u0625\u0644\u0627 ${nested}`;
            return out2;
          }
          const elseBody = node.else.map((n) => compileNode(n, indentLevel + 1, "alif")).join("\n");
          out2 += `
${indent}\u0648\u0625\u0644\u0627
${elseBody}`;
        }
        return `${out2}
${indent}\u0646\u0647\u0627\u064A\u0629 \u0625\u0630\u0627`;
      }
      if (target === "kalimat") {
        let out2 = `${indent}\u0644\u0648 ${test} \u0625\u0630\u0646
${thenBody}`;
        if (node.else && node.else.length > 0) {
          if (node.else.length === 1 && node.else[0].type === "If") {
            const nested = compileNode(node.else[0], indentLevel, "kalimat").trimStart();
            out2 += `
${indent}\u0648\u0625\u0644\u0627 ${nested}`;
            return out2;
          }
          const elseBody = node.else.map((n) => compileNode(n, indentLevel + 1, "kalimat")).join("\n");
          out2 += `
${indent}\u0648\u0625\u0644\u0627
${elseBody}`;
        }
        return `${out2}
${indent}\u062A\u0645 \u0644\u0648`;
      }
      if (target === "qalb") {
        let out2 = `${indent}(\u0625\u0630\u0627 ${test}
${indent}  (\u0646\u0641\u0630
${thenBody}
${indent}  )`;
        if (node.else && node.else.length > 0) {
          const elseBody = node.else.map((n) => compileNode(n, indentLevel + 2, "qalb")).join("\n");
          out2 += `
${indent}  (\u0646\u0641\u0630
${elseBody}
${indent}  )`;
        }
        return `${out2}
${indent})`;
      }
      let out = `${indent}if (${test}) {
${thenBody}
${indent}}`;
      if (node.else && node.else.length > 0) {
        if (node.else.length === 1 && node.else[0].type === "If") {
          const nested = compileNode(node.else[0], indentLevel, target).trimStart();
          out += ` else ${nested}`;
        } else {
          const elseBody = node.else.map((n) => compileNode(n, indentLevel + 1, target)).join("\n");
          out += ` else {
${elseBody}
${indent}}`;
        }
      }
      return out;
    }
    case "While": {
      const test = renderTokens(node.test.tokens, target);
      const bodyIndent = target === "qalb" ? indentLevel + 2 : indentLevel + 1;
      const body = node.body.map((n) => compileNode(n, bodyIndent, target)).join("\n");
      if (target === "py") {
        return `${indent}while ${test}:
${body || `${indent}  pass`}`;
      }
      if (target === "algo") {
        return `${indent}\u0637\u0627\u0644\u0645\u0627 (${test}) \u0643\u0631\u0631
${body}
${indent}\u0646\u0647\u0627\u064A\u0629 \u0637\u0627\u0644\u0645\u0627`;
      }
      if (target === "alif") {
        return `${indent}\u0628\u064A\u0646\u0645\u0627 ${test}
${body}
${indent}\u0646\u0647\u0627\u064A\u0629 \u0628\u064A\u0646\u0645\u0627`;
      }
      if (target === "kalimat") {
        return `${indent}\u0637\u0627\u0644\u0645\u0627 ${test}
${body}
${indent}\u0643\u0631\u0631`;
      }
      if (target === "qalb") {
        return `${indent}(\u0637\u0627\u0644\u0645\u0627 ${test}
${indent}  (\u0646\u0641\u0630
${body}
${indent}  )
${indent})`;
      }
      return `${indent}while (${test}) {
${body}
${indent}}`;
    }
    case "For": {
      const bodyIndent = target === "qalb" ? indentLevel + 2 : indentLevel + 1;
      const body = node.body.map((n) => compileNode(n, bodyIndent, target)).join("\n");
      if (node.variant === "range" && node.iterator && node.start && node.end) {
        const it = node.iterator;
        const start = renderTokens(node.start, target);
        const end = renderTokens(node.end, target);
        if (target === "py") {
          return `${indent}for ${it} in range(${start}, (${end}) + 1):
${body || `${indent}  pass`}`;
        }
        if (target === "algo") {
          return `${indent}\u0644\u0643\u0644 ${it} \u0645\u0646 ${start} \u0625\u0644\u0649 ${end} \u0643\u0631\u0631
${body}
${indent}\u0646\u0647\u0627\u064A\u0629 \u0644\u0643\u0644`;
        }
        if (target === "alif") {
          return `${indent}\u0644\u0643\u0644 ${it} \u0641\u064A \u0646\u0637\u0627\u0642(${start}\u060C ${end})
${body}
${indent}\u0646\u0647\u0627\u064A\u0629 \u0644\u0643\u0644`;
        }
        if (target === "kalimat") {
          return `${indent}\u0644\u0643\u0644 ${it} \u0645\u0646 ${start} \u0625\u0644\u0649 ${end}
${body}
${indent}\u0643\u0631\u0631`;
        }
        if (target === "qalb") {
          return `${indent}(\u0644\u0643\u0644 ${it} (\u0646\u0637\u0627\u0642 ${start} ${end})
${indent}  (\u0646\u0641\u0630
${body}
${indent}  )
${indent})`;
        }
        if (target === "php") {
          return `${indent}for ($${it} = ${start}; $${it} <= ${end}; $${it}++) {
${body}
${indent}}`;
        }
        if (target === "c" || target === "cpp" || target === "java") {
          return `${indent}for (int ${it} = ${start}; ${it} <= ${end}; ${it}++) {
${body}
${indent}}`;
        }
        return `${indent}for (let ${it} = ${start}; ${it} <= ${end}; ${it}++) {
${body}
${indent}}`;
      }
      if (node.variant === "each" && node.iterator && node.iterable) {
        const it = node.iterator;
        const col = renderTokens(node.iterable, target);
        if (target === "py") {
          return `${indent}for ${it} in ${col}:
${body || `${indent}  pass`}`;
        }
        if (target === "algo") {
          return `${indent}\u0644\u0643\u0644 ${it} \u0641\u064A ${col} \u0643\u0631\u0631
${body}
${indent}\u0646\u0647\u0627\u064A\u0629 \u0644\u0643\u0644`;
        }
        if (target === "alif") {
          return `${indent}\u0644\u0643\u0644 ${it} \u0641\u064A ${col}
${body}
${indent}\u0646\u0647\u0627\u064A\u0629 \u0644\u0643\u0644`;
        }
        if (target === "kalimat") {
          return `${indent}\u0644\u0643\u0644 ${it} \u0641\u064A ${col}
${body}
${indent}\u0643\u0631\u0631`;
        }
        if (target === "qalb") {
          return `${indent}(\u0644\u0643\u0644 ${it} ${col}
${indent}  (\u0646\u0641\u0630
${body}
${indent}  )
${indent})`;
        }
        if (target === "php") {
          return `${indent}foreach (${col} as $${it}) {
${body}
${indent}}`;
        }
        if (target === "c") {
          return `${indent}for (size_t _i = 0; _i < sizeof(${col}) / sizeof(${col}[0]); _i++) {
${indent}  auto ${it} = ${col}[_i];
${body}
${indent}}`;
        }
        if (target === "cpp") {
          return `${indent}for (const auto& ${it} : ${col}) {
${body}
${indent}}`;
        }
        if (target === "java") {
          return `${indent}for (var ${it} : ${col}) {
${body}
${indent}}`;
        }
        return `${indent}for (const ${it} of ${col}) {
${body}
${indent}}`;
      }
      const testStr = node.test ? renderTokens(node.test, target) : target === "py" ? "True" : "true";
      if (target === "js" || target === "c" || target === "cpp" || target === "java" || target === "php") {
        const initStr = node.init && node.init.type === "VarAssign" ? compileVarAssignInline(node.init, target) : node.init ? compileNode(node.init, 0, target).replace(/;$/, "") : "";
        const stepStr = node.step && node.step.type === "VarAssign" ? `${target === "php" ? "$" : ""}${node.step.name} = ${renderTokens(node.step.value, target)}` : node.step ? compileNode(node.step, 0, target).replace(/;$/, "") : "";
        return `${indent}for (${initStr}; ${testStr}; ${stepStr}) {
${body}
${indent}}`;
      }
      const lowered = [];
      if (node.init) {
        lowered.push(compileNode(node.init, indentLevel, target));
      }
      const stepNodes = node.step ? [...node.body, node.step] : node.body;
      lowered.push(
        compileNode(
          { type: "While", test: { tokens: node.test ?? [{ type: "IDENT", value: "true", concept: "true" }] }, body: stepNodes },
          indentLevel,
          target
        )
      );
      return lowered.join("\n");
    }
  }
}
function astToTarget(ast, target) {
  return compileNode(ast, 0, target);
}

// src/core/translate.ts
function countAstNodes(node) {
  let count = 1;
  if (node.type === "Program") {
    for (const stmt of node.body) count += countAstNodes(stmt);
  } else if (node.type === "If") {
    for (const stmt of node.then) count += countAstNodes(stmt);
    if (node.else) {
      for (const stmt of node.else) count += countAstNodes(stmt);
    }
  } else if (node.type === "While") {
    for (const stmt of node.body) count += countAstNodes(stmt);
  } else if (node.type === "For") {
    if (node.init) count += countAstNodes(node.init);
    if (node.step) count += countAstNodes(node.step);
    for (const stmt of node.body) count += countAstNodes(stmt);
  } else if (node.type === "FunctionDecl") {
    for (const stmt of node.body) count += countAstNodes(stmt);
  }
  return count;
}
function translateDialect(source, pack, options) {
  if (!VALID_TARGETS.includes(options.target)) {
    return {
      ok: false,
      code: "",
      error: `Unsupported target '${options.target}'. Valid targets: ${VALID_TARGETS.join(", ")}`
    };
  }
  if (pack.requiresConsent && !options.consent) {
    return {
      ok: false,
      code: "",
      error: `Dialect pack '${pack.id}' requires explicit user consent before transpiling.`
    };
  }
  const t0 = performance.now();
  try {
    const rawTokens = lex(source);
    const normalized = normalizeTokens(rawTokens, pack.keywords);
    const ast = parseProgram(normalized);
    const code = astToTarget(ast, options.target);
    const transpileMs = Math.max(0.01, performance.now() - t0);
    return {
      ok: true,
      code,
      ast,
      tokens: normalized,
      metrics: {
        transpileMs,
        tokenCount: normalized.filter((t) => t.type !== "EOF").length,
        astNodeCount: countAstNodes(ast),
        outputBytes: utf8ByteLength(code)
      }
    };
  } catch (err) {
    const transpileMs = Math.max(0.01, performance.now() - t0);
    const message = err instanceof Error ? err.message : String(err);
    const match = /line\s+(\d+)/i.exec(message);
    return {
      ok: false,
      code: "",
      error: message,
      line: match ? Number(match[1]) : void 0,
      metrics: {
        transpileMs,
        tokenCount: 0,
        astNodeCount: 0,
        outputBytes: 0
      }
    };
  }
}

// src/core/lessons.ts
var LESSONS_CURRICULUM = [
  // KID MODE (6 ready arrange lessons)
  {
    id: "kid-talk",
    mode: "kid",
    order: 1,
    status: "ready",
    kind: "arrange",
    requires: ["print"],
    titleKey: "lsKidTalkTitle",
    goalKey: "lsKidTalkGoal",
    explainKeys: ["lsKidTalkExp1", "lsKidTalkExp2"],
    hintKeys: ["lsKidTalkHint1"],
    template: '{{print}}("salam")',
    cards: ["{{print}}", '("salam")'],
    answer: [0, 1],
    wrong: '{{print}}("ahlan")',
    check: [{ op: "prints_text", value: "salam" }]
  },
  {
    id: "kid-twice",
    mode: "kid",
    order: 2,
    status: "ready",
    kind: "arrange",
    requires: ["print"],
    titleKey: "lsKidTwiceTitle",
    goalKey: "lsKidTwiceGoal",
    explainKeys: ["lsKidTwiceExp1", "lsKidTwiceExp2"],
    hintKeys: ["lsKidTwiceHint1"],
    template: '{{print}}("salam")\n{{print}}("ahlan")',
    cards: ['{{print}}("salam")', "\n", '{{print}}("ahlan")'],
    answer: [0, 1, 2],
    wrong: '{{print}}("ahlan")\n{{print}}("salam")',
    check: [{ op: "prints_in_order", values: ["salam", "ahlan"] }]
  },
  {
    id: "kid-door",
    mode: "kid",
    order: 3,
    status: "ready",
    kind: "arrange",
    requires: ["print", "if", "true", "false"],
    titleKey: "lsKidDoorTitle",
    goalKey: "lsKidDoorGoal",
    explainKeys: ["lsKidDoorExp1", "lsKidDoorExp2"],
    hintKeys: ["lsKidDoorHint1"],
    template: '{{if}} ({{true}}) {\n  {{print}}("salam")\n}',
    cards: ["{{if}} ({{true}}) {", '\n  {{print}}("salam")\n', "}"],
    answer: [0, 1, 2],
    wrong: '{{if}} ({{false}}) {\n  {{print}}("salam")\n}',
    check: [
      { op: "has_node", node: "if" },
      { op: "test_token", node: "if", value: "true" },
      { op: "prints_text", value: "salam" }
    ]
  },
  {
    id: "kid-ask",
    mode: "kid",
    order: 4,
    status: "ready",
    kind: "arrange",
    requires: ["let", "input", "print"],
    titleKey: "lsKidAskTitle",
    goalKey: "lsKidAskGoal",
    explainKeys: ["lsKidAskExp1", "lsKidAskExp2"],
    hintKeys: ["lsKidAskHint1"],
    template: '{{let}} name = {{input}}("Name?")\n{{print}}("salam", name)',
    cards: ['{{let}} name = {{input}}("Name?")', "\n", '{{print}}("salam", name)'],
    answer: [0, 1, 2],
    wrong: '{{print}}("salam")',
    check: [
      { op: "uses_input" },
      { op: "prints_text", value: "salam" }
    ]
  },
  {
    id: "kid-sun-rain",
    mode: "kid",
    order: 5,
    status: "ready",
    kind: "arrange",
    requires: ["print", "if", "else", "false"],
    titleKey: "lsKidSunRainTitle",
    goalKey: "lsKidSunRainGoal",
    explainKeys: ["lsKidSunRainExp1", "lsKidSunRainExp2"],
    hintKeys: ["lsKidSunRainHint1"],
    template: '{{if}} ({{false}}) {\n  {{print}}("sun")\n} {{else}} {\n  {{print}}("rain")\n}',
    cards: ['{{if}} ({{false}}) {\n  {{print}}("sun")\n}', " {{else}} {\n", '  {{print}}("rain")\n}'],
    answer: [0, 1, 2],
    wrong: '{{print}}("rain")',
    check: [
      { op: "has_else" },
      { op: "test_token", node: "if", value: "false" },
      { op: "prints_text", value: "rain" }
    ]
  },
  {
    id: "kid-basket",
    mode: "kid",
    order: 6,
    status: "ready",
    kind: "arrange",
    requires: ["let", "push", "len", "print"],
    titleKey: "lsKidBasketTitle",
    goalKey: "lsKidBasketGoal",
    explainKeys: ["lsKidBasketExp1", "lsKidBasketExp2"],
    hintKeys: ["lsKidBasketHint1"],
    template: '{{let}} bag = ["apple", "dates"]\n{{push}}(bag, "fig")\n{{print}}({{len}}(bag))',
    cards: ['{{let}} bag = ["apple", "dates"]', '\n{{push}}(bag, "fig")\n', "{{print}}({{len}}(bag))"],
    answer: [0, 1, 2],
    wrong: "{{print}}(3)",
    check: [
      { op: "uses_array" },
      { op: "min_prints", min: 1 }
    ]
  },
  // BEGINNER MODE (12 ready type lessons)
  {
    id: "bg-print",
    mode: "beginner",
    order: 1,
    status: "ready",
    kind: "type",
    requires: ["print"],
    titleKey: "lsBgPrintTitle",
    goalKey: "lsBgPrintGoal",
    explainKeys: ["lsBgPrintExp1", "lsBgPrintExp2"],
    hintKeys: ["lsBgPrintHint1", "lsBgPrintHint2"],
    template: '{{print}}("salam")',
    wrong: '{{print}}("ahlan")',
    check: [{ op: "prints_text", value: "salam" }]
  },
  {
    id: "bg-two-lines",
    mode: "beginner",
    order: 2,
    status: "ready",
    kind: "type",
    requires: ["print"],
    titleKey: "lsBgTwoTitle",
    goalKey: "lsBgTwoGoal",
    explainKeys: ["lsBgTwoExp1", "lsBgTwoExp2"],
    hintKeys: ["lsBgTwoHint1"],
    template: '{{print}}("salam")\n{{print}}("ahlan")',
    wrong: '{{print}}("ahlan")\n{{print}}("salam")',
    check: [{ op: "prints_in_order", values: ["salam", "ahlan"] }]
  },
  {
    id: "bg-number",
    mode: "beginner",
    order: 3,
    status: "ready",
    kind: "type",
    requires: ["print"],
    titleKey: "lsBgNumberTitle",
    goalKey: "lsBgNumberGoal",
    explainKeys: ["lsBgNumberExp1", "lsBgNumberExp2"],
    hintKeys: ["lsBgNumberHint1"],
    template: "{{print}}(7)",
    wrong: "{{print}}(5)",
    check: [{ op: "prints_number", value: "7" }]
  },
  {
    id: "bg-boolean",
    mode: "beginner",
    order: 4,
    status: "ready",
    kind: "type",
    requires: ["print", "true", "false"],
    titleKey: "lsBgBoolTitle",
    goalKey: "lsBgBoolGoal",
    explainKeys: ["lsBgBoolExp1", "lsBgBoolExp2"],
    hintKeys: ["lsBgBoolHint1"],
    template: "{{print}}({{true}})",
    wrong: "{{print}}({{false}})",
    check: [{ op: "prints_bool", value: "true" }]
  },
  {
    id: "bg-variables",
    mode: "beginner",
    order: 5,
    status: "ready",
    kind: "type",
    requires: ["let", "print"],
    titleKey: "lsBgVarsTitle",
    goalKey: "lsBgVarsGoal",
    explainKeys: ["lsBgVarsExp1", "lsBgVarsExp2"],
    hintKeys: ["lsBgVarsHint1"],
    template: "{{let}} score = 10\n{{print}}(score)",
    wrong: "{{print}}(10)",
    check: [
      { op: "has_node", node: "let" },
      { op: "min_prints", min: 1 }
    ]
  },
  {
    id: "bg-input-greet",
    mode: "beginner",
    order: 6,
    status: "ready",
    kind: "type",
    requires: ["let", "input", "print"],
    titleKey: "lsBgInputTitle",
    goalKey: "lsBgInputGoal",
    explainKeys: ["lsBgInputExp1", "lsBgInputExp2"],
    hintKeys: ["lsBgInputHint1"],
    template: '{{let}} name = {{input}}("Name?")\n{{print}}("marhba", name)',
    wrong: '{{print}}("marhba")',
    check: [
      { op: "uses_input" },
      { op: "prints_text", value: "marhba" }
    ]
  },
  {
    id: "bg-if",
    mode: "beginner",
    order: 7,
    status: "ready",
    kind: "type",
    requires: ["print", "if", "true"],
    titleKey: "lsBgIfTitle",
    goalKey: "lsBgIfGoal",
    explainKeys: ["lsBgIfExp1", "lsBgIfExp2"],
    hintKeys: ["lsBgIfHint1"],
    template: '{{if}} ({{true}}) {\n  {{print}}("salam")\n}',
    wrong: '{{print}}("salam")',
    check: [
      { op: "has_node", node: "if" },
      { op: "test_token", node: "if", value: "true" },
      { op: "prints_text", value: "salam" }
    ]
  },
  {
    id: "bg-else",
    mode: "beginner",
    order: 8,
    status: "ready",
    kind: "type",
    requires: ["print", "if", "else", "false"],
    titleKey: "lsBgElseTitle",
    goalKey: "lsBgElseGoal",
    explainKeys: ["lsBgElseExp1", "lsBgElseExp2"],
    hintKeys: ["lsBgElseHint1"],
    template: '{{if}} ({{false}}) {\n  {{print}}("yes")\n} {{else}} {\n  {{print}}("no")\n}',
    wrong: '{{print}}("yes")',
    check: [
      { op: "has_else" },
      { op: "test_token", node: "if", value: "false" },
      { op: "prints_text", value: "no" }
    ]
  },
  {
    id: "bg-compare",
    mode: "beginner",
    order: 9,
    status: "ready",
    kind: "type",
    requires: ["print", "if"],
    titleKey: "lsBgCompareTitle",
    goalKey: "lsBgCompareGoal",
    explainKeys: ["lsBgCompareExp1", "lsBgCompareExp2"],
    hintKeys: ["lsBgCompareHint1"],
    template: '{{if}} (10 > 3) {\n  {{print}}("salam")\n}',
    wrong: '{{print}}("salam")',
    check: [
      { op: "test_compares", node: "if" },
      { op: "prints_text", value: "salam" }
    ]
  },
  {
    id: "bg-while-counter",
    mode: "beginner",
    order: 10,
    status: "ready",
    kind: "type",
    requires: ["while", "let", "print"],
    titleKey: "lsBgWhileTitle",
    goalKey: "lsBgWhileGoal",
    explainKeys: ["lsBgWhileExp1", "lsBgWhileExp2"],
    hintKeys: ["lsBgWhileHint1"],
    template: "{{let}} i = 1\n{{while}} (i <= 3) {\n  {{print}}(i)\n  i = i + 1\n}",
    wrong: "{{print}}(1)",
    check: [
      { op: "has_node", node: "let" },
      { op: "has_node", node: "while" },
      { op: "min_prints", min: 1 }
    ]
  },
  {
    id: "bg-for",
    mode: "beginner",
    order: 11,
    status: "ready",
    kind: "type",
    requires: ["for", "print"],
    titleKey: "lsBgForTitle",
    goalKey: "lsBgForGoal",
    explainKeys: ["lsBgForExp1", "lsBgForExp2"],
    hintKeys: ["lsBgForHint1"],
    template: "{{for}} (k : 1..3) {\n  {{print}}(k)\n}",
    wrong: "{{print}}(1)",
    check: [
      { op: "has_node", node: "for" },
      { op: "min_prints", min: 1 }
    ]
  },
  {
    id: "bg-list-basics",
    mode: "beginner",
    order: 12,
    status: "ready",
    kind: "type",
    requires: ["let", "len", "print"],
    titleKey: "lsBgListTitle",
    goalKey: "lsBgListGoal",
    explainKeys: ["lsBgListExp1", "lsBgListExp2"],
    hintKeys: ["lsBgListHint1"],
    template: "{{let}} items = [10, 20, 30]\n{{print}}({{len}}(items))",
    wrong: "{{print}}(3)",
    check: [
      { op: "uses_array" },
      { op: "min_prints", min: 1 }
    ]
  },
  // PRO MODE (12 ready type lessons)
  {
    id: "pr-two-ifs",
    mode: "pro",
    order: 1,
    status: "ready",
    kind: "type",
    requires: ["print", "if", "true", "false"],
    titleKey: "lsPrTwoIfsTitle",
    goalKey: "lsPrTwoIfsGoal",
    explainKeys: ["lsPrTwoIfsExp1", "lsPrTwoIfsExp2"],
    hintKeys: ["lsPrTwoIfsHint1"],
    template: '{{if}} ({{true}}) {\n  {{print}}("salam")\n}\n{{if}} ({{false}}) {\n  {{print}}("ahlan")\n}',
    wrong: '{{if}} ({{true}}) {\n  {{print}}("salam")\n}',
    check: [
      { op: "min_nodes", node: "if", min: 2 },
      { op: "test_token", node: "if", value: "true" },
      { op: "test_token", node: "if", value: "false" },
      { op: "prints_text", value: "salam" },
      { op: "prints_text", value: "ahlan" }
    ]
  },
  {
    id: "pr-nested-if",
    mode: "pro",
    order: 2,
    status: "ready",
    kind: "type",
    requires: ["print", "if", "else", "true", "false"],
    titleKey: "lsPrNestedTitle",
    goalKey: "lsPrNestedGoal",
    explainKeys: ["lsPrNestedExp1", "lsPrNestedExp2"],
    hintKeys: ["lsPrNestedHint1"],
    template: '{{if}} ({{true}}) {\n  {{if}} ({{false}}) {\n    {{print}}("a")\n  } {{else}} {\n    {{print}}("b")\n  }\n}',
    wrong: '{{if}} ({{true}}) {\n  {{print}}("b")\n}',
    check: [
      { op: "nested_if" },
      { op: "has_else" },
      { op: "prints_text", value: "b" }
    ]
  },
  {
    id: "pr-while-shape",
    mode: "pro",
    order: 3,
    status: "ready",
    kind: "type",
    requires: ["print", "while", "false"],
    titleKey: "lsPrWhileTitle",
    goalKey: "lsPrWhileGoal",
    explainKeys: ["lsPrWhileExp1", "lsPrWhileExp2"],
    hintKeys: ["lsPrWhileHint1"],
    template: '{{while}} ({{false}}) {\n  {{print}}("salam")\n}',
    wrong: '{{print}}("salam")',
    check: [
      { op: "has_node", node: "while" },
      { op: "test_token", node: "while", value: "false" },
      { op: "prints_text", value: "salam" }
    ]
  },
  {
    id: "pr-functions",
    mode: "pro",
    order: 4,
    status: "ready",
    kind: "type",
    requires: ["fn", "print"],
    titleKey: "lsPrFuncTitle",
    goalKey: "lsPrFuncGoal",
    explainKeys: ["lsPrFuncExp1", "lsPrFuncExp2"],
    hintKeys: ["lsPrFuncHint1"],
    template: '{{fn}} greet() {\n  {{print}}("salam")\n}\ngreet()',
    wrong: '{{print}}("salam")',
    check: [
      { op: "min_functions", min: 1 },
      { op: "prints_text", value: "salam" }
    ]
  },
  {
    id: "pr-fn-return",
    mode: "pro",
    order: 5,
    status: "ready",
    kind: "type",
    requires: ["fn", "return", "print"],
    titleKey: "lsPrReturnTitle",
    goalKey: "lsPrReturnGoal",
    explainKeys: ["lsPrReturnExp1", "lsPrReturnExp2"],
    hintKeys: ["lsPrReturnHint1"],
    template: "{{fn}} add(a, b) {\n  {{return}} a + b\n}\n{{print}}(add(4, 5))",
    wrong: "{{fn}} add(a, b) {\n  {{print}}(a + b)\n}\nadd(4, 5)",
    check: [
      { op: "min_functions", min: 1 },
      { op: "has_return" },
      { op: "min_prints", min: 1 }
    ]
  },
  {
    id: "pr-arrays",
    mode: "pro",
    order: 6,
    status: "ready",
    kind: "type",
    requires: ["let", "push", "len", "print"],
    titleKey: "lsPrArraysTitle",
    goalKey: "lsPrArraysGoal",
    explainKeys: ["lsPrArraysExp1", "lsPrArraysExp2"],
    hintKeys: ["lsPrArraysHint1"],
    template: "{{let}} nums = [2, 4]\n{{push}}(nums, 6)\n{{print}}({{len}}(nums))",
    wrong: "{{let}} nums = 6\n{{print}}(nums)",
    check: [
      { op: "uses_array" },
      { op: "min_prints", min: 1 }
    ]
  },
  {
    id: "pr-for-each",
    mode: "pro",
    order: 7,
    status: "ready",
    kind: "type",
    requires: ["let", "for", "print"],
    titleKey: "lsPrForEachTitle",
    goalKey: "lsPrForEachGoal",
    explainKeys: ["lsPrForEachExp1", "lsPrForEachExp2"],
    hintKeys: ["lsPrForEachHint1"],
    template: '{{let}} cities = ["Tunis", "Fes"]\n{{for}} (city : cities) {\n  {{print}}(city)\n}',
    wrong: '{{print}}("Tunis")',
    check: [
      { op: "uses_array" },
      { op: "has_node", node: "for" },
      { op: "min_prints", min: 1 }
    ]
  },
  {
    id: "pr-for-sum",
    mode: "pro",
    order: 8,
    status: "ready",
    kind: "type",
    requires: ["let", "for", "print"],
    titleKey: "lsPrForSumTitle",
    goalKey: "lsPrForSumGoal",
    explainKeys: ["lsPrForSumExp1", "lsPrForSumExp2"],
    hintKeys: ["lsPrForSumHint1"],
    template: "{{let}} total = 0\n{{for}} (i : 1..4) {\n  total = total + i\n}\n{{print}}(total)",
    wrong: "{{let}} total = 10\n{{print}}(total)",
    check: [
      { op: "has_node", node: "for" },
      { op: "has_node", node: "let" },
      { op: "min_prints", min: 1 }
    ]
  },
  {
    id: "pr-fn-list",
    mode: "pro",
    order: 9,
    status: "ready",
    kind: "type",
    requires: ["fn", "return", "let", "len", "print"],
    titleKey: "lsPrFnListTitle",
    goalKey: "lsPrFnListGoal",
    explainKeys: ["lsPrFnListExp1", "lsPrFnListExp2"],
    hintKeys: ["lsPrFnListHint1"],
    template: "{{fn}} countBag(arr) {\n  {{return}} {{len}}(arr)\n}\n{{let}} bag = [1, 2, 3]\n{{print}}(countBag(bag))",
    wrong: "{{print}}(3)",
    check: [
      { op: "min_functions", min: 1 },
      { op: "has_return" },
      { op: "uses_array" },
      { op: "min_prints", min: 1 }
    ]
  },
  {
    id: "pr-input-guard",
    mode: "pro",
    order: 10,
    status: "ready",
    kind: "type",
    requires: ["let", "input", "if", "else", "print"],
    titleKey: "lsPrInputGuardTitle",
    goalKey: "lsPrInputGuardGoal",
    explainKeys: ["lsPrInputGuardExp1", "lsPrInputGuardExp2"],
    hintKeys: ["lsPrInputGuardHint1"],
    template: '{{let}} note = {{input}}("Score?")\n{{if}} (note >= 10) {\n  {{print}}("pass")\n} {{else}} {\n  {{print}}("retry")\n}',
    wrong: '{{print}}("pass")',
    check: [
      { op: "uses_input" },
      { op: "has_else" },
      { op: "min_prints", min: 1 }
    ]
  },
  {
    id: "pr-fn-compose",
    mode: "pro",
    order: 11,
    status: "ready",
    kind: "type",
    requires: ["fn", "return", "print"],
    titleKey: "lsPrFnComposeTitle",
    goalKey: "lsPrFnComposeGoal",
    explainKeys: ["lsPrFnComposeExp1", "lsPrFnComposeExp2"],
    hintKeys: ["lsPrFnComposeHint1"],
    template: "{{fn}} square(n) {\n  {{return}} n * n\n}\n{{fn}} sumSq(x, y) {\n  {{return}} square(x) + square(y)\n}\n{{print}}(sumSq(3, 4))",
    wrong: "{{fn}} square(n) {\n  {{return}} n * n\n}\n{{print}}(square(3))",
    check: [
      { op: "min_functions", min: 2 },
      { op: "has_return" },
      { op: "min_prints", min: 1 }
    ]
  },
  {
    id: "pr-errors",
    mode: "pro",
    order: 12,
    status: "ready",
    kind: "type",
    requires: ["let", "if", "else", "len", "print"],
    titleKey: "lsPrErrorsTitle",
    goalKey: "lsPrErrorsGoal",
    explainKeys: ["lsPrErrorsExp1", "lsPrErrorsExp2"],
    hintKeys: ["lsPrErrorsHint1"],
    template: '{{let}} items = [10, 20]\n{{if}} ({{len}}(items) > 1) {\n  {{print}}(items[1])\n} {{else}} {\n  {{print}}("empty")\n}',
    wrong: "{{print}}(20)",
    check: [
      { op: "uses_array" },
      { op: "has_else" },
      { op: "min_prints", min: 1 }
    ]
  }
];
var SLOT_RE = /\{\{([a-z0-9_ ]+)\}\}/gi;
function findConceptWord(keywords, concept) {
  for (const [word, mapped] of Object.entries(keywords)) {
    if (mapped === concept) return word;
  }
  return null;
}
function missingConceptsForLesson(lesson, keywords) {
  const available = new Set(Object.values(keywords));
  return lesson.requires.filter((req) => !available.has(req));
}
function fillSlots(template, keywords) {
  const missing = [];
  const text = template.replace(SLOT_RE, (_m, concept) => {
    const word = findConceptWord(keywords, concept.trim());
    if (!word) {
      if (!missing.includes(concept)) missing.push(concept);
      return concept;
    }
    return word;
  });
  return missing.length === 0 ? { ok: true, text } : { ok: false, missing, text };
}
function collectCalls(node, out = []) {
  if (Array.isArray(node)) {
    for (const child of node) collectCalls(child, out);
    return out;
  }
  switch (node.type) {
    case "Program":
      return collectCalls(node.body, out);
    case "Call":
      out.push(node);
      return out;
    case "If":
      collectCalls(node.then, out);
      if (node.else) collectCalls(node.else, out);
      return out;
    case "While":
    case "For":
    case "FunctionDecl":
      return collectCalls(node.body, out);
    case "VarAssign":
    case "IndexAssign":
    case "Return":
      return out;
  }
}
function collectControlNodes(node, targetType, out = []) {
  if (Array.isArray(node)) {
    for (const child of node) collectControlNodes(child, targetType, out);
    return out;
  }
  switch (node.type) {
    case "Program":
      return collectControlNodes(node.body, targetType, out);
    case "If":
      if (targetType === "If") out.push(node);
      collectControlNodes(node.then, targetType, out);
      if (node.else) collectControlNodes(node.else, targetType, out);
      return out;
    case "While":
      if (targetType === "While") out.push(node);
      return collectControlNodes(node.body, targetType, out);
    case "For":
      if (targetType === "For") out.push(node);
      return collectControlNodes(node.body, targetType, out);
    case "FunctionDecl":
      if (targetType === "FunctionDecl") out.push(node);
      return collectControlNodes(node.body, targetType, out);
    default:
      return out;
  }
}
function walkExprTokens(node, fn) {
  if (Array.isArray(node)) return node.some((c) => walkExprTokens(c, fn));
  switch (node.type) {
    case "Program":
      return walkExprTokens(node.body, fn);
    case "VarAssign":
      return fn(node.value);
    case "IndexAssign":
      return fn(node.index) || fn(node.value);
    case "Return":
      return node.value ? fn(node.value) : false;
    case "Call":
      return node.args.some((a) => a.type === "RawExpr" && fn(a.tokens));
    case "If":
      return fn(node.test.tokens) || walkExprTokens(node.then, fn) || (node.else ? walkExprTokens(node.else, fn) : false);
    case "While":
      return fn(node.test.tokens) || walkExprTokens(node.body, fn);
    case "For":
      return (node.start ? fn(node.start) : false) || (node.end ? fn(node.end) : false) || (node.iterable ? fn(node.iterable) : false) || walkExprTokens(node.body, fn);
    case "FunctionDecl":
      return walkExprTokens(node.body, fn);
  }
}
function hasVarDeclNode(node) {
  if (Array.isArray(node)) return node.some(hasVarDeclNode);
  switch (node.type) {
    case "Program":
      return hasVarDeclNode(node.body);
    case "VarAssign":
      return node.isDeclaration;
    case "If":
      return hasVarDeclNode(node.then) || (node.else ? hasVarDeclNode(node.else) : false);
    case "While":
    case "For":
    case "FunctionDecl":
      return hasVarDeclNode(node.body);
    default:
      return false;
  }
}
function hasReturnNode(node) {
  if (Array.isArray(node)) return node.some(hasReturnNode);
  switch (node.type) {
    case "Program":
      return hasReturnNode(node.body);
    case "Return":
      return true;
    case "If":
      return hasReturnNode(node.then) || (node.else ? hasReturnNode(node.else) : false);
    case "While":
    case "For":
    case "FunctionDecl":
      return hasReturnNode(node.body);
    default:
      return false;
  }
}
function hasInputUsage(ast) {
  const calls = collectCalls(ast);
  if (calls.some((c) => c.concept === "input")) return true;
  return walkExprTokens(ast, (tokens) => tokens.some((t) => t.concept === "input"));
}
function hasArrayUsage(ast) {
  const calls = collectCalls(ast);
  if (calls.some((c) => c.concept === "push" || c.concept === "len")) return true;
  const checkIndexAssign = (node) => {
    if (Array.isArray(node)) return node.some(checkIndexAssign);
    if (node.type === "IndexAssign") return true;
    if (node.type === "Program") return checkIndexAssign(node.body);
    if (node.type === "If") return checkIndexAssign(node.then) || (node.else ? checkIndexAssign(node.else) : false);
    if (node.type === "While" || node.type === "For" || node.type === "FunctionDecl") return checkIndexAssign(node.body);
    return false;
  };
  if (checkIndexAssign(ast)) return true;
  return walkExprTokens(
    ast,
    (tokens) => tokens.some((t) => t.type === "SYMBOL" && t.value === "[" || t.concept === "len" || t.concept === "push")
  );
}
function isPrintCall2(c) {
  return c.concept === "print" || c.concept === "log" || c.concept === "console.log";
}
function argMatchesString(arg, expected) {
  return arg.type === "StringLiteral" && arg.value === expected;
}
function argMatchesNumber(arg, expected) {
  return arg.type === "NumberLiteral" && String(arg.value) === expected;
}
function argMatchesBool(arg, expected) {
  if (arg.type === "Identifier") return arg.concept === expected || arg.name === expected;
  if (arg.type === "RawExpr" && arg.tokens.length === 1) {
    const t = arg.tokens[0];
    return t.concept === expected || t.value === expected;
  }
  return false;
}
function exprHasToken(tokens, target) {
  return tokens.some((t) => t.concept === target || t.value === target);
}
function exprHasCompareOp(tokens) {
  const ops = /* @__PURE__ */ new Set(["==", "!=", "<", ">", "<=", ">="]);
  return tokens.some((t) => t.type === "OP" && ops.has(t.value));
}
function hasNestedIf(node, insideIf = false) {
  if (Array.isArray(node)) return node.some((c) => hasNestedIf(c, insideIf));
  switch (node.type) {
    case "Program":
      return hasNestedIf(node.body, false);
    case "If":
      if (insideIf) return true;
      return hasNestedIf(node.then, true) || (node.else ? hasNestedIf(node.else, true) : false);
    case "While":
    case "For":
    case "FunctionDecl":
      return hasNestedIf(node.body, insideIf);
    default:
      return false;
  }
}
function checkRule(ast, rule) {
  const prints = collectCalls(ast).filter(isPrintCall2);
  const ifs = collectControlNodes(ast, "If");
  const whiles = collectControlNodes(ast, "While");
  const fors = collectControlNodes(ast, "For");
  const fns = collectControlNodes(ast, "FunctionDecl");
  const countNode = (nodeName) => {
    switch (nodeName) {
      case "if":
        return ifs.length;
      case "while":
        return whiles.length;
      case "for":
        return fors.length;
      case "fn":
        return fns.length;
      case "return":
        return hasReturnNode(ast) ? 1 : 0;
      case "input":
        return hasInputUsage(ast) ? 1 : 0;
      case "array":
        return hasArrayUsage(ast) ? 1 : 0;
      case "let":
        return hasVarDeclNode(ast) ? 1 : 0;
      default:
        return 0;
    }
  };
  switch (rule.op) {
    case "prints_text":
      return prints.some((c) => c.args.some((a) => argMatchesString(a, rule.value)));
    case "prints_number":
      return prints.some((c) => c.args.some((a) => argMatchesNumber(a, rule.value)));
    case "prints_bool":
      return prints.some((c) => c.args.some((a) => argMatchesBool(a, rule.value)));
    case "prints_in_order": {
      let idx = 0;
      for (const c of prints) {
        if (c.args.some((a) => argMatchesString(a, rule.values[idx]))) {
          idx++;
          if (idx === rule.values.length) return true;
        }
      }
      return idx === rule.values.length;
    }
    case "min_prints":
      return prints.length >= rule.min;
    case "has_node":
      return countNode(rule.node) > 0;
    case "min_nodes":
      return countNode(rule.node) >= rule.min;
    case "has_else":
      return ifs.some((n) => Array.isArray(n.else) && n.else.length > 0);
    case "nested_if":
      return hasNestedIf(ast, false);
    case "test_token": {
      const nodes = rule.node === "if" ? ifs : whiles;
      return nodes.some((n) => exprHasToken(n.test.tokens, rule.value));
    }
    case "test_compares": {
      const nodes = rule.node === "if" ? ifs : whiles;
      return nodes.some((n) => exprHasCompareOp(n.test.tokens));
    }
    case "min_functions":
      return fns.length >= rule.min;
    case "has_return":
      return hasReturnNode(ast);
    case "uses_input":
      return hasInputUsage(ast);
    case "uses_array":
      return hasArrayUsage(ast);
  }
}
function checkAstRules(ast, rules) {
  for (const r of rules) {
    if (!checkRule(ast, r)) return r.op;
  }
  return null;
}
function defaultInputsForLesson(lesson) {
  if (lesson.id === "pr-input-guard") return ["15"];
  return ["Maghreb"];
}
function deterministicShuffleIndices(length, seedStr) {
  const arr = Array.from({ length }, (_, i) => i);
  if (length <= 1) return arr;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = hash * 31 + seedStr.charCodeAt(i) | 0;
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.abs(hash + i * 7) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const isIdentity = arr.every((val, idx) => val === idx);
  if (isIdentity && arr.length >= 2) {
    [arr[0], arr[arr.length - 1]] = [arr[arr.length - 1], arr[0]];
  }
  return arr;
}
function getShuffledLessonCards(lesson, pack) {
  const cards = (lesson.cards ?? []).map((c) => fillSlots(c, pack.keywords).text);
  const order = deterministicShuffleIndices(cards.length, `${lesson.id}:${pack.id}`);
  return {
    cards,
    shuffled: order.map((idx) => ({ index: idx, text: cards[idx] }))
  };
}
function verifyLessonSolution(source, pack, lesson, options) {
  const trimmed = source.trim();
  if (!trimmed) {
    return { status: "error", message: "Empty program" };
  }
  const enforceConsent = Boolean(options?.enforceConsent);
  const consentGranted = enforceConsent ? Boolean(options?.hasConsent) : true;
  if (enforceConsent && pack.requiresConsent && !consentGranted) {
    return {
      status: "consent_required",
      message: "Dialect requires explicit consent before running."
    };
  }
  const transpile = translateDialect(trimmed, pack, {
    target: options?.target ?? "js",
    consent: consentGranted
  });
  if (!transpile.ok || !transpile.ast) {
    return {
      status: "error",
      message: transpile.error ?? "Syntax error",
      hint: transpile.hint,
      line: transpile.line
    };
  }
  const execInputs = options?.interactiveInput ? options.inputs ?? [] : options?.inputs ?? defaultInputsForLesson(lesson);
  const exec = executeAst(transpile.ast, { inputs: execInputs });
  if (options?.interactiveInput && exec.awaitingInput) {
    return {
      status: "awaiting_input",
      prompt: exec.awaitingInput.prompt,
      collectedCount: exec.awaitingInput.collectedCount,
      outputs: exec.outputs,
      transpiledCode: transpile.code,
      steps: exec.steps
    };
  }
  const outputs = exec.ok ? exec.outputs : [];
  const trace = options?.includeTrace ? traceExecutionAst(transpile.ast, 60, { inputs: execInputs }) : void 0;
  const failedOp = checkAstRules(transpile.ast, lesson.check);
  if (failedOp) {
    return {
      status: "wrong",
      failed: failedOp,
      outputs,
      transpiledCode: transpile.code,
      steps: exec.steps,
      executionMs: exec.executionMs,
      warnings: exec.warnings,
      trace
    };
  }
  return {
    status: "ok",
    outputs,
    transpiledCode: transpile.code,
    steps: exec.steps,
    executionMs: exec.executionMs,
    warnings: exec.warnings,
    trace
  };
}
function verifyLessonSource(source, pack, lesson, options) {
  const res = verifyLessonSolution(source, pack, lesson, options);
  if (res.status === "ok") {
    return { status: "ok", outputs: res.outputs };
  }
  if (res.status === "wrong") {
    return { status: "wrong", failed: res.failed, outputs: res.outputs };
  }
  if (res.status === "awaiting_input") {
    return { status: "error", message: `Awaiting input: ${res.prompt}` };
  }
  return {
    status: "error",
    message: res.message,
    hint: "hint" in res ? res.hint : void 0
  };
}
var BaydaEngine = {
  compile: translateDialect,
  execute: executeAst,
  verifyLesson: verifyLessonSource,
  verifySolution: verifyLessonSolution,
  fillTemplate: fillSlots,
  checkRules: checkAstRules,
  missingConcepts: missingConceptsForLesson,
  shuffleCards: getShuffledLessonCards
};
function computeDialectCurriculumProgress(completedIds, lessons, pack) {
  const completedSet = new Set(completedIds);
  const totalGuided = lessons.length;
  const completedCount = lessons.filter((l) => completedSet.has(l.id)).length;
  const readyInPackCount = lessons.filter(
    (l) => l.status === "ready" && missingConceptsForLesson(l, pack.keywords).length === 0
  ).length;
  const percentage = totalGuided > 0 ? Math.round(completedCount / totalGuided * 100) : 0;
  return {
    dialectId: pack.id,
    totalGuided,
    completedCount,
    readyInPackCount,
    percentage
  };
}
function generateLessonReviewQuizzes(completedIds, lessons, pack, options) {
  const quizzes = [];
  const completedLessons = lessons.filter(
    (l) => l.status === "ready" && completedIds.includes(l.id) && Boolean(l.template) && BaydaEngine.missingConcepts(l, pack.keywords).length === 0
  );
  const isAmazigh = /^(kab|zgh|shi)-/i.test(pack.id);
  const scriptDefaults = pack.rtl ? { print: "\u0643\u062A\u0628", if: "\u0625\u0644\u0627", else: "\u0648\u0644\u0627", true: "\u0635\u062D\u064A\u062D", false: "\u063A\u0644\u0637" } : isAmazigh ? { print: "aru", if: "ma", else: "ne\u0263", true: "tidet", false: "tikerkas" } : { print: "ktab", if: "idha", else: "wela", true: "s7i7", false: "ghalet" };
  const fallbackKwPool = [
    findConceptWord(pack.keywords, "print") ?? scriptDefaults.print,
    findConceptWord(pack.keywords, "if") ?? scriptDefaults.if,
    findConceptWord(pack.keywords, "else") ?? scriptDefaults.else,
    findConceptWord(pack.keywords, "true") ?? scriptDefaults.true,
    findConceptWord(pack.keywords, "false") ?? scriptDefaults.false
  ];
  completedLessons.forEach((lesson, idx) => {
    const filled = BaydaEngine.fillTemplate(lesson.template, pack.keywords);
    if (!filled.ok) return;
    const code = filled.text;
    const transpile = BaydaEngine.compile(code, pack, { target: "js", consent: true });
    let outputs = [];
    if (transpile.ok && transpile.ast) {
      const exec = BaydaEngine.execute(transpile.ast, {
        inputs: options?.inputs ?? defaultInputsForLesson(lesson)
      });
      if (exec.ok) outputs = exec.outputs;
    }
    const outputStr = outputs.join(" | ") || "(no output)";
    const spokenPhrase = code.replace(/[{}()"]/g, " ").replace(/\s+/g, " ").trim();
    const targetKeywordConcept = lesson.requires[0] ?? "print";
    const targetWord = findConceptWord(pack.keywords, targetKeywordConcept);
    const kindCycle = idx % 3;
    if (kindCycle === 1 && targetWord && code.includes(targetWord)) {
      const maskedCode = code.replace(targetWord, "____");
      const distractors = Array.from(
        new Set(fallbackKwPool.filter((w) => w !== targetWord))
      ).slice(0, 2);
      const rawOpts = [targetWord, ...distractors];
      const shift = idx % rawOpts.length;
      const options2 = [...rawOpts.slice(shift), ...rawOpts.slice(0, shift)];
      quizzes.push({
        id: `quiz-${lesson.id}-kw`,
        lessonId: lesson.id,
        lessonTitleKey: lesson.titleKey,
        lessonGoalKey: lesson.goalKey,
        kind: "fill-keyword",
        codeSnippet: maskedCode,
        promptKey: "quizFillKeywordPrompt",
        correctOption: targetWord,
        options: options2,
        spokenPhrase,
        expectedOutput: outputStr,
        lesson
      });
    } else if (kindCycle === 2) {
      const broken = lesson.wrong ? BaydaEngine.fillTemplate(lesson.wrong, pack.keywords).text : "";
      const rawOpts = [code, broken || `${targetWord ?? "ktab"}("?")`];
      quizzes.push({
        id: `quiz-${lesson.id}-code`,
        lessonId: lesson.id,
        lessonTitleKey: lesson.titleKey,
        lessonGoalKey: lesson.goalKey,
        kind: "code-challenge",
        codeSnippet: code,
        starterBrokenCode: broken || "",
        promptKey: "quizCodeChallengePrompt",
        correctOption: code,
        options: rawOpts,
        spokenPhrase,
        expectedOutput: outputStr,
        lesson
      });
    } else {
      const distractorPool = ["ahlan", "7", "false", "rain", "b", "(no output)"].filter(
        (d) => d !== outputStr
      );
      const rawOpts = [outputStr, distractorPool[0], distractorPool[1]];
      const shift = idx % rawOpts.length;
      const options2 = [...rawOpts.slice(shift), ...rawOpts.slice(0, shift)];
      quizzes.push({
        id: `quiz-${lesson.id}-out`,
        lessonId: lesson.id,
        lessonTitleKey: lesson.titleKey,
        lessonGoalKey: lesson.goalKey,
        kind: "predict-output",
        codeSnippet: code,
        promptKey: "quizPredictOutputPrompt",
        correctOption: outputStr,
        options: options2,
        spokenPhrase,
        expectedOutput: outputStr,
        lesson
      });
    }
  });
  return quizzes;
}
function verifyReviewQuizChallenge(quiz, submission, pack) {
  if (quiz.kind === "code-challenge") {
    const verdict = BaydaEngine.verifyLesson(submission, pack, quiz.lesson);
    if (verdict.status === "ok") {
      return { ok: true, outputs: verdict.outputs, verdict };
    }
    return {
      ok: false,
      outputs: "outputs" in verdict ? verdict.outputs : [],
      verdict,
      error: verdict.status === "error" ? verdict.message : verdict.failed
    };
  }
  if (quiz.kind === "fill-keyword") {
    const assembled = quiz.codeSnippet.replace("____", submission);
    const verdict = BaydaEngine.verifyLesson(assembled, pack, quiz.lesson);
    const isMatch = submission === quiz.correctOption && verdict.status === "ok";
    return {
      ok: isMatch,
      outputs: "outputs" in verdict ? verdict.outputs : [],
      verdict
    };
  }
  const compiled = BaydaEngine.compile(quiz.codeSnippet, pack, { target: "js", consent: true });
  if (!compiled.ok || !compiled.ast) {
    return { ok: false, outputs: [], error: compiled.error };
  }
  const exec = BaydaEngine.execute(compiled.ast, {
    inputs: defaultInputsForLesson(quiz.lesson)
  });
  const actualOutput = exec.outputs.join(" | ") || "(no output)";
  return {
    ok: exec.ok && submission === actualOutput,
    outputs: exec.outputs
  };
}

// src/core/kidLessonCompanion.ts
function resolveRegionFamily(packId) {
  const lower = packId.toLowerCase();
  if (lower.startsWith("tn-")) return "tn";
  if (lower.startsWith("dz-")) return "dz";
  if (lower.startsWith("ly-")) return "ly";
  if (lower.startsWith("mr-")) return "mr";
  if (lower.startsWith("kab-") || lower.startsWith("zgh-") || lower.startsWith("shi-")) {
    return "amazigh";
  }
  return "ma";
}
function resolveSceneKind(lesson) {
  if (lesson.id === "kid-talk") return "talk";
  if (lesson.id === "kid-twice") return "twice";
  if (lesson.id === "kid-door") return "door";
  if (lesson.id === "kid-sun-rain") return "sun-rain";
  if (lesson.id === "kid-ask" || lesson.requires.includes("input")) return "ask";
  if (lesson.id === "kid-basket" || lesson.requires.includes("push") || lesson.requires.includes("len")) {
    return "basket";
  }
  if (lesson.requires.includes("else")) return "sun-rain";
  if (lesson.requires.includes("if")) return "door";
  if (lesson.cards && lesson.cards.length >= 3) return "twice";
  return "generic";
}
function buildKidLessonCompanionGuide(lesson, pack) {
  const region = resolveRegionFamily(pack.id);
  const scene = resolveSceneKind(lesson);
  const sayWord = findConceptWord(pack.keywords, "print") ?? (pack.rtl ? "\u0643\u062A\u0628" : "kteb");
  const ifWord = findConceptWord(pack.keywords, "if") ?? (pack.rtl ? "\u0625\u0644\u0627" : "ila");
  const elseWord = findConceptWord(pack.keywords, "else") ?? (pack.rtl ? "\u0648\u0644\u0627" : "olla");
  const trueWord = findConceptWord(pack.keywords, "true") ?? (pack.rtl ? "\u0635\u062D\u064A\u062D" : "s7i7");
  const falseWord = findConceptWord(pack.keywords, "false") ?? (pack.rtl ? "\u063A\u0644\u0637" : "ghalet");
  const inputWord = findConceptWord(pack.keywords, "input") ?? (pack.rtl ? "\u0633\u0648\u0644" : "qra");
  const pushWord = findConceptWord(pack.keywords, "push") ?? (pack.rtl ? "\u0632\u064A\u062F" : "zid");
  const lenWord = findConceptWord(pack.keywords, "len") ?? (pack.rtl ? "\u0637\u0648\u0644" : "toul");
  const primaryConcept = lesson.requires.find((r) => r !== "print") ?? lesson.requires[0] ?? "print";
  const focusWord = findConceptWord(pack.keywords, primaryConcept) ?? sayWord;
  if (pack.rtl) {
    const greetingMap = {
      ma: "\u0623\u0647\u0644\u0627\u064B \u0628\u064A\u0643!",
      tn: "\u0639\u0633\u0644\u0627\u0645\u0629!",
      dz: "\u0635\u062D\u0627 \u062E\u0648\u064A\u0627!",
      ly: "\u0623\u0647\u0644\u064A\u0646 \u0628\u064A\u0643!",
      mr: "\u0645\u0631\u062D\u0628\u0627\u064B \u0628\u064A\u0643!",
      amazigh: "\u0623\u0632\u0648\u0644!"
    };
    const greet2 = greetingMap[region];
    if (scene === "talk") {
      const b1 = region === "tn" ? `${greet2} \u0623\u0646\u0627 \u0641\u064A\u0646\u064A\u0643! \u0628\u0627\u0634 \u062A\u062E\u0644\u0651\u064A \u0627\u0644\u0628\u0637\u0644 \u064A\u062A\u0643\u0644\u0651\u0645\u060C \u0646\u0633\u062A\u0639\u0645\u0644\u0648 \u0643\u0644\u0645\u0629 \xAB${sayWord}\xBB!` : region === "dz" ? `${greet2} \u0623\u0646\u0627 \u0641\u064A\u0646\u064A\u0643! \u0628\u0627\u0634 \u0646\u062E\u0644\u064A\u0648 \u0627\u0644\u0634\u062E\u0635\u064A\u0629 \u062A\u0647\u062F\u0631\u060C \u0646\u0633\u062A\u0639\u0645\u0644\u0648 \xAB${sayWord}\xBB!` : region === "ly" ? `${greet2} \u0623\u0646\u0627 \u0641\u064A\u0646\u064A\u0643! \u0628\u0627\u0634 \u062A\u062E\u0644\u064A \u0627\u0644\u0628\u0637\u0644 \u064A\u062D\u0643\u064A\u060C \u0646\u0633\u062A\u0639\u0645\u0644\u0648 \u0643\u0644\u0645\u0629 \xAB${sayWord}\xBB!` : region === "mr" ? `${greet2} \u0623\u0646\u0627 \u0641\u064A\u0646\u064A\u0643! \u0625\u0644\u064A\u0646 \u062A\u0628\u063A\u064A \u0627\u0644\u0628\u0637\u0644 \u064A\u062A\u0643\u0644\u0645\u060C \u0646\u0633\u062A\u0639\u0645\u0644\u0648 \xAB${sayWord}\xBB!` : `${greet2} \u0623\u0646\u0627 \u0641\u064A\u0646\u064A\u0643! \u0628\u0627\u0634 \u062A\u062E\u0644\u0651\u064A \u0627\u0644\u0628\u0637\u0644 \u064A\u0647\u0636\u0631\u060C \u0643\u0646\u0633\u062A\u0639\u0645\u0644\u0648 \u0643\u0644\u0645\u0629 \xAB${sayWord}\xBB!`;
      const b2 = region === "tn" ? `\u0631\u0643\u0651\u0628 \xAB${sayWord}\xBB \u0648\u0628\u0639\u062F\u0647\u0627 \xAB\u0633\u0644\u0627\u0645\xBB \u0628\u0627\u0634 \u064A\u0646\u0637\u0642 \u0627\u0644\u062A\u0631\u062D\u064A\u0628 \u0628\u0635\u0648\u062A\u0648!` : `\u062D\u0637\u0651 \xAB${sayWord}\xBB \u0648\u0645\u0648\u0631\u0627\u0647\u0627 \xAB\u0633\u0644\u0627\u0645\xBB \u0628\u0627\u0634 \u064A\u0642\u0648\u0644 \u0645\u0631\u062D\u0628\u0627 \u0628\u0627\u0644\u0635\u0648\u062A \u0648\u0627\u0644\u0635\u0648\u0631\u0629!`;
      return {
        scene,
        greetingBadge: greet2,
        bubbles: [
          { id: "intro", emoji: "\u{1F98A}", text: b1, keywordBadge: sayWord, sceneFocus: "intro" },
          { id: "action", emoji: "\u{1F5E3}\uFE0F", text: b2, keywordBadge: "\u0633\u0644\u0627\u0645", sceneFocus: "action" }
        ]
      };
    }
    if (scene === "twice") {
      const b1 = region === "tn" ? `\u0627\u0644\u062D\u0627\u0633\u0648\u0628 \u064A\u0642\u0631\u0627 \u0627\u0644\u0643\u0648\u062F \u0645\u0646 \u0627\u0644\u0641\u0648\u0642 \u0644\u0644\u0648\u0637\u0629 \u0633\u0637\u0631 \u0628\u0633\u0637\u0631 \u0643\u064A\u0641 \u0627\u0644\u0642\u0635\u0629!` : `\u0627\u0644\u062D\u0627\u0633\u0648\u0628 \u0643\u064A\u0642\u0631\u0627 \u0627\u0644\u0643\u0648\u062F \u0645\u0646 \u0627\u0644\u0641\u0648\u0642 \u0644\u0644\u062A\u062D\u062A \u062E\u0637\u0648\u0629 \u0628\u062E\u0637\u0648\u0629 \u0628\u062D\u0627\u0644 \u0627\u0644\u0642\u0635\u0629!`;
      const b2 = region === "tn" ? `\u0627\u0644\u0623\u0648\u0644\u0649 \xAB${sayWord} \u0633\u0644\u0627\u0645\xBB\u060C \u0648\u0645\u0646 \u0628\u0639\u062F \xAB${sayWord} \u0623\u0647\u0644\u0627\u064B\xBB \u0628\u0627\u0644\u062A\u0631\u062A\u064A\u0628!` : `\u0627\u0644\u0623\u0648\u0644\u0649 \xAB${sayWord} \u0633\u0644\u0627\u0645\xBB\u060C \u0648\u0645\u0648\u0631\u0627\u0647\u0627 \xAB${sayWord} \u0623\u0647\u0644\u0627\u064B\xBB \u0628\u0627\u0644\u062A\u0631\u062A\u064A\u0628!`;
      return {
        scene,
        greetingBadge: greet2,
        bubbles: [
          { id: "step1", emoji: "1\uFE0F\u20E3", text: b1, keywordBadge: sayWord, sceneFocus: "branch-a" },
          { id: "step2", emoji: "2\uFE0F\u20E3", text: b2, keywordBadge: "\u0633\u0644\u0627\u0645 \u2192 \u0623\u0647\u0644\u0627\u064B", sceneFocus: "branch-b" }
        ]
      };
    }
    if (scene === "door") {
      const b1 = region === "tn" ? `\u0634\u0648\u0641 \u0627\u0644\u0628\u0627\u0628 \u0627\u0644\u0633\u062D\u0631\u064A! \xAB${ifWord}\xBB \u062A\u0633\u0623\u0644: \u0647\u0644 \u0627\u0644\u0634\u0631\u0637 \u0645\u062D\u0644\u0648\u0644\u061F` : `\u0634\u0648\u0641 \u0647\u0627\u062F \u0627\u0644\u0628\u0627\u0628 \u0627\u0644\u0633\u062D\u0631\u064A! \xAB${ifWord}\xBB \u0643\u064A\u0633\u0648\u0651\u0644: \u0648\u0627\u0634 \u0627\u0644\u0634\u0631\u0637 \u0645\u062D\u0644\u0648\u0644\u061F`;
      const b2 = region === "tn" ? `\u0648\u0642\u062A \u0644\u064A \u064A\u0643\u0648\u0646 \xAB${trueWord}\xBB\u060C \u0627\u0644\u0628\u0627\u0628 \u064A\u062A\u062D\u0644 \u0648\u064A\u062E\u062F\u0645 \u0627\u0644\u0643\u0648\u062F \u0627\u0644\u0644\u064A \u0644\u062F\u0627\u062E\u0644!` : `\u0645\u0644\u064A \u064A\u0643\u0648\u0646 \xAB${trueWord}\xBB\u060C \u0627\u0644\u0628\u0627\u0628 \u0643\u064A\u062A\u062D\u0644 \u0648\u0643\u064A\u062F\u0648\u0632 \xAB${sayWord} \u0633\u0644\u0627\u0645\xBB!`;
      return {
        scene,
        greetingBadge: greet2,
        bubbles: [
          { id: "door-ask", emoji: "\u{1F6AA}", text: b1, keywordBadge: ifWord, sceneFocus: "branch-a" },
          { id: "door-open", emoji: "\u2705", text: b2, keywordBadge: trueWord, sceneFocus: "action" }
        ]
      };
    }
    if (scene === "sun-rain") {
      const b1 = region === "tn" ? `\u0647\u0648\u0646\u064A \u0639\u0646\u062F\u0646\u0627 \u062B\u0646\u064A\u062A\u064A\u0646: \u0637\u0631\u064A\u0642 \xAB${ifWord}\xBB \u0644\u0644\u0634\u0645\u0633\u060C \u0648\u0637\u0631\u064A\u0642 \xAB${elseWord}\xBB \u0644\u0644\u0645\u0637\u0631!` : `\u0647\u0646\u0627 \u0639\u0646\u062F\u0646\u0627 \u062C\u0648\u062C \u0637\u0631\u0642\u0627\u0646: \u0637\u0631\u064A\u0642 \xAB${ifWord}\xBB \u0644\u0644\u0634\u0645\u0633\u060C \u0648\u0637\u0631\u064A\u0642 \xAB${elseWord}\xBB \u0644\u0644\u0634\u062A\u0627!`;
      const b2 = region === "tn" ? `\u0643\u064A\u0641 \u064A\u0643\u0648\u0646 \u0627\u0644\u0634\u0631\u0637 \xAB${falseWord}\xBB\u060C \u0641\u064A\u0646\u064A\u0643 \u064A\u0645\u0634\u064A \u0644\u0637\u0631\u064A\u0642 \xAB${elseWord}\xBB \u0648\u064A\u0644\u0628\u0633 \u0627\u0644\u0645\u0638\u0644\u0651\u0629!` : `\u0645\u0644\u064A \u0643\u064A\u0643\u0648\u0646 \u0627\u0644\u0634\u0631\u0637 \xAB${falseWord}\xBB\u060C \u0641\u064A\u0646\u064A\u0643 \u0643\u064A\u0645\u0634\u064A \u062F\u064A\u0631\u064A\u0643\u062A \u0644\u0637\u0631\u064A\u0642 \xAB${elseWord}\xBB \u062F\u064A\u0627\u0644 \u0627\u0644\u0634\u062A\u0627!`;
      return {
        scene,
        greetingBadge: greet2,
        bubbles: [
          { id: "sun", emoji: "\u2600\uFE0F", text: b1, keywordBadge: `${ifWord} / ${elseWord}`, sceneFocus: "branch-a" },
          { id: "rain", emoji: "\u{1F327}\uFE0F", text: b2, keywordBadge: falseWord, sceneFocus: "branch-b" }
        ]
      };
    }
    if (scene === "ask") {
      const b1 = region === "tn" ? `${greet2} \u0628\u0627\u0644\u0645\u064A\u0643\u0631\u0648\u0641\u0648\u0646 \xAB${inputWord}\xBB\u060C \u0641\u064A\u0646\u064A\u0643 \u064A\u0633\u0623\u0644 \u0627\u0644\u0635\u0627\u062D\u0628 \u0639\u0644\u0649 \u0627\u0633\u0645\u0648 \u0648\u064A\u062E\u0628\u0651\u064A\u0647 \u0641\u064A \u0635\u0646\u062F\u0648\u0642!` : `${greet2} \u0628\u0643\u0644\u0645\u0629 \xAB${inputWord}\xBB\u060C \u0641\u064A\u0646\u064A\u0643 \u0643\u064A\u0633\u0648\u0644 \u0627\u0644\u0635\u062F\u064A\u0642 \u0639\u0644\u0649 \u0633\u0645\u064A\u062A\u0648 \u0648\u064A\u062E\u0632\u0646\u0647\u0627!`;
      const b2 = region === "tn" ? `\u0628\u0639\u062F\u0647\u0627 \u0646\u0633\u062A\u0639\u0645\u0644\u0648 \xAB${sayWord}\xBB \u0628\u0627\u0634 \u0646\u0631\u062D\u0651\u0628\u0648 \u0628\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0644\u064A \u062C\u0627\u0648\u0628 \u0628\u064A\u0647!` : `\u0648\u0645\u0646 \u0628\u0639\u062F \u0643\u0646\u0633\u062A\u0639\u0645\u0644\u0648 \xAB${sayWord}\xBB \u0628\u0627\u0634 \u0646\u0631\u062D\u0628\u0648 \u0628\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0644\u064A \u062A\u0643\u062A\u0628!`;
      return {
        scene,
        greetingBadge: greet2,
        bubbles: [
          { id: "ask-1", emoji: "\u{1F3A4}", text: b1, keywordBadge: inputWord, sceneFocus: "branch-a" },
          { id: "ask-2", emoji: "\u{1F5E3}\uFE0F", text: b2, keywordBadge: sayWord, sceneFocus: "action" }
        ]
      };
    }
    if (scene === "basket") {
      const b1 = region === "tn" ? `\u0639\u0646\u062F\u0646\u0627 \u0633\u0644\u0629 \u0641\u0648\u0627\u0643\u0647! \u0628\u0643\u0644\u0645\u0629 \xAB${pushWord}\xBB \u0646\u0632\u064A\u062F\u0648 \u0641\u064A\u0647\u0627 \u0641\u0627\u0643\u0647\u0629 \u062C\u062F\u064A\u062F\u0629!` : `\u0639\u0646\u062F\u0646\u0627 \u0642\u0641\u0629 \u062F\u064A\u0627\u0644 \u0627\u0644\u0641\u0648\u0627\u0643\u0647! \u0628\u0640 \xAB${pushWord}\xBB \u0643\u0646\u0632\u064A\u062F\u0648 \u0641\u064A\u0647\u0627 \u062D\u0628\u0629 \u062C\u062F\u064A\u062F\u0629!`;
      const b2 = region === "tn" ? `\u0648\u0643\u0644\u0645\u0629 \xAB${lenWord}\xBB \u062A\u062D\u0633\u0628 \u0642\u062F\u0651\u0627\u0634 \u0645\u0646 \u062D\u0627\u062C\u0629 \u0643\u0627\u064A\u0646\u0629 \u0641\u064A \u0627\u0644\u0633\u0644\u0629 \u0648\u062A\u0637\u0628\u0639 \u0627\u0644\u0631\u0642\u0645 \u0628\u0640 \xAB${sayWord}\xBB!` : `\u0648\xAB${lenWord}\xBB \u0643\u062A\u062D\u0633\u0628 \u0634\u062D\u0627\u0644 \u0643\u0627\u064A\u0646 \u0641\u0627\u0644\u0642\u0641\u0629 \u0648\u062A\u0648\u0631\u064A\u0647\u0627 \u0644\u064A\u0646\u0627 \u0628\u0640 \xAB${sayWord}\xBB!`;
      return {
        scene,
        greetingBadge: greet2,
        bubbles: [
          { id: "basket-1", emoji: "\u{1F9FA}", text: b1, keywordBadge: pushWord, sceneFocus: "branch-a" },
          { id: "basket-2", emoji: "\u{1F4CF}", text: b2, keywordBadge: lenWord, sceneFocus: "action" }
        ]
      };
    }
    return {
      scene: "generic",
      greetingBadge: greet2,
      bubbles: [
        {
          id: "gen-1",
          emoji: "\u{1F98A}",
          text: `${greet2} \u0623\u0646\u0627 \u0641\u064A\u0646\u064A\u0643! \u0641\u0647\u0627\u062F \u0627\u0644\u062F\u0631\u0633 \u0643\u0646\u062E\u062F\u0645\u0648 \u0628\u0640 \xAB${sayWord}\xBB \u0648\xAB${focusWord}\xBB \u062E\u0637\u0648\u0629 \u0628\u062E\u0637\u0648\u0629!`,
          keywordBadge: focusWord,
          sceneFocus: "intro"
        },
        {
          id: "gen-2",
          emoji: "\u2728",
          text: `\u062C\u0631\u0651\u0628 \u062A\u0631\u062A\u0651\u0628 \u0627\u0644\u0628\u0637\u0627\u0642\u0627\u062A \u0627\u0644\u062A\u062D\u062A \u0648\u0636\u063A\u0637 \u062A\u0634\u063A\u064A\u0644 \u0628\u0627\u0634 \u062A\u0634\u0648\u0641 \u0627\u0644\u0646\u062A\u064A\u062C\u0629!`,
          keywordBadge: sayWord,
          sceneFocus: "action"
        }
      ]
    };
  }
  if (region === "amazigh") {
    const greet2 = "Azul!";
    if (scene === "talk") {
      return {
        scene,
        greetingBadge: greet2,
        bubbles: [
          {
            id: "intro",
            emoji: "\u{1F98A}",
            text: `${greet2} Nekk d Fennec! Iwakken ad yemeslay umeddakel, nesseqdac \xAB${sayWord}\xBB!`,
            keywordBadge: sayWord,
            sceneFocus: "intro"
          },
          {
            id: "action",
            emoji: "\u{1F5E3}\uFE0F",
            text: `Sers \xAB${sayWord}\xBB sdat \xABsalam\xBB iwakken ad d-yini azul!`,
            keywordBadge: "salam",
            sceneFocus: "action"
          }
        ]
      };
    }
    if (scene === "twice") {
      return {
        scene,
        greetingBadge: greet2,
        bubbles: [
          {
            id: "step1",
            emoji: "1\uFE0F\u20E3",
            text: `Aselkim yeqqar izirigen seg ufella \u0263er wadda am tem\u025Bayt!`,
            keywordBadge: sayWord,
            sceneFocus: "branch-a"
          },
          {
            id: "step2",
            emoji: "2\uFE0F\u20E3",
            text: `Tamezwarut \xAB${sayWord} salam\xBB, sakin \xAB${sayWord} ahlan\xBB!`,
            keywordBadge: "1 \u2192 2",
            sceneFocus: "branch-b"
          }
        ]
      };
    }
    if (scene === "door") {
      return {
        scene,
        greetingBadge: greet2,
        bubbles: [
          {
            id: "door-ask",
            emoji: "\u{1F6AA}",
            text: `Muqel tawwurt-a! \xAB${ifWord}\xBB yessutur: ma teldi tewwurt?`,
            keywordBadge: ifWord,
            sceneFocus: "branch-a"
          },
          {
            id: "door-open",
            emoji: "\u2705",
            text: `Ma yella d \xAB${trueWord}\xBB, tawwurt ad teldi s \xAB${sayWord}\xBB!`,
            keywordBadge: trueWord,
            sceneFocus: "action"
          }
        ]
      };
    }
    if (scene === "sun-rain") {
      return {
        scene,
        greetingBadge: greet2,
        bubbles: [
          {
            id: "sun",
            emoji: "\u2600\uFE0F",
            text: `\u0194ur-ne\u0263 sin iberdan: abrid n \xAB${ifWord}\xBB akked ubrid n \xAB${elseWord}\xBB!`,
            keywordBadge: `${ifWord} / ${elseWord}`,
            sceneFocus: "branch-a"
          },
          {
            id: "rain",
            emoji: "\u{1F327}\uFE0F",
            text: `Mi ara yili d \xAB${falseWord}\xBB, Fennec ad yeddu \u0263er \xAB${elseWord}\xBB n ugeffur!`,
            keywordBadge: falseWord,
            sceneFocus: "branch-b"
          }
        ]
      };
    }
    if (scene === "ask") {
      return {
        scene,
        greetingBadge: greet2,
        bubbles: [
          {
            id: "ask-1",
            emoji: "\u{1F3A4}",
            text: `S \xAB${inputWord}\xBB, Fennec ad yesteqsi isem-ik, ad t-ye\u1E25rez deg tsenduqt!`,
            keywordBadge: inputWord,
            sceneFocus: "branch-a"
          },
          {
            id: "ask-2",
            emoji: "\u{1F5E3}\uFE0F",
            text: `Sakin s \xAB${sayWord}\xBB, ad d-yini azul s yisem-nni!`,
            keywordBadge: sayWord,
            sceneFocus: "action"
          }
        ]
      };
    }
    if (scene === "basket") {
      return {
        scene,
        greetingBadge: greet2,
        bubbles: [
          {
            id: "basket-1",
            emoji: "\u{1F9FA}",
            text: `\u0194ur-ne\u0263 tqecwalt! S \xAB${pushWord}\xBB, nernu-d tigert tamaynut!`,
            keywordBadge: pushWord,
            sceneFocus: "branch-a"
          },
          {
            id: "basket-2",
            emoji: "\u{1F4CF}",
            text: `\xAB${lenWord}\xBB yett\u1E25eseb ac\u1E25al yellan deg tqecwalt!`,
            keywordBadge: lenWord,
            sceneFocus: "action"
          }
        ]
      };
    }
    return {
      scene: "generic",
      greetingBadge: greet2,
      bubbles: [
        {
          id: "gen-1",
          emoji: "\u{1F98A}",
          text: `${greet2} Nekk d Fennec! Ad nesseqdec \xAB${sayWord}\xBB d \xAB${focusWord}\xBB tura!`,
          keywordBadge: focusWord,
          sceneFocus: "intro"
        }
      ]
    };
  }
  const latinGreetMap = {
    ma: "Mrahba!",
    tn: "Marhba!",
    dz: "Saha!",
    ly: "Ahlein!",
    mr: "Marhba bik!"
  };
  const greet = latinGreetMap[region];
  if (scene === "talk") {
    const b1 = region === "tn" ? `${greet} Ana Fennec! Bech t-khalli el-batal yahki, nesta3mlou \xAB${sayWord}\xBB!` : `${greet} Ana Fennec! Bach tkhelli l-batl yehder, kansta3mlou \xAB${sayWord}\xBB!`;
    const b2 = `Zid \xAB${sayWord}\xBB w moraha \xABsalam\xBB bach ygoul mrahba b sout zwina!`;
    return {
      scene,
      greetingBadge: greet,
      bubbles: [
        { id: "intro", emoji: "\u{1F98A}", text: b1, keywordBadge: sayWord, sceneFocus: "intro" },
        { id: "action", emoji: "\u{1F5E3}\uFE0F", text: b2, keywordBadge: "salam", sceneFocus: "action" }
      ]
    };
  }
  if (scene === "twice") {
    const b1 = region === "tn" ? `El-ordinateur yaqra el-code men fouq l-louta ster b ster kif el-qissa!` : `L-ordinateur kayqra ster b ster men l-fouq l-te7t b7al chi qissa!`;
    const b2 = `L-lowla \xAB${sayWord} salam\xBB, w men ba3d \xAB${sayWord} ahlan\xBB b t-tartib!`;
    return {
      scene,
      greetingBadge: greet,
      bubbles: [
        { id: "step1", emoji: "1\uFE0F\u20E3", text: b1, keywordBadge: sayWord, sceneFocus: "branch-a" },
        { id: "step2", emoji: "2\uFE0F\u20E3", text: b2, keywordBadge: "1 \u2192 2", sceneFocus: "branch-b" }
      ]
    };
  }
  if (scene === "door") {
    const b1 = `Chouf l-bab s-sa7ri! \xAB${ifWord}\xBB kayssowel: wach l-bab meftou7?`;
    const b2 = `Melli tkoun \xAB${trueWord}\xBB, l-bab kayt7el w kaykhdem \xAB${sayWord}\xBB!`;
    return {
      scene,
      greetingBadge: greet,
      bubbles: [
        { id: "door-ask", emoji: "\u{1F6AA}", text: b1, keywordBadge: ifWord, sceneFocus: "branch-a" },
        { id: "door-open", emoji: "\u2705", text: b2, keywordBadge: trueWord, sceneFocus: "action" }
      ]
    };
  }
  if (scene === "sun-rain") {
    const b1 = `3endna jouj torqan: \xAB${ifWord}\xBB dyal ch-chams w \xAB${elseWord}\xBB dyal l-mtar!`;
    const b2 = `Melli tkoun \xAB${falseWord}\xBB, Fennec kaymchi direct l \xAB${elseWord}\xBB dyal l-mtar!`;
    return {
      scene,
      greetingBadge: greet,
      bubbles: [
        { id: "sun", emoji: "\u2600\uFE0F", text: b1, keywordBadge: `${ifWord} / ${elseWord}`, sceneFocus: "branch-a" },
        { id: "rain", emoji: "\u{1F327}\uFE0F", text: b2, keywordBadge: falseWord, sceneFocus: "branch-b" }
      ]
    };
  }
  if (scene === "ask") {
    const b1 = region === "tn" ? `${greet} B \xAB${inputWord}\xBB, Fennec yessowel: chnouwa esmek? w ykhazzno!` : `${greet} B \xAB${inputWord}\xBB, Fennec kayssowel 3la smiytek w kaykhezenha f sandouq!`;
    const b2 = `Men ba3d nsta3mlou \xAB${sayWord}\xBB bach nra7bou b hada l-ism!`;
    return {
      scene,
      greetingBadge: greet,
      bubbles: [
        { id: "ask-1", emoji: "\u{1F3A4}", text: b1, keywordBadge: inputWord, sceneFocus: "branch-a" },
        { id: "ask-2", emoji: "\u{1F5E3}\uFE0F", text: b2, keywordBadge: sayWord, sceneFocus: "action" }
      ]
    };
  }
  if (scene === "basket") {
    const b1 = `3endna qoffa! B \xAB${pushWord}\xBB kanzidou fiha fakiya jdida!`;
    const b2 = `W \xAB${lenWord}\xBB kat7seb ch7al kayn f l-qoffa w twerrina b \xAB${sayWord}\xBB!`;
    return {
      scene,
      greetingBadge: greet,
      bubbles: [
        { id: "basket-1", emoji: "\u{1F9FA}", text: b1, keywordBadge: pushWord, sceneFocus: "branch-a" },
        { id: "basket-2", emoji: "\u{1F4CF}", text: b2, keywordBadge: lenWord, sceneFocus: "action" }
      ]
    };
  }
  return {
    scene: "generic",
    greetingBadge: greet,
    bubbles: [
      {
        id: "gen-1",
        emoji: "\u{1F98A}",
        text: `${greet} Ana Fennec! F had d-dars kansta3mlou \xAB${sayWord}\xBB w \xAB${focusWord}\xBB!`,
        keywordBadge: focusWord,
        sceneFocus: "intro"
      },
      {
        id: "gen-2",
        emoji: "\u2728",
        text: `Retteb l-bataqat w bark 3la khdem bach tchouf l-batl!`,
        keywordBadge: sayWord,
        sceneFocus: "action"
      }
    ]
  };
}

// src/core/kidModeStudio.ts
function resolveKidLessonTier(lesson) {
  if (lesson.requires.includes("else") || lesson.requires.includes("push") || lesson.id === "kid-sun-rain" || lesson.id === "kid-basket") {
    return { band: "8-9", emoji: "\u{1F7E3}", labelKey: "kidLessonChallenge" };
  }
  if (lesson.requires.includes("if") || lesson.requires.includes("input") || lesson.id === "kid-door" || lesson.id === "kid-ask") {
    return { band: "6-7", emoji: "\u{1F7E1}", labelKey: "kidLessonMedium" };
  }
  return { band: "4-5", emoji: "\u{1F7E2}", labelKey: "kidLessonEasy" };
}
function filterKidLessonsForBand(lessons, band) {
  const allowedByBand = {
    "4-5": ["4-5"],
    "6-7": ["4-5", "6-7"],
    "8-9": ["4-5", "6-7", "8-9"]
  };
  const allowed = allowedByBand[band];
  const filtered = lessons.filter((l) => allowed.includes(resolveKidLessonTier(l).band));
  if (band === "8-9") {
    return [...filtered].sort((a, b) => {
      const rank = { "8-9": 0, "6-7": 1, "4-5": 2 };
      const ra = rank[resolveKidLessonTier(a).band];
      const rb = rank[resolveKidLessonTier(b).band];
      return ra !== rb ? ra - rb : a.order - b.order;
    });
  }
  return filtered;
}

// src/core/kidProgression.ts
function resolveKidTier(stars, override = "auto") {
  const autoBand = stars >= 9 ? "8-9" : stars >= 4 ? "6-7" : "4-5";
  const band = override === "auto" ? autoBand : override;
  if (band === "4-5") {
    const pct = Math.min(100, Math.round(stars / 4 * 100));
    return {
      band,
      levelNumber: 1,
      stars,
      nextBandThreshold: 4,
      progressPercent: pct,
      optionCount: 2,
      visualFirst: true
    };
  }
  if (band === "6-7") {
    const pct = Math.min(100, Math.round(Math.max(0, stars - 4) / 5 * 100));
    return {
      band,
      levelNumber: 2,
      stars,
      nextBandThreshold: 9,
      progressPercent: pct,
      optionCount: 3,
      visualFirst: true
    };
  }
  return {
    band: "8-9",
    levelNumber: 3,
    stars,
    nextBandThreshold: null,
    progressPercent: 100,
    optionCount: 4,
    visualFirst: true
  };
}
var CONCEPT_VISUAL_MAP = {
  print: "\u{1F5E3}\uFE0F",
  if: "\u{1F6AA}",
  else: "\u{1F500}",
  else_if: "\u{1F9ED}",
  while: "\u{1F501}",
  let: "\u{1F4E6}",
  true: "\u2705",
  false: "\u274C",
  and: "\u2795",
  or: "\u26A1",
  not: "\u{1F6AB}",
  hello: "\u{1F44B}",
  welcome: "\u{1F31F}",
  good: "\u{1F44D}",
  "good / okay": "\u{1F44D}",
  "very good": "\u{1F308}",
  fine: "\u{1F60A}",
  "doing fine": "\u{1F60A}",
  "thank you": "\u{1F64F}",
  thanks: "\u{1F64F}",
  work: "\u{1F6E0}\uFE0F",
  now: "\u23F1\uFE0F",
  a_lot: "\u{1F30A}",
  "a lot": "\u{1F30A}",
  "a little": "\u{1F331}",
  learning: "\u{1F4DA}",
  study: "\u{1F4D6}",
  knowledge: "\u{1F4A1}"
};
function visualForConcept(concept) {
  return CONCEPT_VISUAL_MAP[concept.toLowerCase()] ?? "\u{1F9E9}";
}

// src/core/kidVisualLogic.ts
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function wordsForConcept(pack, concept) {
  return Object.entries(pack.keywords).filter(([, c]) => c === concept).map(([w]) => w);
}
function stripQuotesAndParens(raw) {
  return raw.replace(/["'(){}]/g, " ").replace(/\s+/g, " ").trim();
}
function matchesAnyKeyword(line, words) {
  return words.some((w) => new RegExp(`(^|\\s)${escapeRegex(w)}(\\s|\\(|$)`, "i").test(line));
}
function formatDialectCardForKids(rawCard, pack, labels) {
  const trimmed = rawCard.trim();
  if (!trimmed || trimmed === "}") {
    return { icon: "\u{1F3C1}", text: labels.endStepWord, tone: "end" };
  }
  const printWords = wordsForConcept(pack, "print");
  const ifWords = wordsForConcept(pack, "if");
  const elseWords = wordsForConcept(pack, "else");
  const whileWords = wordsForConcept(pack, "while");
  const forWords = wordsForConcept(pack, "for");
  const letWords = wordsForConcept(pack, "let");
  const trueWords = wordsForConcept(pack, "true");
  const falseWords = wordsForConcept(pack, "false");
  const inputWords = wordsForConcept(pack, "input");
  const pushWords = wordsForConcept(pack, "push");
  const lenWords = wordsForConcept(pack, "len");
  const fnWords = wordsForConcept(pack, "fn");
  const returnWords = wordsForConcept(pack, "return");
  const lines = trimmed.split("\n").map((l) => l.trim()).filter((l) => l.length > 0 && l !== "}");
  if (lines.length > 1) {
    const parts = lines.map((l) => formatDialectCardForKids(l, pack, labels));
    return {
      icon: parts[0].icon,
      text: parts.map((p) => p.text).join(" \u2192 "),
      tone: parts[0].tone
    };
  }
  const single = lines[0] ?? trimmed;
  const bareArgMatch = /^\(\s*"([^"]+)"\s*\)$/.exec(single);
  if (bareArgMatch) {
    return {
      icon: "\u{1F4AC}",
      text: bareArgMatch[1],
      tone: "value"
    };
  }
  if (matchesAnyKeyword(single, elseWords)) {
    const cleanAfter = single.replace(new RegExp(elseWords.map(escapeRegex).join("|"), "gi"), "").replace(/[{}]/g, "").trim();
    if (!cleanAfter) {
      return { icon: "\u{1F500}", text: labels.elseWord, tone: "else" };
    }
    return {
      icon: "\u{1F500}",
      text: `${labels.elseWord}: ${stripQuotesAndParens(cleanAfter)}`,
      tone: "else"
    };
  }
  if (matchesAnyKeyword(single, ifWords)) {
    const condMatch = /\(([^)]+)\)/.exec(single);
    let condDisplay = condMatch?.[1]?.trim() ?? "";
    if (condDisplay) {
      if (trueWords.some((tw) => tw.toLowerCase() === condDisplay.toLowerCase())) {
        condDisplay = labels.trueWord.includes("\u2705") ? labels.trueWord : `\u2705 ${labels.trueWord}`;
      } else if (falseWords.some((fw) => fw.toLowerCase() === condDisplay.toLowerCase())) {
        condDisplay = labels.falseWord.includes("\u274C") ? labels.falseWord : `\u274C ${labels.falseWord}`;
      }
    }
    return {
      icon: "\u{1F6AA}",
      text: condDisplay ? `${labels.ifWord}: ${condDisplay}` : labels.ifWord,
      tone: "decision"
    };
  }
  if (matchesAnyKeyword(single, whileWords) || matchesAnyKeyword(single, forWords)) {
    const condMatch = /\(([^)]+)\)/.exec(single);
    const condDisplay = condMatch?.[1]?.trim() ?? "";
    return {
      icon: "\u{1F501}",
      text: condDisplay ? `${labels.loopWord}: ${condDisplay}` : labels.loopWord,
      tone: "loop"
    };
  }
  if (matchesAnyKeyword(single, fnWords)) {
    const cleanedFn = single.replace(new RegExp(`^(${fnWords.map(escapeRegex).join("|")})\\s+`, "i"), "").replace(/\{$/, "").trim();
    const label = labels.recipeWord ?? "Recipe";
    return {
      icon: "\u{1F9EA}",
      text: cleanedFn ? `${label}: ${cleanedFn}` : label,
      tone: "action"
    };
  }
  if (matchesAnyKeyword(single, returnWords)) {
    const cleanedRet = single.replace(new RegExp(`^(${returnWords.map(escapeRegex).join("|")})\\s*`, "i"), "").trim();
    const label = labels.returnWord ?? "Return";
    return {
      icon: "\u{1F381}",
      text: cleanedRet ? `${label}: ${cleanedRet}` : label,
      tone: "value"
    };
  }
  if (matchesAnyKeyword(single, printWords)) {
    const argMatch = /\((.+)\)\s*$/.exec(single);
    const innerRaw = argMatch ? argMatch[1] : "";
    const hasLen = matchesAnyKeyword(innerRaw, lenWords);
    const argText = stripQuotesAndParens(innerRaw);
    if (hasLen) {
      return {
        icon: "\u{1F5E3}\uFE0F",
        text: `${labels.sayWord}: \u{1F4CF} ${argText}`,
        tone: "action"
      };
    }
    return {
      icon: "\u{1F5E3}\uFE0F",
      text: argText ? `${labels.sayWord}: ${argText}` : labels.sayWord,
      tone: "action"
    };
  }
  if (matchesAnyKeyword(single, pushWords)) {
    const argMatch = /\(([^)]+)\)/.exec(single);
    const argText = argMatch ? stripQuotesAndParens(argMatch[1]) : "";
    const listLabel = labels.listWord ?? "Bag";
    return {
      icon: "\u2795",
      text: argText ? `${listLabel}: ${argText}` : listLabel,
      tone: "variable"
    };
  }
  if (matchesAnyKeyword(single, inputWords)) {
    const promptMatch = new RegExp(`(?:${inputWords.map(escapeRegex).join("|")})\\s*\\(([^)]*)\\)`, "i").exec(single);
    const promptText = promptMatch ? stripQuotesAndParens(promptMatch[1]) : "";
    const askLabel = labels.askWord ?? "Ask";
    return {
      icon: "\u{1F3A4}",
      text: promptText ? `${askLabel}: ${promptText}` : askLabel,
      tone: "variable"
    };
  }
  if (matchesAnyKeyword(single, lenWords)) {
    const argMatch = /\(([^)]+)\)/.exec(single);
    const argText = argMatch ? stripQuotesAndParens(argMatch[1]) : "";
    return {
      icon: "\u{1F4CF}",
      text: argText || single,
      tone: "value"
    };
  }
  if (matchesAnyKeyword(single, letWords)) {
    const cleaned = single.replace(new RegExp(`^(${letWords.map(escapeRegex).join("|")})\\s+`, "i"), "").trim();
    const isList = cleaned.includes("[");
    return {
      icon: isList ? "\u{1F392}" : "\u{1F4E6}",
      text: `${isList ? labels.listWord ?? labels.varWord : labels.varWord}: ${cleaned}`,
      tone: "variable"
    };
  }
  if (/^[a-zA-Z0-9_\u0600-\u06FF]+\s*=/.test(single)) {
    return {
      icon: "\u2795",
      text: single,
      tone: "variable"
    };
  }
  return {
    icon: "\u{1F9E9}",
    text: stripQuotesAndParens(single) || single,
    tone: "value"
  };
}
function parseCodeStepsForKids(rawCode, pack, labels) {
  const lines = rawCode.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const steps = [];
  for (const line of lines) {
    if (line === "}") continue;
    if (line.startsWith("}")) {
      const rest = line.slice(1).trim();
      if (!rest) continue;
      steps.push(formatDialectCardForKids(rest, pack, labels));
      continue;
    }
    steps.push(formatDialectCardForKids(line, pack, labels));
  }
  return steps;
}

// src/core/pack.ts
var UNSAFE_CHARS = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
var ID_REGEX = /^[a-z0-9][a-z0-9-]{1,39}$/i;
var SEMVER_REGEX = /^\d+\.\d+\.\d+$/;
var HEX64_REGEX = /^[0-9a-f]{64}$/i;
var MAX_PACK_JSON_BYTES = 256 * 1024;
var MAX_STARTER_CODE_CHARS = 2e4;
function isRecord(val) {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}
function sanitizeStringMap(raw, maxEntries = 600) {
  if (!isRecord(raw) || hasForbiddenKeys(raw)) return null;
  const entries = Object.entries(raw);
  if (entries.length > maxEntries) return null;
  const out = /* @__PURE__ */ Object.create(null);
  for (const [k, v] of entries) {
    if (typeof k !== "string" || typeof v !== "string") return null;
    if (!k.trim() || k.length > 64 || v.length > 240) return null;
    if (UNSAFE_CHARS.test(k) || UNSAFE_CHARS.test(v) || containsTrojanOrControlChars(k, { allowNewlines: false }) || containsTrojanOrControlChars(v, { allowNewlines: false })) {
      return null;
    }
    out[k] = v;
  }
  return out;
}
function validateDialectPack(raw) {
  if (!isRecord(raw) || hasForbiddenKeys(raw)) {
    return { ok: false, error: "Invalid pack object or forbidden prototype key." };
  }
  if (typeof raw.id !== "string" || !ID_REGEX.test(raw.id)) {
    return { ok: false, error: "Invalid dialect pack id." };
  }
  if (typeof raw.name !== "string" || !raw.name.trim() || raw.name.length > 80 || UNSAFE_CHARS.test(raw.name) || containsTrojanOrControlChars(raw.name, { allowNewlines: false })) {
    return { ok: false, error: "Invalid dialect pack name." };
  }
  if (typeof raw.nativeName !== "string" || !raw.nativeName.trim() || raw.nativeName.length > 80 || UNSAFE_CHARS.test(raw.nativeName) || containsTrojanOrControlChars(raw.nativeName, { allowNewlines: false })) {
    return { ok: false, error: "Invalid dialect nativeName." };
  }
  if (typeof raw.version !== "string" || !SEMVER_REGEX.test(raw.version)) {
    return { ok: false, error: "Invalid semver pack version." };
  }
  const script = raw.script;
  if (script !== "Latin" && script !== "Arabic" && script !== "Tifinagh") {
    return { ok: false, error: "Invalid script (must be Latin, Arabic, or Tifinagh)." };
  }
  const reviewStatus = raw.reviewStatus;
  if (reviewStatus !== "verified" && reviewStatus !== "pending") {
    return { ok: false, error: "Invalid reviewStatus." };
  }
  const keywords = sanitizeStringMap(raw.keywords, 200);
  if (!keywords || Object.keys(keywords).length === 0) {
    return { ok: false, error: "Invalid or empty keywords map." };
  }
  const vocabulary = sanitizeStringMap(raw.vocabulary, 600);
  if (!vocabulary) {
    return { ok: false, error: "Invalid vocabulary map." };
  }
  const starterCode = typeof raw.starterCode === "string" ? raw.starterCode : "";
  if (starterCode.length > MAX_STARTER_CODE_CHARS || UNSAFE_CHARS.test(starterCode.replace(/\n|\r|\t/g, "")) || containsTrojanOrControlChars(starterCode, { allowNewlines: true })) {
    return { ok: false, error: "Unsafe control or directional characters in starterCode." };
  }
  const safeStringField = (val, maxLen) => {
    if (typeof val !== "string") return "";
    const trimmed = val.trim().slice(0, maxLen);
    return UNSAFE_CHARS.test(trimmed) || containsTrojanOrControlChars(trimmed, { allowNewlines: false }) ? "" : trimmed;
  };
  let sanitizedMeta;
  if (isRecord(raw.meta) && !hasForbiddenKeys(raw.meta)) {
    const cleanMeta = /* @__PURE__ */ Object.create(null);
    for (const [mKey, mVal] of Object.entries(raw.meta).slice(0, 400)) {
      if (FORBIDDEN_PROTO_KEYS.has(mKey) || !isRecord(mVal) || hasForbiddenKeys(mVal) || containsTrojanOrControlChars(mKey, { allowNewlines: false })) {
        continue;
      }
      cleanMeta[mKey] = {
        role: safeStringField(mVal.role, 80) || void 0,
        analogy: safeStringField(mVal.analogy, 240) || void 0,
        example: safeStringField(mVal.example, 240) || void 0
      };
    }
    sanitizedMeta = cleanMeta;
  }
  return {
    ok: true,
    pack: {
      id: raw.id,
      code: safeStringField(raw.code, 40) || raw.id,
      name: raw.name,
      nativeName: raw.nativeName,
      country: safeStringField(raw.country, 80),
      regionLabel: safeStringField(raw.regionLabel, 120),
      script,
      rtl: Boolean(raw.rtl),
      iso639_3: safeStringField(raw.iso639_3, 12) || void 0,
      reviewStatus,
      requiresConsent: typeof raw.requiresConsent === "boolean" ? raw.requiresConsent : reviewStatus === "pending",
      version: raw.version,
      description: safeStringField(raw.description, 400),
      tribute: safeStringField(raw.tribute, 240) || void 0,
      keywords,
      vocabulary,
      starterCode,
      meta: sanitizedMeta
    }
  };
}
async function computeSha256Hex(text) {
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
    const encoded = new TextEncoder().encode(text);
    const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return sha256HexSync(text);
}
async function verifyPackIntegrity(serializedJson, expectedSha256, expectedBytes) {
  if (!HEX64_REGEX.test(expectedSha256)) {
    return { ok: false, error: "Malformed catalog SHA-256 digest." };
  }
  const actualBytes = new TextEncoder().encode(serializedJson).length;
  if (actualBytes > MAX_PACK_JSON_BYTES) {
    return { ok: false, error: "Pack payload exceeds maximum allowed size." };
  }
  if (actualBytes !== expectedBytes) {
    return { ok: false, error: `Byte size mismatch: expected ${expectedBytes}, got ${actualBytes}.` };
  }
  const actualHash = await computeSha256Hex(serializedJson);
  if (!constantTimeEqual(actualHash.toLowerCase(), expectedSha256.toLowerCase())) {
    return { ok: false, error: "SHA-256 verification failed." };
  }
  return { ok: true };
}

// src/core/packStore.ts
var MAX_INSTALLED_PACKS_BYTES = 512 * 1024;
var MAX_INSTALLED_PACKS_COUNT = 30;
function resolveDialectPack(starter, installedMap) {
  const installed = installedMap[starter.id];
  if (installed) {
    const check = validateDialectPack(installed);
    if (check.ok) {
      return {
        source: "downloaded",
        pack: check.pack,
        installedVersion: check.pack.version
      };
    }
  }
  return {
    source: "example",
    pack: starter
  };
}
async function buildAndVerifyFullPack(starter, fullData) {
  const payload = JSON.stringify(fullData);
  const bytes = new TextEncoder().encode(payload).length;
  const sha256 = await computeSha256Hex(payload);
  const integrity = await verifyPackIntegrity(payload, sha256, bytes);
  if (!integrity.ok) {
    return { ok: false, error: integrity.error };
  }
  const parsedResult = safeJsonParse(payload, MAX_INSTALLED_PACKS_BYTES);
  if (!parsedResult.ok) {
    return { ok: false, error: "Corrupted pack JSON." };
  }
  const check = validateDialectPack(parsedResult.value);
  if (!check.ok) {
    return { ok: false, error: check.error };
  }
  if (check.pack.id !== starter.id) {
    return { ok: false, error: "Pack id mismatch." };
  }
  return { ok: true, pack: check.pack, sha256, bytes };
}
function loadValidatedInstalledPacks(rawJson) {
  if (!rawJson) return {};
  const parsedResult = safeJsonParse(rawJson, MAX_INSTALLED_PACKS_BYTES);
  if (!parsedResult.ok) return {};
  const parsed = parsedResult.value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out = /* @__PURE__ */ Object.create(null);
  let count = 0;
  for (const [id, candidate] of Object.entries(parsed)) {
    if (count >= MAX_INSTALLED_PACKS_COUNT) break;
    const check = validateDialectPack(candidate);
    if (check.ok && check.pack.id === id) {
      out[id] = check.pack;
      count++;
    }
  }
  return out;
}

// src/data/dialects.ts
function makeMeta(kw, rtl) {
  const find = (concept) => Object.entries(kw).find(([, c]) => c === concept)?.[0] ?? concept;
  const p = find("print");
  const i = find("if");
  const ei = find("else_if");
  const e = find("else");
  const w = find("while");
  const l = find("let");
  const t = find("true");
  const f = find("false");
  const fnKw = find("fn");
  const retKw = find("return");
  const forKw = find("for");
  const inpKw = find("input");
  const lenKw = find("len");
  const pushKw = find("push");
  return {
    [p]: {
      role: "print \u2014 Standard output",
      analogy: rtl ? "\u0645\u062B\u0644 \u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0644\u0629 \u0645\u0643\u062A\u0648\u0628\u0629 \u0639\u0644\u0649 \u0627\u0644\u0634\u0627\u0634\u0629 \u0644\u064A\u0642\u0631\u0623\u0647\u0627 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0641\u0648\u0631\u0627\u064B." : "Like speaking out loud or writing a message on the screen for the user.",
      example: `${p}("Salam!")`
    },
    [i]: {
      role: "if \u2014 Conditional branch",
      analogy: rtl ? "\u0645\u062B\u0644 \u0628\u0648\u0627\u0628\u0629 \u062A\u0641\u062A\u062D \u0641\u0642\u0637 \u0639\u0646\u062F\u0645\u0627 \u064A\u0643\u0648\u0646 \u0627\u0644\u0634\u0631\u0637 \u0635\u062D\u064A\u062D\u0627\u064B." : "A decision gate: only runs the block inside if the condition is true.",
      example: `${i} (${t}) {
  ${p}("OK")
}`
    },
    [ei]: {
      role: "else_if \u2014 Chained condition",
      analogy: rtl ? "\u062E\u064A\u0627\u0631 \u062B\u0627\u0646\u064D \u0646\u062E\u062A\u0628\u0631\u0647 \u0625\u0630\u0627 \u0644\u0645 \u064A\u062A\u062D\u0642\u0642 \u0627\u0644\u0634\u0631\u0637 \u0627\u0644\u0623\u0648\u0644." : "Checks a fallback condition if the first condition was false.",
      example: `${i} (x > 10) {
  ${p}("Big")
} ${ei} (x == 10) {
  ${p}("Equal")
}`
    },
    [e]: {
      role: "else \u2014 Fallback branch",
      analogy: rtl ? "\u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0627\u0644\u0630\u064A \u064A\u0639\u0645\u0644 \u0625\u0630\u0627 \u0644\u0645 \u062A\u0646\u062C\u062D \u0627\u0644\u0634\u0631\u0648\u0637 \u0627\u0644\u0633\u0627\u0628\u0642\u0629." : "The backup path that runs whenever earlier conditions were false.",
      example: `${i} (${f}) {
  ${p}("A")
} ${e} {
  ${p}("B")
}`
    },
    [w]: {
      role: "while \u2014 Conditional loop",
      analogy: rtl ? "\u0645\u062B\u0644 \u0639\u062C\u0644\u0629 \u062A\u0633\u062A\u0645\u0631 \u0628\u0627\u0644\u062F\u0648\u0631\u0627\u0646 \u0637\u0627\u0644\u0645\u0627 \u0627\u0644\u0634\u0631\u0637 \u0645\u0627 \u0632\u0627\u0644 \u0645\u062A\u062D\u0642\u0642\u0627\u064B." : "Repeats the block inside as long as its condition evaluates to true.",
      example: `${w} (x < 3) {
  ${p}(x)
  x = x + 1
}`
    },
    [forKw]: {
      role: "for \u2014 Counted or list iteration loop",
      analogy: rtl ? "\u0645\u062B\u0644 \u0639\u062F\u0627\u062F \u064A\u0645\u0634\u064A \u0639\u0644\u0649 \u0646\u0637\u0627\u0642 \u0623\u0631\u0642\u0627\u0645 \u0623\u0648 \u064A\u0632\u0648\u0631 \u0643\u0644 \u0639\u0646\u0635\u0631 \u0641\u064A \u0627\u0644\u0642\u0627\u0626\u0645\u0629." : "Walks automatically through a range like 1..5 or every item inside a list.",
      example: `${forKw} (n : 1..3) {
  ${p}(n)
}`
    },
    [l]: {
      role: "let \u2014 Variable declaration",
      analogy: rtl ? "\u0645\u062B\u0644 \u0635\u0646\u062F\u0648\u0642 \u0635\u063A\u064A\u0631 \u062A\u0636\u0639 \u0641\u064A\u0647 \u0631\u0642\u0645\u0627\u064B \u0623\u0648 \u0643\u0644\u0645\u0629 \u0648\u062A\u0633\u0645\u064A\u0647 \u0628\u0627\u0633\u0645 \u0648\u0627\u0636\u062D." : "A labeled box in memory where you store a number, text, or boolean.",
      example: `${l} score = 10
${p}(score)`
    },
    [fnKw]: {
      role: "fn \u2014 Function declaration",
      analogy: rtl ? "\u0645\u062B\u0644 \u0648\u0635\u0641\u0629 \u062C\u0627\u0647\u0632\u0629 \u062A\u0639\u0637\u064A\u0647\u0627 \u0627\u0633\u0645\u0627\u064B \u0648\u0645\u062F\u062E\u0644\u0627\u062A \u0644\u062A\u0633\u062A\u0639\u0645\u0644\u0647\u0627 \u0641\u064A \u0623\u064A \u0648\u0642\u062A." : "A reusable mini-program or recipe you name once and call whenever needed.",
      example: `${fnKw} double(x) {
  ${retKw} x * 2
}
${p}(double(5))`
    },
    [retKw]: {
      role: "return \u2014 Output from a function",
      analogy: rtl ? "\u0645\u062B\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u0646\u0647\u0627\u0626\u064A\u0629 \u0645\u0646 \u0627\u0644\u062F\u0627\u0644\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u0643\u0627\u0646 \u0627\u0644\u0630\u064A \u0627\u0633\u062A\u062F\u0639\u0627\u0647\u0627." : "Hands a computed answer back from a function to its caller.",
      example: `${fnKw} add(a, b) {
  ${retKw} a + b
}`
    },
    [inpKw]: {
      role: "input \u2014 Interactive user prompt",
      analogy: rtl ? "\u0645\u062B\u0644 \u0637\u0631\u062D \u0633\u0624\u0627\u0644 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0641\u064A \u0627\u0644\u0643\u0648\u0646\u0633\u0648\u0644 \u0648\u0627\u0646\u062A\u0638\u0627\u0631 \u062C\u0648\u0627\u0628\u0647." : "Pauses and asks the user a question right inside the console.",
      example: `${l} name = ${inpKw}("Name?")
${p}(name)`
    },
    [lenKw]: {
      role: "len \u2014 List or text length",
      analogy: rtl ? "\u064A\u062D\u0633\u0628 \u0639\u062F\u062F \u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0645\u0648\u062C\u0648\u062F\u0629 \u0641\u064A \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0623\u0648 \u0639\u062F\u062F \u0627\u0644\u062D\u0631\u0648\u0641 \u0641\u064A \u0627\u0644\u0646\u0635." : "Counts how many items are inside a list or characters in text.",
      example: `${l} nums = [10, 20, 30]
${p}(${lenKw}(nums))`
    },
    [pushKw]: {
      role: "push \u2014 Append item to list",
      analogy: rtl ? "\u064A\u0636\u064A\u0641 \u0639\u0646\u0635\u0631\u0627\u064B \u062C\u062F\u064A\u062F\u0627\u064B \u0625\u0644\u0649 \u0622\u062E\u0631 \u0627\u0644\u0642\u0627\u0626\u0645\u0629." : "Adds a new value onto the end of a list.",
      example: `${l} items = [1, 2]
${pushKw}(items, 3)
${p}(items)`
    },
    [t]: {
      role: "true \u2014 Boolean truth",
      analogy: rtl ? "\u0627\u0644\u0636\u0648\u0621 \u0627\u0644\u0623\u062E\u0636\u0631 \u0623\u0648 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0628\u0646\u0639\u0645 \u0641\u064A \u0627\u0644\u0645\u0646\u0637\u0642 \u0627\u0644\u0628\u0631\u0645\u062C\u064A." : 'The logical "yes" or green-light state in conditions.',
      example: `${p}(${t})`
    },
    [f]: {
      role: "false \u2014 Boolean falsehood",
      analogy: rtl ? "\u0627\u0644\u0636\u0648\u0621 \u0627\u0644\u0623\u062D\u0645\u0631 \u0623\u0648 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0628\u0644\u0627 \u0641\u064A \u0627\u0644\u0645\u0646\u0637\u0642 \u0627\u0644\u0628\u0631\u0645\u062C\u064A." : 'The logical "no" or closed-gate state in conditions.',
      example: `${p}(${f})`
    }
  };
}
var STARTER_DIALECT_PACKS = [
  {
    id: "tn-latn",
    code: "tn-latn",
    name: "Tounsi Franco",
    nativeName: "Tounsi Franco",
    country: "Tunisia",
    regionLabel: "Tunisia \xB7 aeb",
    script: "Latin",
    rtl: false,
    iso639_3: "aeb",
    reviewStatus: "pending",
    requiresConsent: true,
    version: "1.0.0",
    description: "Tunisian Darija in Franco-Latin script \u2014 inspired by the Ncodi initiative by Aziz Amari.",
    tribute: "Dedicated to Aziz Amari (Ncodi pioneer)",
    keywords: {
      ktab: "print",
      oul: "print",
      "9oul": "print",
      goul: "print",
      effa7: "print",
      idha: "if",
      ken: "if",
      "idha ken": "else_if",
      "wela idha": "else_if",
      bla: "else",
      wela: "else",
      madem: "while",
      madam: "while",
      "fi 7in": "while",
      bch: "let",
      khalli: "let",
      s7i7: "true",
      haqq: "true",
      ghalet: "false",
      kethb: "false",
      w: "and",
      walla: "or",
      mouch: "not",
      dalla: "fn",
      raja3: "return",
      rja3: "return",
      lkoll: "for",
      kol: "for",
      a9ra: "input",
      es2el: "input",
      toul: "len",
      zid: "push"
    },
    vocabulary: {
      salam: "hello",
      marhba: "welcome",
      labes: "doing fine",
      "3aychek": "thank you",
      barsha: "a lot",
      behi: "good / okay",
      chwaya: "a little",
      tawa: "now",
      ghodwa: "tomorrow",
      khedma: "work",
      maktba: "library",
      ta3alloum: "learning"
    },
    starterCode: `khalli compteur = 1
ktab("Marhba bik fi Bayda Maghreb!")
idha (compteur == 1) {
  ktab("Tounsi Franco yehki m3a JS w Python")
} wela {
  ktab("Bidel el qima")
}
madem (compteur <= 3) {
  ktab("Khatwa", compteur)
  compteur = compteur + 1
}`
  },
  {
    id: "tn-arab",
    code: "tn-arab",
    name: "Tunisian Arabic",
    nativeName: "\u062A\u0648\u0646\u0633\u064A\u0629 (\u062D\u0631\u0641 \u0639\u0631\u0628\u064A)",
    country: "Tunisia",
    regionLabel: "Tunisia \xB7 aeb",
    script: "Arabic",
    rtl: true,
    iso639_3: "aeb",
    reviewStatus: "verified",
    requiresConsent: false,
    version: "1.0.0",
    description: "Tunisian Darija in Arabic script \u2014 inspired by the Naftah initiative by Chakib Daii.",
    tribute: "Dedicated to Chakib Daii (Naftah pioneer)",
    keywords: {
      \u0627\u0643\u062A\u0628: "print",
      \u0642\u0648\u0644: "print",
      \u0625\u0630\u0627: "if",
      \u0644\u0648\u0643\u0627\u0646: "if",
      "\u0625\u0630\u0627 \u0643\u0627\u0646": "else_if",
      "\u0648\u0625\u0644\u0627 \u0625\u0630\u0627": "else_if",
      \u0648\u0625\u0644\u0627: "else",
      \u0645\u0627\u062F\u0627\u0645: "while",
      \u0637\u0627\u0644\u0645\u0627: "while",
      \u062E\u0644\u064A: "let",
      \u0645\u062A\u063A\u064A\u0631: "let",
      \u0635\u062D\u064A\u062D: "true",
      \u062D\u0642: "true",
      \u063A\u0627\u0644\u0637: "false",
      \u0648: "and",
      \u0623\u0648: "or",
      \u0645\u0634: "not",
      \u062F\u0627\u0644\u0629: "fn",
      \u0631\u062C\u0639: "return",
      \u0644\u0643\u0644: "for",
      \u0627\u0642\u0631\u0627: "input",
      \u0627\u0633\u0627\u0644: "input",
      \u0637\u0648\u0644: "len",
      \u0632\u064A\u062F: "push"
    },
    vocabulary: {
      \u0633\u0644\u0627\u0645: "hello",
      \u0645\u0631\u062D\u0628\u0627: "welcome",
      \u0644\u0627\u0628\u0627\u0633: "fine",
      \u0639\u064A\u0634\u0643: "thank you",
      \u0628\u0631\u0634\u0627: "a lot",
      \u0628\u0627\u0647\u064A: "good",
      \u062A\u0648\u0627: "now",
      \u0634\u0648\u064A\u0629: "a little",
      \u062E\u062F\u0645\u0629: "work",
      \u062A\u0639\u0644\u0645: "learning"
    },
    starterCode: `\u062E\u0644\u064A \u0639\u062F\u0627\u062F = 1
\u0627\u0643\u062A\u0628("\u0645\u0631\u062D\u0628\u0627 \u0628\u064A\u0643 \u0641\u064A \u0628\u064A\u0636\u0627\u0621 \u0645\u063A\u0631\u0628!")
\u0625\u0630\u0627 (\u0639\u062F\u0627\u062F == 1) {
  \u0627\u0643\u062A\u0628("\u0627\u0644\u062A\u0648\u0646\u0633\u064A\u0629 \u062A\u062A\u062D\u0648\u0644 \u0625\u0644\u0649 \u062E\u0648\u0627\u0631\u0632\u0645\u064A\u0627\u062A \u0648JS")
} \u0648\u0625\u0644\u0627 {
  \u0627\u0643\u062A\u0628("\u062C\u0631\u0628 \u0642\u064A\u0645\u0629 \u0623\u062E\u0631\u0649")
}
\u0645\u0627\u062F\u0627\u0645 (\u0639\u062F\u0627\u062F <= 3) {
  \u0627\u0643\u062A\u0628("\u062E\u0637\u0648\u0629", \u0639\u062F\u0627\u062F)
  \u0639\u062F\u0627\u062F = \u0639\u062F\u0627\u062F + 1
}`
  },
  {
    id: "dz-latn",
    code: "dz-latn",
    name: "Algerian Franco",
    nativeName: "Dzayer Franco",
    country: "Algeria",
    regionLabel: "Algeria \xB7 arq",
    script: "Latin",
    rtl: false,
    iso639_3: "arq",
    reviewStatus: "pending",
    requiresConsent: true,
    version: "1.0.0",
    description: "Algerian Darija in Franco-Latin script (starter pack; install Full Pack to unlock while loops).",
    keywords: {
      kteb: "print",
      goul: "print",
      "9oul": "print",
      ila: "if",
      idha: "if",
      lokan: "if",
      "ila kan": "else_if",
      "wela ila": "else_if",
      wela: "else",
      sinon: "else",
      dir: "let",
      khal: "let",
      sa7: "true",
      haq: "true",
      ghalet: "false",
      w: "and",
      wala: "or",
      machi: "not",
      dalla: "fn",
      reja3: "return",
      rja3: "return",
      lkoul: "for",
      koul: "for",
      aqra: "input",
      sa9si: "input",
      toul: "len",
      zid: "push"
    },
    vocabulary: {
      salam: "hello",
      marahba: "welcome",
      labas: "fine",
      sahit: "thank you",
      bzzaf: "a lot",
      mlih: "good",
      dok: "now",
      chwiya: "a little",
      khedma: "work",
      qraya: "study"
    },
    starterCode: `dir n = 1
goul("Salam Dzayer!")
ila (n == 1) {
  goul("El code b el darja yethawal l 7 loghat")
} wela {
  goul("Ghalet")
}`
  },
  {
    id: "dz-arab",
    code: "dz-arab",
    name: "Algerian Arabic",
    nativeName: "\u062C\u0632\u0627\u0626\u0631\u064A\u0629 (\u062D\u0631\u0641 \u0639\u0631\u0628\u064A)",
    country: "Algeria",
    regionLabel: "Algeria \xB7 arq",
    script: "Arabic",
    rtl: true,
    iso639_3: "arq",
    reviewStatus: "verified",
    requiresConsent: false,
    version: "1.0.0",
    description: "Algerian Darija in Arabic script.",
    keywords: {
      \u0627\u0643\u062A\u0628: "print",
      \u0642\u0648\u0644: "print",
      \u0625\u0644\u0649: "if",
      \u0625\u0630\u0627: "if",
      \u0644\u0648\u0643\u0627\u0646: "if",
      "\u0625\u0644\u0649 \u0643\u0627\u0646": "else_if",
      "\u0648\u0644\u0627 \u0625\u0630\u0627": "else_if",
      \u0648\u0644\u0627: "else",
      \u0648\u0625\u0644\u0627: "else",
      \u0645\u0627\u062F\u0627\u0645: "while",
      \u0645\u0627\u062D\u062F: "while",
      \u062F\u064A\u0631: "let",
      \u0645\u062A\u063A\u064A\u0631: "let",
      \u0635\u062D: "true",
      \u063A\u0627\u0644\u0637: "false",
      \u0648: "and",
      \u0623\u0648: "or",
      \u0645\u0627\u0634\u064A: "not",
      \u062F\u0627\u0644\u0629: "fn",
      \u0631\u062C\u0639: "return",
      \u0644\u0643\u0644: "for",
      \u0627\u0642\u0631\u0627: "input",
      \u0633\u0642\u0633\u064A: "input",
      \u0637\u0648\u0644: "len",
      \u0632\u064A\u062F: "push"
    },
    vocabulary: {
      \u0633\u0644\u0627\u0645: "hello",
      \u0645\u0631\u062D\u0628\u0627: "welcome",
      \u0644\u0627\u0628\u0627\u0633: "fine",
      \u0635\u062D\u064A\u062A: "thank you",
      \u0628\u0632\u0627\u0641: "a lot",
      \u0645\u0644\u064A\u062D: "good",
      \u062F\u0648\u0643: "now",
      \u0634\u0648\u064A\u0629: "a little",
      \u0642\u0631\u0627\u064A\u0629: "study"
    },
    starterCode: `\u062F\u064A\u0631 \u062E\u0637\u0648\u0629 = 1
\u0642\u0648\u0644("\u0633\u0644\u0627\u0645 \u0645\u0646 \u0627\u0644\u062C\u0632\u0627\u0626\u0631!")
\u0625\u0644\u0649 (\u062E\u0637\u0648\u0629 == 1) {
  \u0642\u0648\u0644("\u0627\u0644\u062F\u0627\u0631\u062C\u0629 \u0627\u0644\u062C\u0632\u0627\u0626\u0631\u064A\u0629 \u0628\u0627\u0644\u062E\u0648\u0627\u0631\u0632\u0645\u064A\u0627\u062A")
} \u0648\u0644\u0627 {
  \u0642\u0648\u0644("\u0642\u064A\u0645\u0629 \u062B\u0627\u0646\u064A\u0629")
}
\u0645\u0627\u062F\u0627\u0645 (\u062E\u0637\u0648\u0629 <= 3) {
  \u0642\u0648\u0644("\u062F\u0648\u0631\u0629", \u062E\u0637\u0648\u0629)
  \u062E\u0637\u0648\u0629 = \u062E\u0637\u0648\u0629 + 1
}`
  },
  {
    id: "ma-latn",
    code: "ma-latn",
    name: "Moroccan Darija (Latin)",
    nativeName: "\u0627\u0644\u062F\u0627\u0631\u062C\u0629 \u0627\u0644\u0645\u063A\u0631\u0628\u064A\u0629",
    country: "Morocco",
    regionLabel: "Morocco \xB7 ary",
    script: "Latin",
    rtl: false,
    iso639_3: "ary",
    reviewStatus: "verified",
    requiresConsent: false,
    version: "1.0.0",
    description: "Moroccan Darija in Latin/Franco script.",
    keywords: {
      kteb: "print",
      goul: "print",
      "9oul": "print",
      ila: "if",
      idha: "if",
      "ila kan": "else_if",
      "olla ila": "else_if",
      olla: "else",
      wala: "else",
      madam: "while",
      ma7ed: "while",
      khdem: "let",
      dir: "let",
      bsa7: "true",
      s7i7: "true",
      ghalat: "false",
      w: "and",
      aw: "or",
      machi: "not",
      dalla: "fn",
      rje3: "return",
      rja3: "return",
      lkoul: "for",
      kol: "for",
      qra: "input",
      sewel: "input",
      toul: "len",
      zid: "push"
    },
    vocabulary: {
      salam: "hello",
      mrahba: "welcome",
      labas: "fine",
      choukran: "thank you",
      bzaf: "a lot",
      mezyan: "good",
      daba: "now",
      chwiya: "a little",
      khedma: "work",
      qraya: "learning"
    },
    starterCode: `dir i = 1
kteb("Mrahba f Maghreb!")
ila (i == 1) {
  kteb("Darija kat-tbadel l Python w C++")
} olla {
  kteb("Bdel i")
}
madam (i <= 3) {
  kteb("Mra", i)
  i = i + 1
}`
  },
  {
    id: "ma-arab",
    code: "ma-arab",
    name: "Moroccan Darija (Arabic)",
    nativeName: "\u0645\u063A\u0631\u0628\u064A\u0629 (\u062D\u0631\u0641 \u0639\u0631\u0628\u064A)",
    country: "Morocco",
    regionLabel: "Morocco \xB7 ary",
    script: "Arabic",
    rtl: true,
    iso639_3: "ary",
    reviewStatus: "verified",
    requiresConsent: false,
    version: "1.0.0",
    description: "Moroccan Darija in Arabic script \u2014 inspired by Darija-Lang community pioneers.",
    tribute: "Dedicated to Darija-Lang community pioneers",
    keywords: {
      \u0627\u0643\u062A\u0628: "print",
      \u0642\u0648\u0644: "print",
      \u0625\u0644\u0649: "if",
      \u0625\u0630\u0627: "if",
      "\u0625\u0644\u0649 \u0643\u0627\u0646": "else_if",
      "\u0623\u0648\u0644\u0627 \u0625\u0630\u0627": "else_if",
      \u0623\u0648\u0644\u0627: "else",
      \u0648\u0625\u0644\u0627: "else",
      \u0645\u0627\u062F\u0627\u0645: "while",
      \u0645\u0627\u062D\u062F: "while",
      \u062F\u064A\u0631: "let",
      \u0628\u0635\u062D: "true",
      \u0635\u062D\u064A\u062D: "true",
      \u063A\u0627\u0644\u0637: "false",
      \u0648: "and",
      \u0623\u0648: "or",
      \u0645\u0627\u0634\u064A: "not",
      \u062F\u0627\u0644\u0629: "fn",
      \u0631\u062C\u0639: "return",
      \u0644\u0643\u0644: "for",
      \u0642\u0631\u0627: "input",
      \u0633\u0648\u0644: "input",
      \u0637\u0648\u0644: "len",
      \u0632\u064A\u062F: "push"
    },
    vocabulary: {
      \u0633\u0644\u0627\u0645: "hello",
      \u0645\u0631\u062D\u0628\u0627: "welcome",
      \u0644\u0627\u0628\u0627\u0633: "fine",
      \u0634\u0643\u0631\u0627: "thank you",
      \u0628\u0632\u0627\u0641: "a lot",
      \u0645\u0632\u064A\u0627\u0646: "good",
      \u062F\u0627\u0628\u0627: "now",
      \u0634\u0648\u064A\u0629: "a little",
      \u062E\u062F\u0645\u0629: "work"
    },
    starterCode: `\u062F\u064A\u0631 \u0631\u0642\u0645 = 1
\u0627\u0643\u062A\u0628("\u0645\u0631\u062D\u0628\u0627 \u0628\u0627\u0644\u062F\u0627\u0631\u062C\u0629 \u0627\u0644\u0645\u063A\u0631\u0628\u064A\u0629!")
\u0625\u0644\u0649 (\u0631\u0642\u0645 == 1) {
  \u0627\u0643\u062A\u0628("\u062A\u0631\u062C\u0645\u0629 \u0641\u0648\u0631\u064A\u0629 \u0644\u0644\u063A\u0627\u062A \u0627\u0644\u0628\u0631\u0645\u062C\u0629")
} \u0623\u0648\u0644\u0627 {
  \u0627\u0643\u062A\u0628("\u0634\u064A\u0621 \u0622\u062E\u0631")
}
\u0645\u0627\u062F\u0627\u0645 (\u0631\u0642\u0645 <= 3) {
  \u0627\u0643\u062A\u0628("\u0645\u062D\u0627\u0648\u0644\u0629", \u0631\u0642\u0645)
  \u0631\u0642\u0645 = \u0631\u0642\u0645 + 1
}`
  },
  {
    id: "ly-latn",
    code: "ly-latn",
    name: "Libyan Franco",
    nativeName: "Libya Franco",
    country: "Libya",
    regionLabel: "Libya \xB7 ayl",
    script: "Latin",
    rtl: false,
    iso639_3: "ayl",
    reviewStatus: "pending",
    requiresConsent: true,
    version: "1.0.0",
    description: "Libyan dialect in Franco-Latin script (starter pack; install Full Pack to unlock while loops).",
    keywords: {
      akteb: "print",
      goul: "print",
      "9oul": "print",
      law: "if",
      idha: "if",
      "law kan": "else_if",
      "aw law": "else_if",
      wala: "else",
      ghayr: "else",
      khal: "let",
      dir: "let",
      haq: "true",
      sa7: "true",
      ghalat: "false",
      w: "and",
      aw: "or",
      mish: "not",
      dalla: "fn",
      raja3: "return",
      rja3: "return",
      lkoll: "for",
      kol: "for",
      iqra: "input",
      is2al: "input",
      tool: "len",
      toul: "len",
      zeed: "push",
      zid: "push"
    },
    vocabulary: {
      ahlan: "hello",
      marhba: "welcome",
      bahy: "good",
      mashkour: "thank you",
      helba: "a lot",
      tawa: "now",
      shwaya: "a little",
      shoghl: "work",
      qraya: "reading"
    },
    starterCode: `dir x = 1
goul("Ahlan Libya!")
law (x == 1) {
  goul("El bahy! Code b el libi")
} wala {
  goul("Ghalat")
}`
  },
  {
    id: "ly-arab",
    code: "ly-arab",
    name: "Libyan Arabic",
    nativeName: "\u0644\u064A\u0628\u064A\u0629 (\u062D\u0631\u0641 \u0639\u0631\u0628\u064A)",
    country: "Libya",
    regionLabel: "Libya \xB7 ayl",
    script: "Arabic",
    rtl: true,
    iso639_3: "ayl",
    reviewStatus: "verified",
    requiresConsent: false,
    version: "1.0.0",
    description: "Libyan dialect in Arabic script.",
    keywords: {
      \u0627\u0643\u062A\u0628: "print",
      \u0642\u0648\u0644: "print",
      \u0644\u0648: "if",
      \u0625\u0630\u0627: "if",
      "\u0644\u0648 \u0643\u0627\u0646": "else_if",
      "\u0623\u0648 \u0644\u0648": "else_if",
      \u0648\u0625\u0644\u0627: "else",
      \u0645\u0627\u062F\u0627\u0645: "while",
      \u0637\u0627\u0644\u0645\u0627: "while",
      \u062F\u064A\u0631: "let",
      \u062E\u0644\u064A: "let",
      \u0635\u062D: "true",
      \u063A\u0627\u0644\u0637: "false",
      \u0648: "and",
      \u0623\u0648: "or",
      \u0645\u0634: "not",
      \u062F\u0627\u0644\u0629: "fn",
      \u0631\u062C\u0639: "return",
      \u0644\u0643\u0644: "for",
      \u0627\u0642\u0631\u0627: "input",
      \u0627\u0633\u0623\u0644: "input",
      \u0637\u0648\u0644: "len",
      \u0632\u064A\u062F: "push"
    },
    vocabulary: {
      \u0623\u0647\u0644\u0627: "hello",
      \u0645\u0631\u062D\u0628\u0627: "welcome",
      \u0628\u0627\u0647\u064A: "good",
      \u0645\u0634\u0643\u0648\u0631: "thank you",
      \u0647\u0644\u0628\u0627: "a lot",
      \u062A\u0648\u0627: "now",
      \u0634\u0648\u064A\u0629: "a little",
      \u0634\u063A\u0644: "work"
    },
    starterCode: `\u062F\u064A\u0631 \u0639\u062F\u0627\u062F = 1
\u0627\u0643\u062A\u0628("\u0623\u0647\u0644\u0627 \u0628\u064A\u0643\u0645 \u0641\u064A \u0644\u064A\u0628\u064A\u0627!")
\u0644\u0648 (\u0639\u062F\u0627\u062F == 1) {
  \u0627\u0643\u062A\u0628("\u0643\u0648\u062F \u0628\u0627\u0644\u0644\u0647\u062C\u0629 \u0627\u0644\u0644\u064A\u0628\u064A\u0629")
} \u0648\u0625\u0644\u0627 {
  \u0627\u0643\u062A\u0628("\u063A\u064A\u0631 \u0630\u0644\u0643")
}
\u0645\u0627\u062F\u0627\u0645 (\u0639\u062F\u0627\u062F <= 3) {
  \u0627\u0643\u062A\u0628("\u062F\u0648\u0631\u0629", \u0639\u062F\u0627\u062F)
  \u0639\u062F\u0627\u062F = \u0639\u062F\u0627\u062F + 1
}`
  },
  {
    id: "mr-latn",
    code: "mr-latn",
    name: "Hassaniya Franco",
    nativeName: "Hassaniya Franco",
    country: "Mauritania",
    regionLabel: "Mauritania \xB7 mey",
    script: "Latin",
    rtl: false,
    iso639_3: "mey",
    reviewStatus: "pending",
    requiresConsent: true,
    version: "1.0.0",
    description: "Mauritanian Hassaniya dialect in Franco-Latin script (starter pack; install Full Pack to unlock while loops).",
    keywords: {
      ekteb: "print",
      goul: "print",
      ila: "if",
      idha: "if",
      "ila kan": "else_if",
      "walla ila": "else_if",
      walla: "else",
      wela: "else",
      dir: "let",
      khal: "let",
      sa7: "true",
      haq: "true",
      ghalat: "false",
      w: "and",
      aw: "or",
      mahu: "not",
      dalla: "fn",
      rja3: "return",
      arja3: "return",
      lkoll: "for",
      kol: "for",
      eqra: "input",
      es2el: "input",
      toul: "len",
      zid: "push"
    },
    vocabulary: {
      salam: "hello",
      marhba: "welcome",
      labas: "fine",
      merci: "thanks",
      yasser: "a lot",
      zeyn: "good",
      dark: "now",
      chwey: "a little",
      khedma: "work"
    },
    starterCode: `dir j = 1
goul("Marhba f Chinguetti!")
ila (j == 1) {
  goul("Hassaniya b el barmaja")
} walla {
  goul("Badel")
}`
  },
  {
    id: "mr-arab",
    code: "mr-arab",
    name: "Hassaniya Arabic",
    nativeName: "\u062D\u0633\u0627\u0646\u064A\u0629 (\u062D\u0631\u0641 \u0639\u0631\u0628\u064A)",
    country: "Mauritania",
    regionLabel: "Mauritania \xB7 mey",
    script: "Arabic",
    rtl: true,
    iso639_3: "mey",
    reviewStatus: "verified",
    requiresConsent: false,
    version: "1.0.0",
    description: "Mauritanian Hassaniya dialect in Arabic script.",
    keywords: {
      \u0627\u0643\u062A\u0628: "print",
      \u0642\u0648\u0644: "print",
      \u0625\u0644\u0649: "if",
      \u0625\u0630\u0627: "if",
      "\u0625\u0644\u0649 \u0643\u0627\u0646": "else_if",
      "\u0648\u0627\u0644\u0627 \u0625\u0630\u0627": "else_if",
      \u0648\u0627\u0644\u0627: "else",
      \u0648\u0625\u0644\u0627: "else",
      \u0645\u0627\u062F\u0627\u0645: "while",
      \u062F\u064A\u0631: "let",
      \u0645\u062A\u063A\u064A\u0631: "let",
      \u0635\u062D: "true",
      \u063A\u0627\u0644\u0637: "false",
      \u0648: "and",
      \u0623\u0648: "or",
      \u0645\u0627\u0647\u0648: "not",
      \u062F\u0627\u0644\u0629: "fn",
      \u0631\u062C\u0639: "return",
      \u0644\u0643\u0644: "for",
      \u0627\u0642\u0631\u0627: "input",
      \u0627\u0633\u0627\u0644: "input",
      \u0637\u0648\u0644: "len",
      \u0632\u064A\u062F: "push"
    },
    vocabulary: {
      \u0633\u0644\u0627\u0645: "hello",
      \u0645\u0631\u062D\u0628\u0627: "welcome",
      \u0644\u0627\u0628\u0627\u0633: "fine",
      \u0632\u064A\u0646: "good",
      \u064A\u0627\u0633\u0631: "a lot",
      \u062F\u0631\u0643: "now",
      \u0634\u0648\u064A: "a little",
      \u062E\u062F\u0645\u0629: "work"
    },
    starterCode: `\u062F\u064A\u0631 \u0631\u0642\u0645 = 1
\u0642\u0648\u0644("\u0645\u0631\u062D\u0628\u0627 \u0628\u0627\u0644\u062D\u0633\u0627\u0646\u064A\u0629!")
\u0625\u0630\u0627 (\u0631\u0642\u0645 == 1) {
  \u0642\u0648\u0644("\u0627\u0644\u0628\u0631\u0645\u062C\u0629 \u0628\u0644\u0647\u062C\u0629 \u0645\u0648\u0631\u064A\u062A\u0627\u0646\u064A\u0627")
} \u0648\u0627\u0644\u0627 {
  \u0642\u0648\u0644("\u062E\u064A\u0627\u0631 \u0622\u062E\u0631")
}
\u0645\u0627\u062F\u0627\u0645 (\u0631\u0642\u0645 <= 3) {
  \u0642\u0648\u0644("\u0645\u0631\u062D\u0644\u0629", \u0631\u0642\u0645)
  \u0631\u0642\u0645 = \u0631\u0642\u0645 + 1
}`
  },
  {
    id: "kab-latn",
    code: "kab-latn",
    name: "Kabyle (Latin)",
    nativeName: "Taqbaylit (Latin)",
    country: "Algeria (Kabylia)",
    regionLabel: "Kabylia \xB7 kab",
    script: "Latin",
    rtl: false,
    iso639_3: "kab",
    reviewStatus: "pending",
    requiresConsent: true,
    version: "1.0.0",
    description: "Kabyle Amazigh language in standard Berber Latin alphabet (starter pack; install Full Pack to unlock while loops).",
    keywords: {
      aru: "print",
      ini: "print",
      ma: "if",
      "ma yella": "else_if",
      "negh ma": "else_if",
      negh: "else",
      moulac: "else",
      eg: "let",
      sers: "let",
      tidet: "true",
      uzmir: "false",
      akked: "and",
      ur: "not",
      tawuri: "fn",
      err: "return",
      ughal: "return",
      yal: "for",
      ghar: "input",
      steqsi: "input",
      tiddi: "len",
      rnu: "push"
    },
    vocabulary: {
      azul: "hello",
      ansuf: "welcome",
      tanemmirt: "thank you",
      igerrez: "very good",
      atas: "a lot",
      tura: "now",
      cwiya: "a little",
      axeddim: "work",
      tussna: "knowledge",
      tamazight: "Amazigh"
    },
    starterCode: `eg amdan = 1
aru("Azul fell-awen!")
ma (amdan == 1) {
  aru("Taqbaylit deg Bayda Maghreb")
} negh {
  aru("Beddel azal")
}`
  },
  {
    id: "kab-tifinagh",
    code: "kab-tifinagh",
    name: "Kabyle Tifinagh - \u2D63",
    nativeName: "\u2D5C\u2D30\u2D47\u2D31\u2D30\u2D62\u2D4D\u2D49\u2D5C (\u2D5C\u2D49\u2D3C\u2D49\u2D4F\u2D30\u2D56)",
    country: "Algeria (Kabylia)",
    regionLabel: "Kabylia \xB7 kab",
    script: "Tifinagh",
    rtl: false,
    iso639_3: "kab",
    reviewStatus: "pending",
    requiresConsent: true,
    version: "1.0.0",
    description: "Kabyle Amazigh language in Neo-Tifinagh Unicode script.",
    keywords: {
      "\u2D30\u2D54\u2D53": "print",
      "\u2D49\u2D4F\u2D49": "print",
      "\u2D4E\u2D30": "if",
      "\u2D4E\u2D30 \u2D62\u2D3B\u2D4D\u2D4D\u2D30": "else_if",
      "\u2D4F\u2D3B\u2D56": "else",
      "\u2D59\u2D3D\u2D53\u2D37": "while",
      "\u2D59\u2D3B\u2D54\u2D59": "let",
      "\u2D5C\u2D49\u2D37\u2D3B\u2D5C": "true",
      "\u2D53\u2D63\u2D4E\u2D49\u2D54": "false",
      "\u2D30\u2D3D\u2D3D\u2D3B\u2D37": "and",
      "\u2D53\u2D54": "not",
      "\u2D5C\u2D30\u2D61\u2D53\u2D54\u2D49": "fn",
      "\u2D3B\u2D54\u2D54": "return",
      "\u2D53\u2D56\u2D30\u2D4D": "return",
      "\u2D62\u2D30\u2D4D": "for",
      "\u2D56\u2D30\u2D54": "input",
      "\u2D59\u2D5C\u2D3B\u2D47\u2D59\u2D49": "input",
      "\u2D5C\u2D49\u2D37\u2D37\u2D49": "len",
      "\u2D54\u2D4F\u2D53": "push"
    },
    vocabulary: {
      "\u2D30\u2D63\u2D53\u2D4D": "hello",
      "\u2D30\u2D4F\u2D59\u2D53\u2D3C": "welcome",
      "\u2D5C\u2D30\u2D4F\u2D3B\u2D4E\u2D4E\u2D49\u2D54\u2D5C": "thank you",
      "\u2D5C\u2D49\u2D3C\u2D49\u2D4F\u2D30\u2D56": "Tifinagh",
      "\u2D5C\u2D53\u2D59\u2D59\u2D4F\u2D30": "knowledge"
    },
    starterCode: `\u2D59\u2D3B\u2D54\u2D59 n = 1
\u2D30\u2D54\u2D53("\u2D30\u2D63\u2D53\u2D4D \u2D5C\u2D49\u2D3C\u2D49\u2D4F\u2D30\u2D56!")
\u2D4E\u2D30 (n == 1) {
  \u2D30\u2D54\u2D53("Tifinagh -> JS, Python, Algo")
} \u2D4F\u2D3B\u2D56 {
  \u2D30\u2D54\u2D53("\u2D53\u2D4D\u2D30\u2D5B")
}
\u2D59\u2D3D\u2D53\u2D37 (n <= 3) {
  \u2D30\u2D54\u2D53("n =", n)
  n = n + 1
}`
  },
  {
    id: "shi-latn",
    code: "shi-latn",
    name: "Tashelhit - \u062A\u0634\u0644\u062D\u064A\u062A",
    nativeName: "Tacel\u1E25it (Latin)",
    country: "Morocco",
    regionLabel: "Souss / Morocco \xB7 shi",
    script: "Latin",
    rtl: false,
    iso639_3: "shi",
    reviewStatus: "pending",
    requiresConsent: true,
    version: "1.0.0",
    description: "Tashelhit Amazigh language in Latin script (starter pack; install Full Pack to unlock while loops).",
    keywords: {
      ara: "print",
      ini: "print",
      igh: "if",
      "igh illa": "else_if",
      nghd: "else",
      uhuy: "else",
      sers: "let",
      tidet: "true",
      ur_tidet: "false",
      d: "and",
      ur: "not",
      tawuri: "fn",
      rar: "return",
      ku: "for",
      kuyan: "for",
      ghr: "input",
      saqsa: "input",
      tiddi: "len",
      zayd: "push",
      rnu: "push"
    },
    vocabulary: {
      azul: "hello",
      mrhba: "welcome",
      tanmmirt: "thank you",
      ifulki: "beautiful / good",
      kigan: "a lot",
      ghilad: "now",
      imiq: "a little"
    },
    starterCode: `sers k = 1
ara("Azul Tacelhit!")
igh (k == 1) {
  ara("Tacelhit t-fulki s l-barmaja")
} nghd {
  ara("Uhuy")
}`
  }
];
var FULL_ADDITIONS = {
  "dz-latn": {
    keywords: { madam: "while", ma7ed: "while" },
    vocabulary: { "3andou eddaw khder": "authorized", djazair: "Algeria", mktba: "library" },
    starterCode: `dir n = 1
goul("Salam Dzayer!")
ila (n == 1) {
  goul("El code b el darja yethawal l 7 loghat")
} wela {
  goul("Ghalet")
}
madam (n <= 3) {
  goul("Raqm", n)
  n = n + 1
}`
  },
  "ly-latn": {
    keywords: { madam: "while", talama: "while" },
    vocabulary: { "3andah edday elakhdar": "authorized", libya: "Libya", barmaja: "programming" },
    starterCode: `dir x = 1
goul("Ahlan Libya!")
law (x == 1) {
  goul("El bahy! Code b el libi")
} wala {
  goul("Ghalat")
}
madam (x <= 3) {
  goul("Marra", x)
  x = x + 1
}`
  },
  "mr-latn": {
    keywords: { madam: "while", madamou: "while" },
    vocabulary: { chinguetti: "Chinguetti", barmaja: "programming" },
    starterCode: `dir j = 1
goul("Marhba f Chinguetti!")
ila (j == 1) {
  goul("Hassaniya b el barmaja")
} walla {
  goul("Badel")
}
madam (j <= 3) {
  goul("Raqm", j)
  j = j + 1
}`
  },
  "kab-latn": {
    keywords: { skud: "while", deg: "while" },
    vocabulary: { isem: "name", awal: "word", tira: "writing" },
    starterCode: `eg amdan = 1
aru("Azul fell-awen!")
ma (amdan == 1) {
  aru("Taqbaylit deg Bayda Maghreb")
} negh {
  aru("Beddel azal")
}
skud (amdan <= 3) {
  aru("Asurif", amdan)
  amdan = amdan + 1
}`
  },
  "shi-latn": {
    keywords: { skud: "while" },
    vocabulary: { tirra: "writing", awal: "word", tussna: "knowledge" },
    starterCode: `sers k = 1
ara("Azul Tacelhit!")
igh (k == 1) {
  ara("Tacelhit t-fulki s l-barmaja")
} nghd {
  ara("Uhuy")
}
skud (k <= 3) {
  ara("Khatwa", k)
  k = k + 1
}`
  }
};
var FULL_DIALECT_PACKS = STARTER_DIALECT_PACKS.map((starter) => {
  const extra = FULL_ADDITIONS[starter.id];
  const keywords = extra ? { ...starter.keywords, ...extra.keywords } : { ...starter.keywords };
  const vocabulary = extra ? { ...starter.vocabulary, ...extra.vocabulary } : { ...starter.vocabulary };
  return {
    ...starter,
    version: "2.1.2",
    description: starter.description.replace(
      /\s*\(starter pack; install Full Pack to unlock while loops\)\.?/i,
      ""
    ),
    keywords,
    vocabulary,
    starterCode: extra?.starterCode ?? starter.starterCode,
    meta: makeMeta(keywords, starter.rtl)
  };
});
function getDialectById(id, installedMap) {
  const starter = STARTER_DIALECT_PACKS.find((d) => d.id === id) ?? STARTER_DIALECT_PACKS[0];
  if (installedMap && installedMap[starter.id]) {
    return installedMap[starter.id];
  }
  return starter;
}
function getFullDialectById(id) {
  return FULL_DIALECT_PACKS.find((d) => d.id === id) ?? FULL_DIALECT_PACKS[0];
}

// src/lessons/audio.ts
function buildLessonAudioPhrase(lesson, pack) {
  const mainConcept = lesson.requires[0] ?? "print";
  const kwEntry = Object.entries(pack.keywords).find(([, c]) => c === mainConcept);
  const keyword = kwEntry?.[0] ?? mainConcept;
  const filled = lesson.template ? fillSlots(lesson.template, pack.keywords).text : keyword;
  const cleanPhrase = filled.replace(/[{}()"]/g, " ").replace(/\s+/g, " ").trim();
  return {
    keyword,
    phrase: cleanPhrase || keyword,
    speechLang: pack.rtl ? "ar" : "fr"
  };
}
function buildLessonPronunciationClips(lesson, pack) {
  const seenConcepts = /* @__PURE__ */ new Set();
  const clips = [];
  const baseSpeechLang = pack.rtl ? "ar" : "fr";
  for (const concept of lesson.requires) {
    if (seenConcepts.has(concept)) continue;
    const word = findConceptWord(pack.keywords, concept);
    if (!word) continue;
    seenConcepts.add(concept);
    const templateText = lesson.template ? fillSlots(lesson.template, pack.keywords).text : word;
    const cleanPhrase = templateText.replace(/[{}()"]/g, " ").replace(/\s+/g, " ").trim();
    clips.push({
      keyword: word,
      concept,
      phrase: clips.length === 0 ? cleanPhrase || word : word,
      speechLang: baseSpeechLang,
      syllables: Math.max(1, Math.min(4, Math.ceil(word.length / 3)))
    });
  }
  if (clips.length === 0) {
    const fallback = buildLessonAudioPhrase(lesson, pack);
    clips.push({
      keyword: fallback.keyword,
      concept: lesson.requires[0] ?? "print",
      phrase: fallback.phrase,
      speechLang: fallback.speechLang,
      syllables: 2
    });
  }
  return clips;
}
var ARABIC_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
var FRENCH_DIACRITICS_RE = /[éèêëàâäîïôöùûüçœæ]/i;
var ARABIZI_DIGIT_WORD_RE = /(?:[a-z][235789]|[235789][a-z])/i;
var ENGLISH_VOCAB_WORDS = /* @__PURE__ */ new Set([
  "hello",
  "hi",
  "hey",
  "world",
  "star",
  "stars",
  "bravo",
  "forward",
  "turn",
  "right",
  "left",
  "grab",
  "collect",
  "say",
  "speak",
  "repeat",
  "loop",
  "open",
  "close",
  "door",
  "sun",
  "rain",
  "cat",
  "dog",
  "good",
  "great",
  "yay",
  "you",
  "reached",
  "the",
  "step",
  "steps",
  "code",
  "play",
  "win",
  "try",
  "again",
  "friend",
  "friends",
  "happy",
  "magic",
  "oasis",
  "robot",
  "fox",
  "lion",
  "palm",
  "camel",
  "rocket",
  "castle",
  "game",
  "games",
  "level",
  "score",
  "mission",
  "print",
  "true",
  "false",
  "red",
  "blue",
  "green",
  "yellow",
  "apple",
  "tree",
  "house",
  "book",
  "run",
  "stop",
  "go",
  "welcome",
  "morning",
  "night",
  "love",
  "smile",
  "jump",
  "dance",
  "sing",
  "music",
  "color",
  "number",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "yes",
  "no",
  "ok",
  "okay",
  "fun",
  "kid",
  "kids",
  "cool",
  "super",
  "awesome",
  "nice",
  "name",
  "age",
  "water",
  "fire",
  "earth",
  "sky",
  "moon",
  "flower",
  "garden",
  "bridge",
  "word",
  "words",
  "fast",
  "slow",
  "big",
  "small",
  "new",
  "home",
  "time",
  "day",
  "my",
  "your",
  "we",
  "are",
  "is",
  "it",
  "this",
  "that",
  "for",
  "with",
  "and",
  "from",
  "to",
  "in",
  "on",
  "at",
  "desert",
  "fennec",
  "caravan",
  "atlas",
  "space",
  "kasbah",
  "start",
  "next",
  "map",
  "clear",
  "walk",
  "hit",
  "rock",
  "oops",
  "unlock",
  "lock",
  "auto",
  "read",
  "show",
  "hide",
  "blocks",
  "stickers",
  "equipped",
  "active",
  "companion",
  "candy",
  "jungle",
  "ocean",
  "starter",
  "make",
  "least",
  "times",
  "twice",
  "three"
]);
var MAGHREBI_LATIN_WORDS = /* @__PURE__ */ new Set([
  "kteb",
  "goul",
  "9oul",
  "ila",
  "idha",
  "olla",
  "madam",
  "dir",
  "ghalet",
  "s7i7",
  "khalli",
  "rja3",
  "bdel",
  "salam",
  "mrahba",
  "marhba",
  "shams",
  "mtar",
  "qitta",
  "mabrouk",
  "labas",
  "mezyan",
  "bzzaf",
  "wakha",
  "sahit",
  "choukran",
  "shukran",
  "azul",
  "tanemmirt",
  "tawalt",
  "awal",
  "ini",
  "yini",
  "sbah",
  "lkhir",
  "ahlan",
  "merhba",
  "khoya",
  "khouya",
  "sahbi",
  "zwin"
]);
function stripEmojisForSpeech(text) {
  return text.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]+/gu, " ").replace(/[⬆️↪️↩️🔼▶️🔽◀️✅❌🔒⭐🌟🎉☀️🌧️🐱🚀🔥👋🚪🤖🦊🌴🐪🦁🏰🎭✨]+/g, " ").replace(/\s+/g, " ").trim();
}
function uiLangToSpeechTag(uiLang) {
  switch (uiLang) {
    case "ar":
      return "ar";
    case "fr":
    case "ht":
      return "fr";
    case "es":
    case "arn":
      return "es";
    case "pt-BR":
      return "pt-BR";
    case "it":
      return "it";
    case "de":
      return "de";
    case "nl":
      return "nl";
    case "en":
    default:
      return "en-US";
  }
}
function detectSpeechLang(text, opts = {}) {
  const cleaned = stripEmojisForSpeech(text);
  if (!cleaned) {
    return opts.uiLang ? uiLangToSpeechTag(opts.uiLang) : opts.packRtl ? "ar" : "en-US";
  }
  if (ARABIC_SCRIPT_RE.test(cleaned)) {
    return "ar";
  }
  if (FRENCH_DIACRITICS_RE.test(cleaned)) {
    return "fr";
  }
  if (ARABIZI_DIGIT_WORD_RE.test(cleaned)) {
    return opts.packRtl ? "ar" : "fr";
  }
  const tokens = cleaned.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  let englishHits = 0;
  let maghrebiHits = 0;
  for (const tok of tokens) {
    if (ENGLISH_VOCAB_WORDS.has(tok)) englishHits += 1;
    if (MAGHREBI_LATIN_WORDS.has(tok)) maghrebiHits += 1;
  }
  if (englishHits > 0 && maghrebiHits === 0) {
    return "en-US";
  }
  if (englishHits > maghrebiHits && opts.uiLang !== "fr") {
    return "en-US";
  }
  if (maghrebiHits > 0 && opts.preferDialect) {
    return opts.packRtl ? "ar" : "fr";
  }
  if (opts.preferDialect) {
    return opts.packRtl ? "ar" : "fr";
  }
  if (opts.uiLang) {
    return uiLangToSpeechTag(opts.uiLang);
  }
  return opts.packRtl ? "ar" : "en-US";
}
function formatSpeechReadableSnippet(text) {
  return stripEmojisForSpeech(
    text.replace(/[{}()[\];]+/g, " ").replace(/"+/g, " ")
  ).replace(/\s+/g, " ").trim();
}
function normalizeMatchToken(token) {
  return token.replace(/[\u064B-\u065F\u0670\u0640]/g, "").trim().toLowerCase();
}
function extractSelectedCodeSpeech(selectedText, pack, uiLang) {
  const rawSnippet = selectedText.trim();
  if (!rawSnippet) return null;
  const spokenText = formatSpeechReadableSnippet(rawSnippet) || rawSnippet;
  if (!spokenText || !/[a-zA-Z0-9\u0600-\u06FF\u2D30-\u2D7F]/.test(spokenText)) {
    return null;
  }
  const matchedTerms = [];
  const seen = /* @__PURE__ */ new Set();
  const words = rawSnippet.split(/[^a-zA-Z0-9_\u0600-\u06FF\u2D30-\u2D7F]+/).map((w) => normalizeMatchToken(w)).filter(Boolean);
  const wordSet = new Set(words);
  const normalizedSnippet = normalizeMatchToken(rawSnippet);
  const inspectDict = (dict, kind) => {
    for (const [term, meaning] of Object.entries(dict)) {
      const normTerm = normalizeMatchToken(term);
      if (!normTerm || seen.has(`${kind}:${normTerm}`)) continue;
      const isMultiWord = /\s+/.test(normTerm);
      const hit = isMultiWord ? normalizedSnippet.includes(normTerm) : wordSet.has(normTerm);
      if (hit) {
        seen.add(`${kind}:${normTerm}`);
        matchedTerms.push({ term, meaning, kind });
      }
    }
  };
  inspectDict(pack.keywords, "keyword");
  inspectDict(pack.vocabulary, "vocabulary");
  const lang = detectSpeechLang(spokenText, {
    uiLang,
    packRtl: pack.rtl,
    preferDialect: true
  });
  return {
    rawSnippet,
    spokenText,
    lang,
    dialectCtx: {
      id: pack.id,
      name: pack.name,
      rtl: pack.rtl
    },
    matchedTerms
  };
}
function getVoiceRecognitionLang(pack, uiLang) {
  if (pack.rtl || uiLang === "ar") {
    if (pack.id.startsWith("ma-")) return "ar-MA";
    if (pack.id.startsWith("tn-")) return "ar-TN";
    if (pack.id.startsWith("dz-")) return "ar-DZ";
    if (pack.id.startsWith("ly-")) return "ar-LY";
    return "ar";
  }
  if (uiLang === "fr") return "fr-FR";
  return "en-US";
}
function normalizeVoiceText(raw) {
  return raw.trim().toLowerCase().replace(/[\u064B-\u065F\u0670]/g, "").replace(/[أإآ]/g, "\u0627").replace(/ى/g, "\u064A").replace(/[.,!?؟،؛:"'()[\]{}]+/g, " ").replace(/\s+/g, " ").trim();
}
var VOICE_RUN_TERMS = /* @__PURE__ */ new Set([
  "run",
  "play",
  "start",
  "go",
  "execute",
  "jouer",
  "lancer",
  "demarrer",
  "d\xE9marrer",
  "executer",
  "ex\xE9cuter",
  "allez",
  "\u0634\u063A\u0644",
  "\u062A\u0634\u063A\u064A\u0644",
  "\u0627\u0628\u062F\u0627",
  "\u0627\u0644\u0639\u0628",
  "\u0646\u0641\u0630",
  "\u0627\u0646\u0637\u0644\u0642",
  "\u062E\u062F\u0645",
  "\u0627\u0645\u0634\u064A",
  "\u064A\u0644\u0627",
  "\u0633\u064A\u0631",
  "\u062F\u0627\u0628\u0627",
  "\u062A\u0648\u0627",
  "\u062F\u0648\u0643",
  "\u062F\u0631\u0643",
  "khdem",
  "khaddem",
  "khedem",
  "khedma",
  "shoghl",
  "axeddim",
  "ebda",
  "bda",
  "bdi",
  "yalla",
  "yallah",
  "sir",
  "daba",
  "tawa",
  "dok",
  "dark",
  "tura",
  "ghilad"
]);
var VOICE_CLEAR_TERMS = /* @__PURE__ */ new Set([
  "clear",
  "reset",
  "empty",
  "clean",
  "erase",
  "effacer",
  "vider",
  "reinitialiser",
  "r\xE9initialiser",
  "nettoyer",
  "\u0645\u0633\u062D",
  "\u0627\u0645\u0633\u062D",
  "\u0646\u0638\u0641",
  "\u0641\u0631\u063A",
  "\u0627\u0639\u0627\u062F\u0629",
  "\u0627\u062D\u0630\u0641 \u0627\u0644\u0643\u0644",
  "\u0641\u0633\u062E",
  "\u0628\u062F\u0644",
  "mse7",
  "msa7",
  "msah",
  "emse7",
  "fassekh",
  "fassakh",
  "fassa5",
  "naqqi",
  "khwi",
  "bdel",
  "bidel",
  "beddel"
]);
var VOICE_MOVE_TERMS = /* @__PURE__ */ new Set([
  "move",
  "step",
  "forward",
  "walk",
  "advance",
  "avancer",
  "bouger",
  "pas",
  "\u062E\u0637\u0648\u0629",
  "\u062A\u062D\u0631\u0643",
  "\u062A\u0642\u062F\u0645",
  "\u0642\u062F\u0627\u0645",
  "khatwa",
  "imchi",
  "emchi",
  "mchi",
  "asurif"
]);
var VOICE_JUMP_TERMS = /* @__PURE__ */ new Set([
  "jump",
  "hop",
  "leap",
  "sauter",
  "saut",
  "\u0627\u0642\u0641\u0632",
  "\u0646\u0637",
  "\u0646\u0642\u0632",
  "nogz",
  "neggez",
  "neggaz"
]);
var VOICE_REPEAT_TERMS = /* @__PURE__ */ new Set([
  "repeat",
  "loop",
  "again",
  "twice",
  "repeter",
  "r\xE9p\xE9ter",
  "boucle",
  "\u0643\u0631\u0631",
  "\u062A\u0643\u0631\u0627\u0631",
  "\u0639\u0627\u0648\u062F",
  "3awed",
  "aawed"
]);
var VOICE_UNDO_TERMS = /* @__PURE__ */ new Set([
  "undo",
  "back",
  "remove",
  "delete",
  "annuler",
  "retour",
  "supprimer",
  "\u062A\u0631\u0627\u062C\u0639",
  "\u0631\u062C\u0639",
  "\u0627\u062D\u0630\u0641",
  "rja3",
  "raja3"
]);
var VOICE_SAY_GENERIC_TERMS = /* @__PURE__ */ new Set([
  "say",
  "speak",
  "talk",
  "print",
  "dire",
  "parler",
  "ecrire",
  "\xE9crire",
  "\u0642\u0644",
  "\u0642\u0648\u0644",
  "\u062A\u0643\u0644\u0645",
  "\u0627\u0643\u062A\u0628"
]);
function buildKidVoiceCommandHints(pack) {
  const printWord = findConceptWord(pack.keywords, "print") ?? (pack.rtl ? "\u0642\u0648\u0644" : "kteb");
  const vocabEntries = Object.entries(pack.vocabulary);
  const nowEntry = vocabEntries.find(([, eng]) => /\bnow\b/i.test(eng));
  const workEntry = vocabEntries.find(([, eng]) => /\bwork\b/i.test(eng));
  const runWord = pack.keywords.khdem ? "khdem" : nowEntry?.[0] ?? workEntry?.[0] ?? (pack.rtl ? "\u0634\u063A\u0651\u0644" : "yallah");
  const clearWord = pack.rtl ? "\u0627\u0645\u0633\u062D" : "bdel";
  return {
    runWord,
    clearWord,
    sayWord: printWord
  };
}
function parseKidVoiceCommand(transcript, pack) {
  const norm = normalizeVoiceText(transcript);
  if (!norm) return null;
  const tokens = norm.split(" ").filter(Boolean);
  if (tokens.length === 0) return null;
  const packPrintWords = new Set(
    Object.entries(pack.keywords).filter(([, concept]) => concept === "print").map(([word]) => normalizeVoiceText(word))
  );
  const packWhileWords = new Set(
    Object.entries(pack.keywords).filter(([, concept]) => concept === "while").map(([word]) => normalizeVoiceText(word))
  );
  const packGreetingWords = new Set(
    Object.entries(pack.vocabulary).filter(([, eng]) => /hello|welcome|fine|thank|good/i.test(eng)).map(([word]) => normalizeVoiceText(word))
  );
  if (VOICE_CLEAR_TERMS.has(norm)) {
    return { kind: "clear", matchedTerm: norm };
  }
  if (VOICE_RUN_TERMS.has(norm)) {
    return { kind: "run", matchedTerm: norm };
  }
  const firstToken = tokens[0];
  if (packPrintWords.has(firstToken) || VOICE_SAY_GENERIC_TERMS.has(firstToken)) {
    const rawRest = transcript.trim().split(/\s+/).slice(1).join(" ").replace(/[.,!?؟،؛:"'()[\]{}]+$/g, "").trim();
    return {
      kind: "add_say",
      matchedTerm: firstToken,
      payload: rawRest || void 0
    };
  }
  for (const tok of tokens) {
    if (VOICE_CLEAR_TERMS.has(tok)) return { kind: "clear", matchedTerm: tok };
    if (VOICE_RUN_TERMS.has(tok)) return { kind: "run", matchedTerm: tok };
    if (VOICE_UNDO_TERMS.has(tok)) return { kind: "undo", matchedTerm: tok };
    if (VOICE_JUMP_TERMS.has(tok)) return { kind: "add_jump", matchedTerm: tok };
    if (VOICE_MOVE_TERMS.has(tok)) return { kind: "add_move", matchedTerm: tok };
    if (VOICE_REPEAT_TERMS.has(tok) || packWhileWords.has(tok)) {
      return { kind: "add_repeat", matchedTerm: tok };
    }
    if (packPrintWords.has(tok) || VOICE_SAY_GENERIC_TERMS.has(tok)) {
      return { kind: "add_say", matchedTerm: tok };
    }
  }
  const greetingMatch = tokens.find((tok) => packGreetingWords.has(tok));
  if (greetingMatch) {
    return {
      kind: "add_say",
      matchedTerm: greetingMatch,
      payload: greetingMatch
    };
  }
  return null;
}

// src/lessons/i18n.ts
var LESSON_UI_LANGUAGES = [
  {
    "code": "ar",
    "label": "Arabic",
    "nativeLabel": "\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
    "flag": "\u{1F1F8}\u{1F1E6}",
    "rtl": true
  },
  {
    "code": "en",
    "label": "English",
    "nativeLabel": "English",
    "flag": "\u{1F1EC}\u{1F1E7}",
    "rtl": false
  },
  {
    "code": "fr",
    "label": "French",
    "nativeLabel": "Fran\xE7ais",
    "flag": "\u{1F1EB}\u{1F1F7}",
    "rtl": false
  },
  {
    "code": "es",
    "label": "Spanish",
    "nativeLabel": "Espa\xF1ol",
    "flag": "\u{1F1EA}\u{1F1F8}",
    "rtl": false
  },
  {
    "code": "pt-BR",
    "label": "Portuguese (Brazil)",
    "nativeLabel": "Portugu\xEAs (Brasil)",
    "flag": "\u{1F1E7}\u{1F1F7}",
    "rtl": false
  },
  {
    "code": "it",
    "label": "Italian",
    "nativeLabel": "Italiano",
    "flag": "\u{1F1EE}\u{1F1F9}",
    "rtl": false
  },
  {
    "code": "de",
    "label": "German",
    "nativeLabel": "Deutsch",
    "flag": "\u{1F1E9}\u{1F1EA}",
    "rtl": false
  },
  {
    "code": "nl",
    "label": "Dutch",
    "nativeLabel": "Nederlands",
    "flag": "\u{1F1F3}\u{1F1F1}",
    "rtl": false
  },
  {
    "code": "arn",
    "label": "Mapudungun",
    "nativeLabel": "Mapudungun",
    "flag": "\u{1F1E8}\u{1F1F1}",
    "rtl": false
  },
  {
    "code": "ht",
    "label": "Haitian Creole",
    "nativeLabel": "Krey\xF2l Ayisyen",
    "flag": "\u{1F1ED}\u{1F1F9}",
    "rtl": false
  }
];
var LESSON_EN = {
  "loadSample": "Load Sample",
  "modeKid": "Kid Mode",
  "modeBeginner": "Beginner",
  "modePro": "Pro",
  "lessonsHeading": "Progressive Dialect Curriculum",
  "lessonsSubheading": "Interactive lessons tailored dynamically to the active mode and dialect.",
  "completedLabel": "Completed",
  "lockedLabel": "Locked",
  "plannedLabel": "Coming Soon",
  "requiresConceptsLabel": "Requires concepts:",
  "openInPlayground": "Load in Playground",
  "verifyLesson": "Verify & Complete",
  "lessonPassed": "Great work! Lesson verified and completed.",
  "lessonCheckFailed": "Check the goal rules below and try again.",
  "arrangeHint": "Click cards in order to build a valid dialect program:",
  "arrangeSelected": "Your sequence:",
  "arrangeReset": "Reset order",
  "hintBtn": "Show Hint",
  "hintsUsed": "Hints shown",
  "ruleFail_prints_text": "Your program must print the requested text.",
  "ruleFail_prints_number": "Your program must print the exact target number.",
  "ruleFail_prints_bool": "Your program must print the requested boolean value.",
  "ruleFail_prints_in_order": "Print both values in the exact order shown in the goal.",
  "ruleFail_min_prints": "Add more print statements to meet the lesson goal.",
  "ruleFail_has_node": "Use a conditional or loop block for this lesson.",
  "ruleFail_min_nodes": "Include multiple conditional blocks as requested.",
  "ruleFail_has_else": "Add an else branch to handle the alternative path.",
  "ruleFail_nested_if": "Put an if condition inside another if block.",
  "ruleFail_test_token": "Use the specified boolean value inside the condition test.",
  "ruleFail_test_compares": "Use a comparison operator (like > or ==) inside the condition.",
  "ruleFail_min_functions": "Define at least one reusable dialect function for this lesson.",
  "ruleFail_has_return": "Include a return statement inside your function.",
  "ruleFail_uses_input": "Read interactive input from the user using your dialect input word.",
  "ruleFail_uses_array": "Create or inspect a list using [ ... ], indexing, or list helpers.",
  "lsKidTalkTitle": "01. Make the Robot Speak",
  "lsKidTalkGoal": "Snap the Speak block first, then choose the greeting.",
  "lsKidTalkExp1": "Mental algorithms begin with a clear action in the right order.",
  "lsKidTalkExp2": "First pick the Say block, then snap the greeting word after it.",
  "lsKidTalkHint1": "Tap the Say action card first, then tap the salam greeting card.",
  "lsKidTwiceTitle": "02. Two Steps in Order",
  "lsKidTwiceGoal": "Sequence the steps so salam plays before ahlan.",
  "lsKidTwiceExp1": "An algorithm runs commands one step at a time from first to last.",
  "lsKidTwiceExp2": "Keep the step separator between your two actions.",
  "lsKidTwiceHint1": "Start with Say salam, then the next-step divider, then Say ahlan.",
  "lsKidDoorTitle": "03. The Open Logic Door",
  "lsKidDoorGoal": "Build an If-Open path so the robot says salam.",
  "lsKidDoorExp1": "A decision checks whether a magic door is open or closed.",
  "lsKidDoorExp2": "Because the door is open, the action inside the path runs.",
  "lsKidDoorHint1": "Start with the If-Open gate, place Say salam inside, then close the step.",
  "lsKidSunRainTitle": "04. Sun or Rain Path",
  "lsKidSunRainGoal": "Use a closed first gate and an Else path so rain appears.",
  "lsKidSunRainExp1": "When the first gate is closed, logic moves straight to the Else path.",
  "lsKidSunRainExp2": "Else guarantees a smart backup plan always runs.",
  "lsKidSunRainHint1": "Put the closed first gate first, then the Else path, then the rain step.",
  "lsKidAskTitle": "05. Ask & Answer",
  "lsKidAskGoal": "Arrange the Ask block to read a name and greet it.",
  "lsKidAskExp1": "Programs can ask the learner a question and remember the reply.",
  "lsKidAskExp2": "Use input inside print so your greeting uses the answer.",
  "lsKidAskHint1": "Place the Ask card before the greeting step.",
  "lsKidBasketTitle": "06. Magic Treat Basket",
  "lsKidBasketGoal": "Create a basket list of treats and count how many items it holds.",
  "lsKidBasketExp1": "Lists store multiple treats together inside square brackets [ ... ].",
  "lsKidBasketExp2": "Your length command counts every treat inside the basket.",
  "lsKidBasketHint1": "Create the basket variable first, then print its length.",
  "lsBgPrintTitle": "01. Print Hello",
  "lsBgPrintGoal": 'Write a statement that prints "salam".',
  "lsBgPrintExp1": 'Strings of text are wrapped in double quotes like "salam".',
  "lsBgPrintExp2": "Pass the text inside parentheses right after your dialect print keyword.",
  "lsBgPrintHint1": "Make sure the text inside quotes spells salam exactly.",
  "lsBgPrintHint2": "Do not forget closing quotes and closing parentheses.",
  "lsBgTwoTitle": "02. Sequential Lines",
  "lsBgTwoGoal": 'Print "salam" on line 1 and "ahlan" on line 2.',
  "lsBgTwoExp1": "Each statement on its own line executes strictly in sequence.",
  "lsBgTwoExp2": "This forms the backbone of every algorithm.",
  "lsBgTwoHint1": 'Put "salam" first, then "ahlan" on the next line.',
  "lsBgNumberTitle": "03. Printing Numbers",
  "lsBgNumberGoal": "Print the number 7 without quotes.",
  "lsBgNumberExp1": "Numbers are values directly understood for math\u2014they do not use quotes.",
  "lsBgNumberExp2": "Try passing 7 straight inside the print call.",
  "lsBgNumberHint1": "Write 7 inside the parentheses with no double quotes.",
  "lsBgBoolTitle": "04. True or False",
  "lsBgBoolGoal": "Print the boolean value true using your dialect keyword.",
  "lsBgBoolExp1": "Booleans represent logical truth: true or false.",
  "lsBgBoolExp2": "Your dialect has dedicated words for both true and false.",
  "lsBgBoolHint1": "Replace text with your dialect word for true inside print().",
  "lsBgVarsTitle": "05. Variables & Assignment",
  "lsBgVarsGoal": "Store a greeting in a variable and print it.",
  "lsBgVarsExp1": "Variables give names to values so you can reuse or update them later.",
  "lsBgVarsExp2": "Use your dialect let keyword followed by name = value.",
  "lsBgVarsHint1": "Declare the variable first, then pass its name into print().",
  "lsBgInputTitle": "06. Interactive Input Greeting",
  "lsBgInputGoal": "Ask the user for their name with input() and print it.",
  "lsBgInputExp1": "The input command pauses execution and asks the user for a reply.",
  "lsBgInputExp2": "Store the reply in a variable, then print a greeting with it.",
  "lsBgInputHint1": 'Assign your input("Name?") call to a variable, then print("Salam", variable).',
  "lsBgIfTitle": "07. First Decision (If)",
  "lsBgIfGoal": 'Write an if (true) block that prints "salam".',
  "lsBgIfExp1": "Code inside curly braces { ... } forms a conditional block.",
  "lsBgIfExp2": "When the condition inside ( ) is true, the block executes.",
  "lsBgIfHint1": "Check that both { and } braces match properly.",
  "lsBgElseTitle": "08. Two Paths (If / Else)",
  "lsBgElseGoal": 'Write an if (false) branch and an else branch that prints "no".',
  "lsBgElseExp1": "Combine if with else to cover both outcomes of a decision.",
  "lsBgElseExp2": "Use false in the test so execution flows into the else branch.",
  "lsBgElseHint1": 'Ensure the else branch prints "no".',
  "lsBgCompareTitle": "09. Comparing Numbers",
  "lsBgCompareGoal": 'Use a comparison (such as 10 > 3) inside an if condition to print "salam".',
  "lsBgCompareExp1": "Operators like >, <, == compare two values and return true or false.",
  "lsBgCompareExp2": "This lets programs make smart data-driven choices.",
  "lsBgCompareHint1": "Write (10 > 3) inside the if parentheses.",
  "lsBgWhileTitle": "10. Counting Loops (While)",
  "lsBgWhileGoal": "Count from 0 up to 2 using a while loop.",
  "lsBgWhileExp1": "A counter variable grows on each loop step until the condition becomes false.",
  "lsBgWhileExp2": "Always update the counter inside the loop body so it finishes cleanly.",
  "lsBgWhileHint1": "Declare i = 0, check while (i < 3), print i, and increment i = i + 1.",
  "lsBgForTitle": "11. Range Loops (For)",
  "lsBgForGoal": "Loop over the range 1..3 using your dialect for keyword.",
  "lsBgForExp1": "Range loops let you step from start to end without a manual counter.",
  "lsBgForExp2": "Write for (i : 1..3) { ... } to run cleanly across 1, 2, and 3.",
  "lsBgForHint1": "Use i : 1..3 inside your for loop header.",
  "lsBgListTitle": "12. Lists & Basket Length",
  "lsBgListGoal": "Create a list, push a new item, and print its length.",
  "lsBgListExp1": "Arrays hold an ordered sequence inside [ ... ] brackets.",
  "lsBgListExp2": "Use push to add elements and len to check the total size.",
  "lsBgListHint1": "Declare a list variable, call push(list, 30), and print len(list).",
  "lsPrTwoIfsTitle": "01. Chained Independent Checks",
  "lsPrTwoIfsGoal": 'Write two if statements (one true, one false) printing "salam" and "ahlan" branches.',
  "lsPrTwoIfsExp1": "Sequential independent if blocks evaluate separately.",
  "lsPrTwoIfsExp2": "Practice keeping multiple control structures clean and readable.",
  "lsPrTwoIfsHint1": 'Create one if with true ("salam") and another if with false ("ahlan").',
  "lsPrNestedTitle": "02. Nested Decision Logic",
  "lsPrNestedGoal": 'Nest an if/else inside an outer if block so the inner else prints "b".',
  "lsPrNestedExp1": "Conditions can live inside other conditions to model layered logic.",
  "lsPrNestedExp2": "Keep indentation clear so matching braces stay easy to verify.",
  "lsPrNestedHint1": 'Put if (false) { print("a") } else { print("b") } inside an outer if (true).',
  "lsPrWhileTitle": "03. Controlled Loop Guard",
  "lsPrWhileGoal": 'Build a while (false) block containing print("salam") to practice safe loop structure.',
  "lsPrWhileExp1": "A while loop checks its condition before entering the body.",
  "lsPrWhileExp2": "Dialects that provide a while keyword unlock this challenge automatically.",
  "lsPrWhileHint1": "Install the Full Dialect Pack if your dialect does not yet include while.",
  "lsPrFuncTitle": "04. Reusable Functions",
  "lsPrFuncGoal": "Define a dialect function with a parameter and call it twice.",
  "lsPrFuncExp1": "Functions package reusable steps under a clean name and accept parameters.",
  "lsPrFuncExp2": 'Calling greet("Maghreb") runs the function body with that argument.',
  "lsPrFuncHint1": "Declare the function with fn, then invoke it with parentheses.",
  "lsPrReturnTitle": "05. Functions with Return",
  "lsPrReturnGoal": "Write a function that returns a * b and print the result of calling it.",
  "lsPrReturnExp1": "The return keyword sends a computed value back to the caller.",
  "lsPrReturnExp2": "Functions with return can be nested directly inside expressions and print().",
  "lsPrReturnHint1": "End your function body with return a * b and pass the call to print().",
  "lsPrArraysTitle": "06. Collections & Arrays",
  "lsPrArraysGoal": "Create a list, push an element, read by index, and print its length.",
  "lsPrArraysExp1": "Square brackets [0] access the first element cleanly by index.",
  "lsPrArraysExp2": "You can append dynamically using your dialect push helper.",
  "lsPrArraysHint1": "Combine list creation, push(), indexing, and len() in one script.",
  "lsPrForEachTitle": "07. Iterating Over Lists",
  "lsPrForEachGoal": "Use a for-each loop to print every item inside an array.",
  "lsPrForEachExp1": "Use for (item : myList) { ... } to visit each list item in order.",
  "lsPrForEachExp2": "For-each iteration avoids off-by-one index bugs automatically.",
  "lsPrForEachHint1": "Iterate your list variable inside a for (...) block and print the item.",
  "lsPrForSumTitle": "08. Range Accumulator",
  "lsPrForSumGoal": "Sum numbers from 1 to 4 inside a for range loop and print the total.",
  "lsPrForSumExp1": "Accumulators track running totals in a variable declared before the loop.",
  "lsPrForSumExp2": "Add the loop variable on every pass and print once after the loop.",
  "lsPrForSumHint1": "Start total = 0, then update total = total + i inside for (i : 1..4).",
  "lsPrFnListTitle": "09. Functions & Lists Together",
  "lsPrFnListGoal": "Write a function returning the length of a list passed to it.",
  "lsPrFnListExp1": "Arrays can be passed as arguments just like numbers or strings.",
  "lsPrFnListExp2": "Calling len(arr) inside your function returns the live count.",
  "lsPrFnListHint1": "Pass your array variable into countBag(bag) and print the returned number.",
  "lsPrInputGuardTitle": "10. Input Validation Guard",
  "lsPrInputGuardGoal": "Read input, check a numeric threshold with if/else, and print feedback.",
  "lsPrInputGuardExp1": "Combining input() with if/else protects programs against unexpected values.",
  "lsPrInputGuardExp2": "Handle both passing and fallback outcomes cleanly.",
  "lsPrInputGuardHint1": 'Read score = input("Score?"), then branch with >= 10 and else.',
  "lsPrFnComposeTitle": "11. Composing Functions",
  "lsPrFnComposeGoal": "Define two functions where the second composes calls to the first.",
  "lsPrFnComposeExp1": "Breaking big problems into helper functions keeps algorithms modular.",
  "lsPrFnComposeExp2": "Track helper calls inside the Call Stack view in Developer Tools.",
  "lsPrFnComposeHint1": "Define square(n) and sumSq(x, y) returning square(x) + square(y).",
  "lsPrErrorsTitle": "12. Defensive Bounds Check",
  "lsPrErrorsGoal": "Check list length with len() before reading an element by index.",
  "lsPrErrorsExp1": "Checking bounds prevents out-of-range index errors at runtime.",
  "lsPrErrorsExp2": "Provide a safe else message when the collection is too short.",
  "lsPrErrorsHint1": "Check if (len(items) > 1) before reading items[1].",
  "reviewAgain": "Again",
  "cardLabel": "Card",
  "closeBtn": "Close",
  "lessonRoadmapTitle": "Lesson Progress Map",
  "lessonRoadmapSummary": "Click any stage node to jump straight to that lesson.",
  "lessonStageReady": "Ready",
  "lessonStageCompleted": "Done",
  "lessonStageLocked": "Locked",
  "lessonStagePlanned": "Roadmap",
  "listenLessonAudio": "Listen Clip",
  "startReviewSession": "Review Session",
  "stopReviewSession": "Exit Review",
  "reviewSessionTitle": "Completed Lessons Review Session",
  "reviewCardProgress": "Review Card",
  "reviewNext": "Next Lesson",
  "reviewMastered": "Mastered",
  "reviewMasteredCount": "Reviewed this session",
  "noCompletedForReview": "Complete at least one lesson to unlock your personalized Review Session.",
  "showSolutionBtn": "Reveal Answer",
  "kidVisualSpeak": "Say",
  "kidVisualDoorOpen": "Open Door",
  "kidVisualDoorClosed": "Backup Path",
  "kidVisualLoop": "Repeat",
  "practicePronunciationLabel": "Pronunciation Practice",
  "listenSlow": "Slow (0.65\xD7)",
  "listenNormal": "Normal",
  "quizPredictOutputPrompt": "What does this completed lesson print?",
  "quizFillKeywordPrompt": "Pick the missing dialect keyword to complete the snippet:",
  "quizScoreLabel": "Quiz Score",
  "quizRestartBtn": "New Quiz Round",
  "packReadyCountLabel": "ready in pack",
  "quizCodeChallengePrompt": "Fix or complete the dialect challenge so the lesson passes:",
  "achievementsShelfTitle": "Learning Achievements",
  "achievementsEarnedSummary": "unlocked",
  "achievementUnlockedBannerTitle": "New Achievement Unlocked",
  "achievementDismissBtn": "Dismiss",
  "achievementLockedLabel": "Locked",
  "achievementEarnedOnLabel": "Unlocked",
  "achFirstSparkTitle": "First Spark",
  "achFirstSparkDesc": "Verify your first guided lesson in any Maghrebi dialect.",
  "achDialectExplorerTitle": "Dialect Explorer",
  "achDialectExplorerDesc": "Complete at least 1 lesson across 2 or more distinct dialects.",
  "achBranchNavigatorTitle": "Branch Navigator",
  "achBranchNavigatorDesc": "Complete 2 conditional logic lessons (if / else / comparison).",
  "achSyntaxMasterTitle": "Syntax Master",
  "achSyntaxMasterDesc": "Master all 3 Pro-tier syntax and loop lessons (ifs, nested, while).",
  "achReviewChampionTitle": "Review Champion",
  "achReviewChampionDesc": "Pass 3 Review Session challenges verified by BaydaEngine.",
  "achMaghrebPolyglotTitle": "Maghreb Polyglot",
  "achMaghrebPolyglotDesc": "Complete 10 verified lessons across your unified profile.",
  "showBadgesBtn": "Show Badges",
  "hideBadgesBtn": "Hide Badges",
  "showMapBtn": "Roadmap",
  "openLessonBtn": "Open",
  "closeLessonBtn": "Close",
  "hideDetailsBtn": "Hide",
  "lessonNextBtn": "Next Lesson",
  "speakSnippetBtn": "Speak Snippet",
  "stopSpeakingBtn": "Stop Speech",
  "kidTapTileHint": "Tap a tile to pick what your character says",
  "kidVisualCounter": "Score Box",
  "kidEndStepWord": "End step",
  "kidVarWord": "Counter",
  "kidLessonVisualArrangeHint": "Tap the visual logic blocks in order to build the mental algorithm:",
  "kidVisualMove": "Move",
  "kidVisualJump": "Jump",
  "kidVisualTurn": "Turn",
  "kidQuizPickLogicPrompt": "Pick the matching visual logic sequence",
  "kidLessonEasy": "Starter \xB7 4\u20135",
  "kidLessonMedium": "Explorer \xB7 6\u20137",
  "kidLessonChallenge": "Challenge \xB7 8\u20139",
  "kidLessonFilterAge": "For My Age",
  "kidLessonFilterAll": "All Levels",
  "consoleInputPromptLabel": "Input:",
  "consoleInputPlaceholder": "Type reply and press Enter...",
  "consoleInputSubmitBtn": "Send Reply",
  "consoleInputResetBtn": "Restart Inputs",
  "kidVisualAsk": "Ask",
  "kidVisualList": "Basket",
  "kidVisualRecipe": "Recipe",
  "execWarnTitle": "Resource Caution (75%+)",
  "execWarnSteps": "Execution steps exceeded 75% of the safety limit \u2014 check your loop exit conditions.",
  "execWarnMemory": "Sandbox memory usage exceeded 75% of the safety budget.",
  "execWarnArray": "List length exceeded 75% of the allowed element limit.",
  "execWarnRecursion": "Function call depth exceeded 75% of the recursion limit.",
  "execWarnOutput": "Console output exceeded 75% of the line limit."
};
var LESSON_AR = {
  "loadSample": "\u0645\u062B\u0627\u0644 \u062C\u0627\u0647\u0632",
  "modeKid": "\u0648\u0636\u0639 \u0637\u0641\u0644",
  "modeBeginner": "\u0645\u0628\u062A\u062F\u0626",
  "modePro": "\u0645\u062D\u062A\u0631\u0641",
  "lessonsHeading": "\u0627\u0644\u0645\u0646\u0647\u062C \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A \u0627\u0644\u0645\u062A\u062F\u0631\u062C",
  "lessonsSubheading": "\u062F\u0631\u0648\u0633 \u062A\u0641\u0627\u0639\u0644\u064A\u0629 \u0645\u062A\u062F\u0631\u062C\u0629 \u062A\u062A\u0643\u064A\u0641 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0645\u0639 \u0627\u0644\u0648\u0636\u0639 \u0648\u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u062E\u062A\u0627\u0631 \u0648\u0627\u0644\u0644\u0647\u062C\u0629.",
  "completedLabel": "\u0645\u0643\u062A\u0645\u0644",
  "lockedLabel": "\u0645\u0642\u0641\u0644",
  "plannedLabel": "\u0642\u0631\u064A\u0628\u0627\u064B",
  "requiresConceptsLabel": "\u064A\u062A\u0637\u0644\u0628 \u0627\u0644\u0645\u0641\u0627\u0647\u064A\u0645:",
  "openInPlayground": "\u0641\u062A\u062D \u0641\u064A \u0627\u0644\u0645\u062E\u062A\u0628\u0631",
  "verifyLesson": "\u062A\u062D\u0642\u0642 \u0648\u0623\u0643\u0645\u0644",
  "lessonPassed": "\u0639\u0645\u0644 \u0631\u0627\u0626\u0639! \u062A\u0645 \u0627\u062C\u062A\u064A\u0627\u0632 \u0627\u0644\u062F\u0631\u0633 \u0628\u0646\u062C\u0627\u062D.",
  "lessonCheckFailed": "\u0631\u0627\u062C\u0639 \u0645\u062A\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0647\u062F\u0641 \u0623\u062F\u0646\u0627\u0647 \u0648\u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
  "arrangeHint": "\u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0628\u0637\u0627\u0642\u0627\u062A \u0628\u0627\u0644\u062A\u0631\u062A\u064A\u0628 \u0644\u0628\u0646\u0627\u0621 \u0628\u0631\u0646\u0627\u0645\u062C \u0635\u062D\u064A\u062D:",
  "arrangeSelected": "\u062A\u0631\u062A\u064A\u0628\u0643 \u0627\u0644\u0645\u062E\u062A\u0627\u0631:",
  "arrangeReset": "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0631\u062A\u064A\u0628",
  "hintBtn": "\u0623\u0638\u0647\u0631 \u062A\u0644\u0645\u064A\u062D\u0627\u064B",
  "hintsUsed": "\u062A\u0644\u0645\u064A\u062D\u0627\u062A \u0638\u0627\u0647\u0631\u0629",
  "ruleFail_prints_text": "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0637\u0628\u0639 \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062C \u0627\u0644\u0646\u0635 \u0627\u0644\u0645\u0637\u0644\u0648\u0628.",
  "ruleFail_prints_number": "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0637\u0628\u0639 \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062C \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0628\u062F\u0642\u0629.",
  "ruleFail_prints_bool": "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0637\u0628\u0639 \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062C \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0646\u0637\u0642\u064A\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629.",
  "ruleFail_prints_in_order": "\u0627\u0637\u0628\u0639 \u0627\u0644\u0642\u064A\u0645\u062A\u064A\u0646 \u0628\u0646\u0641\u0633 \u0627\u0644\u062A\u0631\u062A\u064A\u0628 \u0627\u0644\u0645\u062D\u062F\u062F \u0641\u064A \u0627\u0644\u0647\u062F\u0641.",
  "ruleFail_min_prints": "\u0623\u0636\u0641 \u0627\u0644\u0645\u0632\u064A\u062F \u0645\u0646 \u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0644\u062A\u062D\u0642\u064A\u0642 \u0627\u0644\u0647\u062F\u0641.",
  "ruleFail_has_node": "\u0627\u0633\u062A\u062E\u062F\u0645 \u0628\u0646\u064A\u0629 \u0627\u0644\u0634\u0631\u0637 \u0623\u0648 \u0627\u0644\u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u062F\u0631\u0633.",
  "ruleFail_min_nodes": "\u0623\u0636\u0641 \u0639\u062F\u0629 \u0643\u062A\u0644 \u0634\u0631\u0637\u064A\u0629 \u0643\u0645\u0627 \u0647\u0648 \u0645\u0637\u0644\u0648\u0628.",
  "ruleFail_has_else": "\u0623\u0636\u0641 \u0641\u0631\u0639 \u0648\u0625\u0644\u0627 \u0644\u0644\u062A\u0639\u0627\u0645\u0644 \u0645\u0639 \u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0628\u062F\u064A\u0644.",
  "ruleFail_nested_if": "\u0636\u0639 \u062C\u0645\u0644\u0629 \u0634\u0631\u0637\u064A\u0629 \u062F\u0627\u062E\u0644 \u062C\u0645\u0644\u0629 \u0634\u0631\u0637\u064A\u0629 \u0623\u062E\u0631\u0649.",
  "ruleFail_test_token": "\u0627\u0633\u062A\u0639\u0645\u0644 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0646\u0637\u0642\u064A\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u062F\u0627\u062E\u0644 \u0634\u0631\u0637 \u0627\u0644\u0641\u062D\u0635.",
  "ruleFail_test_compares": "\u0627\u0633\u062A\u062E\u062F\u0645 \u0639\u0627\u0645\u0644 \u0645\u0642\u0627\u0631\u0646\u0629 \u0645\u062B\u0644 > \u0623\u0648 == \u062F\u0627\u062E\u0644 \u0627\u0644\u0634\u0631\u0637.",
  "ruleFail_min_functions": "\u0639\u0631\u0651\u0641 \u062F\u0627\u0644\u0629 \u0648\u0627\u062D\u062F\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0628\u0644\u0647\u062C\u062A\u0643 \u0644\u0625\u0643\u0645\u0627\u0644 \u0647\u0630\u0627 \u0627\u0644\u062F\u0631\u0633.",
  "ruleFail_has_return": "\u0623\u0636\u0641 \u0623\u0645\u0631 \u0625\u0631\u062C\u0627\u0639 \u0642\u064A\u0645\u0629 \u062F\u0627\u062E\u0644 \u062C\u0633\u0645 \u0627\u0644\u062F\u0627\u0644\u0629.",
  "ruleFail_uses_input": "\u0627\u0637\u0644\u0628 \u0625\u062F\u062E\u0627\u0644\u0627\u064B \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0639\u0628\u0631 \u062F\u0627\u0644\u0629 \u0627\u0644\u0625\u062F\u062E\u0627\u0644 \u0628\u0644\u0647\u062C\u062A\u0643.",
  "ruleFail_uses_array": "\u0623\u0646\u0634\u0626 \u0642\u0627\u0626\u0645\u0629 \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 [...] \u0623\u0648 \u062F\u0648\u0627\u0644 \u0627\u0644\u0642\u0648\u0627\u0626\u0645 \u0645\u062B\u0644 \u0627\u0644\u0637\u0648\u0644 \u0648\u0627\u0644\u0625\u0636\u0627\u0641\u0629.",
  "lsKidTalkTitle": "01. \u0627\u062C\u0639\u0644 \u0627\u0644\u0631\u0648\u0628\u0648\u062A \u064A\u062A\u0643\u0644\u0645",
  "lsKidTalkGoal": "\u0631\u062A\u0628 \u0644\u0628\u0646\u0629 \u0627\u0644\u0642\u0648\u0644 \u0623\u0648\u0644\u0627\u064B \u062B\u0645 \u0627\u062E\u062A\u0631 \u0627\u0644\u062A\u062D\u064A\u0629 \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629.",
  "lsKidTalkExp1": "\u064A\u0628\u062F\u0623 \u0627\u0644\u062A\u0641\u0643\u064A\u0631 \u0627\u0644\u0645\u0646\u0637\u0642\u064A \u0628\u0648\u0636\u0639 \u0623\u0645\u0631 \u0648\u0627\u0636\u062D \u0641\u064A \u0627\u0644\u062A\u0631\u062A\u064A\u0628 \u0627\u0644\u0635\u062D\u064A\u062D.",
  "lsKidTalkExp2": "\u0627\u062E\u062A\u0631 \u0644\u0628\u0646\u0629 \u0627\u0644\u0642\u0648\u0644 \u0623\u0648\u0644\u0627\u064B \u062B\u0645 \u0623\u0636\u0641 \u0627\u0644\u062A\u062D\u064A\u0629 \u0628\u0639\u062F\u0647\u0627 \u0645\u0628\u0627\u0634\u0631\u0629.",
  "lsKidTalkHint1": "\u0627\u062E\u062A\u0631 \u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0642\u0648\u0644 \u0623\u0648\u0644\u0627\u064B \u062B\u0645 \u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u062A\u062D\u064A\u0629 salam.",
  "lsKidTwiceTitle": "02. \u062E\u0637\u0648\u062A\u0627\u0646 \u0628\u0627\u0644\u062A\u0633\u0644\u0633\u0644",
  "lsKidTwiceGoal": "\u0631\u062A\u0628 \u0627\u0644\u062E\u0637\u0648\u0627\u062A \u0644\u062A\u0638\u0647\u0631 salam \u0642\u0628\u0644 ahlan \u0628\u0627\u0644\u062A\u0631\u062A\u064A\u0628.",
  "lsKidTwiceExp1": "\u0627\u0644\u062E\u0648\u0627\u0631\u0632\u0645\u064A\u0629 \u062A\u0646\u0641\u0630 \u0627\u0644\u0623\u0648\u0627\u0645\u0631 \u062E\u0637\u0648\u0629 \u0628\u0639\u062F \u062E\u0637\u0648\u0629 \u0645\u0646 \u0627\u0644\u0628\u062F\u0627\u064A\u0629 \u0625\u0644\u0649 \u0627\u0644\u0646\u0647\u0627\u064A\u0629.",
  "lsKidTwiceExp2": "\u0636\u0639 \u0641\u0627\u0635\u0644 \u0627\u0644\u0627\u0646\u062A\u0642\u0627\u0644 \u0628\u064A\u0646 \u0627\u0644\u062E\u0637\u0648\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u0648\u0627\u0644\u062E\u0637\u0648\u0629 \u0627\u0644\u062B\u0627\u0646\u064A\u0629.",
  "lsKidTwiceHint1": "\u0627\u0628\u062F\u0623 \u0628\u062E\u0637\u0648\u0629 \u0642\u0648\u0644 salam \u062B\u0645 \u0627\u0644\u0641\u0627\u0635\u0644 \u062B\u0645 \u062E\u0637\u0648\u0629 \u0642\u0648\u0644 ahlan.",
  "lsKidDoorTitle": "03. \u0627\u0644\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0645\u0646\u0637\u0642\u064A\u0629 \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629",
  "lsKidDoorGoal": "\u0643\u0648\u0651\u0646 \u0645\u0633\u0627\u0631 \u0628\u0648\u0627\u0628\u0629 \u0645\u0641\u062A\u0648\u062D\u0629 \u0644\u064A\u0642\u0648\u0644 \u0627\u0644\u0631\u0648\u0628\u0648\u062A salam.",
  "lsKidDoorExp1": "\u0627\u0644\u0634\u0631\u0637 \u064A\u0641\u062D\u0635 \u0647\u0644 \u0627\u0644\u0628\u0648\u0627\u0628\u0629 \u0645\u0641\u062A\u0648\u062D\u0629 \u0623\u0645 \u0645\u063A\u0644\u0642\u0629 \u0642\u0628\u0644 \u0627\u062A\u062E\u0627\u0630 \u0627\u0644\u0642\u0631\u0627\u0631.",
  "lsKidDoorExp2": "\u0644\u0623\u0646 \u0627\u0644\u0628\u0648\u0627\u0628\u0629 \u0645\u0641\u062A\u0648\u062D\u0629\u060C \u064A\u062A\u0645 \u062A\u0646\u0641\u064A\u0630 \u0627\u0644\u062E\u0637\u0648\u0629 \u0627\u0644\u0645\u0648\u062C\u0648\u062F\u0629 \u0628\u062F\u0627\u062E\u0644\u0647\u0627.",
  "lsKidDoorHint1": "\u0627\u0628\u062F\u0623 \u0628\u0627\u0644\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629\u060C \u062B\u0645 \u062E\u0637\u0648\u0629 \u0627\u0644\u0642\u0648\u0644\u060C \u062B\u0645 \u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u0645\u0633\u0627\u0631.",
  "lsKidSunRainTitle": "04. \u0645\u0633\u0627\u0631 \u0627\u0644\u0634\u0645\u0633 \u0623\u0645 \u0627\u0644\u0645\u0637\u0631",
  "lsKidSunRainGoal": "\u0627\u0633\u062A\u062E\u062F\u0645 \u0628\u0648\u0627\u0628\u0629 \u0623\u0648\u0644\u0649 \u0645\u063A\u0644\u0642\u0629 \u0648\u0645\u0633\u0627\u0631\u0627\u064B \u0628\u062F\u064A\u0644\u0627\u064B \u0644\u062A\u0638\u0647\u0631 \u0627\u0644\u0646\u062A\u064A\u062C\u0629 rain.",
  "lsKidSunRainExp1": "\u0639\u0646\u062F\u0645\u0627 \u064A\u0643\u0648\u0646 \u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0623\u0648\u0644 \u0645\u063A\u0644\u0642\u0627\u064B \u064A\u0646\u062A\u0642\u0644 \u0627\u0644\u0645\u0646\u0637\u0642 \u0645\u0628\u0627\u0634\u0631\u0629 \u0644\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0628\u062F\u064A\u0644.",
  "lsKidSunRainExp2": "\u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0628\u062F\u064A\u0644 \u064A\u0636\u0645\u0646 \u0648\u062C\u0648\u062F \u062E\u0637\u0629 \u0630\u0643\u064A\u0629 \u062F\u0627\u0626\u0645\u0627\u064B.",
  "lsKidSunRainHint1": "\u0636\u0639 \u0627\u0644\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u0627\u0644\u0645\u063A\u0644\u0642\u0629 \u0623\u0648\u0644\u0627\u064B \u062B\u0645 \u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0628\u062F\u064A\u0644 \u062B\u0645 \u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u0645\u0637\u0631.",
  "lsKidAskTitle": "05. \u0627\u0633\u0623\u0644 \u0648\u062A\u0644\u0642\u064E\u0651 \u0627\u0644\u0625\u062C\u0627\u0628\u0629",
  "lsKidAskGoal": "\u0631\u062A\u0628 \u0644\u0628\u0646\u0629 \u0627\u0644\u0633\u0624\u0627\u0644 \u0644\u062A\u0637\u0644\u0628 \u0627\u0644\u0627\u0633\u0645 \u0648\u062A\u062D\u064A\u064A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645.",
  "lsKidAskExp1": "\u064A\u0645\u0643\u0646 \u0644\u0644\u0628\u0631\u0646\u0627\u0645\u062C \u0633\u0624\u0627\u0644 \u0627\u0644\u0637\u0641\u0644 \u0623\u0648 \u0627\u0644\u0645\u062A\u0639\u0644\u0645 \u0648\u062D\u0641\u0638 \u0625\u062C\u0627\u0628\u062A\u0647 \u0641\u064A \u0627\u0644\u0630\u0627\u0643\u0631\u0629.",
  "lsKidAskExp2": "\u0627\u0633\u062A\u0639\u0645\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0625\u062F\u062E\u0627\u0644 \u0645\u0639 \u0623\u0645\u0631 \u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0644\u0639\u0631\u0636 \u062A\u0631\u062D\u064A\u0628 \u0645\u062E\u0635\u0635.",
  "lsKidAskHint1": "\u0636\u0639 \u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0633\u0624\u0627\u0644 \u0623\u0648\u0644\u0627\u064B \u062B\u0645 \u062E\u0637\u0648\u0629 \u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0628\u0627\u0644\u062A\u0631\u062D\u064A\u0628.",
  "lsKidBasketTitle": "06. \u0633\u0644\u0629 \u0627\u0644\u0643\u0646\u0648\u0632 \u0627\u0644\u0633\u062D\u0631\u064A\u0629",
  "lsKidBasketGoal": "\u0623\u0646\u0634\u0626 \u0633\u0644\u0629 \u0642\u0627\u0626\u0645\u0629 \u0639\u0646\u0627\u0635\u0631 \u0648\u0627\u0637\u0628\u0639 \u0639\u062F\u062F \u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u0628\u062F\u0627\u062E\u0644\u0647\u0627.",
  "lsKidBasketExp1": "\u0627\u0644\u0642\u0648\u0627\u0626\u0645 \u062A\u062C\u0645\u0639 \u0639\u062F\u0629 \u0639\u0646\u0627\u0635\u0631 \u0645\u0639\u0627\u064B \u062F\u0627\u062E\u0644 \u0623\u0642\u0648\u0627\u0633 \u0645\u0631\u0628\u0639\u0629 [ ... ].",
  "lsKidBasketExp2": "\u0623\u0645\u0631 \u0627\u0644\u0637\u0648\u0644 \u064A\u062D\u0633\u0628 \u0639\u062F\u062F \u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u062F\u0627\u062E\u0644 \u0627\u0644\u0633\u0644\u0629 \u0628\u062F\u0642\u0629.",
  "lsKidBasketHint1": "\u0623\u0646\u0634\u0626 \u0645\u062A\u063A\u064A\u0631 \u0627\u0644\u0633\u0644\u0629 \u0623\u0648\u0644\u0627\u064B \u062B\u0645 \u0627\u0637\u0628\u0639 \u0637\u0648\u0644 \u0627\u0644\u0633\u0644\u0629.",
  "lsBgPrintTitle": "01. \u0637\u0628\u0627\u0639\u0629 \u0645\u0631\u062D\u0628\u0627",
  "lsBgPrintGoal": '\u0627\u0643\u062A\u0628 \u0623\u0645\u0631\u0627\u064B \u064A\u0637\u0628\u0639 \u0627\u0644\u0646\u0635 "salam".',
  "lsBgPrintExp1": '\u062A\u0648\u0636\u0639 \u0627\u0644\u0646\u0635\u0648\u0635 \u062F\u0627\u062E\u0644 \u0639\u0644\u0627\u0645\u062A\u064A \u062A\u0646\u0635\u064A\u0635 \u0645\u062B\u0644 "salam".',
  "lsBgPrintExp2": "\u0627\u0643\u062A\u0628 \u0627\u0644\u0646\u0635 \u0628\u064A\u0646 \u0642\u0648\u0633\u064A\u0646 \u0628\u0639\u062F \u0643\u0644\u0645\u0629 \u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0641\u064A \u0644\u0647\u062C\u062A\u0643.",
  "lsBgPrintHint1": "\u062A\u0623\u0643\u062F \u0645\u0646 \u0643\u062A\u0627\u0628\u0629 salam \u0628\u0646\u0641\u0633 \u0627\u0644\u062D\u0631\u0648\u0641 \u062F\u0627\u062E\u0644 \u0639\u0644\u0627\u0645\u062A\u064A \u0627\u0644\u062A\u0646\u0635\u064A\u0635.",
  "lsBgPrintHint2": "\u0644\u0627 \u062A\u0646\u0633 \u0625\u063A\u0644\u0627\u0642 \u0639\u0644\u0627\u0645\u062A\u064A \u0627\u0644\u062A\u0646\u0635\u064A\u0635 \u0648\u0627\u0644\u0642\u0648\u0633\u064A\u0646.",
  "lsBgTwoTitle": "02. \u0633\u0637\u0631\u0627\u0646 \u0645\u062A\u062A\u0627\u0644\u064A\u0627\u0646",
  "lsBgTwoGoal": '\u0627\u0637\u0628\u0639 "salam" \u0641\u064A \u0627\u0644\u0633\u0637\u0631 \u0627\u0644\u0623\u0648\u0644 \u0648"ahlan" \u0641\u064A \u0627\u0644\u0633\u0637\u0631 \u0627\u0644\u062B\u0627\u0646\u064A.',
  "lsBgTwoExp1": "\u0643\u0644 \u0633\u0637\u0631 \u0628\u0631\u0645\u062C\u064A \u064A\u062A\u0646\u0641\u0630 \u0628\u0627\u0644\u062A\u0631\u062A\u064A\u0628 \u0627\u0644\u062F\u0642\u064A\u0642 \u0648\u0627\u062D\u062F\u0627\u064B \u062A\u0644\u0648 \u0627\u0644\u0622\u062E\u0631.",
  "lsBgTwoExp2": "\u0647\u0630\u0627 \u0627\u0644\u062A\u0633\u0644\u0633\u0644 \u0647\u0648 \u0623\u0633\u0627\u0633 \u0628\u0646\u0627\u0621 \u0623\u064A \u062E\u0648\u0627\u0631\u0632\u0645\u064A\u0629.",
  "lsBgTwoHint1": '\u0627\u0643\u062A\u0628 \u0623\u0645\u0631 "salam" \u0623\u0648\u0644\u0627\u064B \u062B\u0645 \u0623\u0645\u0631 "ahlan" \u0641\u064A \u0633\u0637\u0631 \u062C\u062F\u064A\u062F.',
  "lsBgNumberTitle": "03. \u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u0623\u0631\u0642\u0627\u0645",
  "lsBgNumberGoal": "\u0627\u0637\u0628\u0639 \u0627\u0644\u0631\u0642\u0645 7 \u0628\u062F\u0648\u0646 \u0639\u0644\u0627\u0645\u0627\u062A \u062A\u0646\u0635\u064A\u0635.",
  "lsBgNumberExp1": "\u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u0644\u0627 \u062A\u062D\u062A\u0627\u062C \u0639\u0644\u0627\u0645\u0627\u062A \u062A\u0646\u0635\u064A\u0635 \u062D\u062A\u0649 \u064A\u0641\u0647\u0645 \u0627\u0644\u062D\u0627\u0633\u0648\u0628 \u0623\u0646\u0647\u0627 \u0623\u0639\u062F\u0627\u062F \u062D\u0633\u0627\u0628\u064A\u0629.",
  "lsBgNumberExp2": "\u0645\u0631\u0631 \u0627\u0644\u0631\u0642\u0645 7 \u0645\u0628\u0627\u0634\u0631\u0629 \u062F\u0627\u062E\u0644 \u0642\u0648\u0633\u064A \u0627\u0644\u0637\u0628\u0627\u0639\u0629.",
  "lsBgNumberHint1": '\u0627\u0643\u062A\u0628 7 \u0641\u0642\u0637 \u0628\u062F\u0648\u0646 "".',
  "lsBgBoolTitle": "04. \u0635\u062D\u064A\u062D \u0623\u0645 \u062E\u0637\u0623",
  "lsBgBoolGoal": "\u0627\u0637\u0628\u0639 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0646\u0637\u0642\u064A\u0629 \u0635\u062D\u064A\u062D \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0643\u0644\u0645\u0629 \u0644\u0647\u062C\u062A\u0643.",
  "lsBgBoolExp1": "\u0627\u0644\u0642\u064A\u0645 \u0627\u0644\u0645\u0646\u0637\u0642\u064A\u0629 \u062A\u0639\u0628\u0631 \u0639\u0646 \u0627\u0644\u0635\u0648\u0627\u0628 \u0648\u0627\u0644\u062E\u0637\u0623 \u0648\u062A\u0628\u0646\u0649 \u0639\u0644\u064A\u0647\u0627 \u0627\u0644\u0642\u0631\u0627\u0631\u0627\u062A.",
  "lsBgBoolExp2": "\u0643\u0644 \u0644\u0647\u062C\u0629 \u062A\u0648\u0641\u0631 \u0643\u0644\u0645\u0629 \u0645\u062E\u0635\u0635\u0629 \u0644\u0644\u0635\u0648\u0627\u0628 \u0648\u0623\u062E\u0631\u0649 \u0644\u0644\u062E\u0637\u0623.",
  "lsBgBoolHint1": "\u0636\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0635\u0648\u0627\u0628 \u0645\u0646 \u0644\u0647\u062C\u062A\u0643 \u062F\u0627\u062E\u0644 \u0642\u0648\u0633\u064A \u0627\u0644\u0637\u0628\u0627\u0639\u0629.",
  "lsBgVarsTitle": "05. \u0627\u0644\u0645\u062A\u063A\u064A\u0631\u0627\u062A \u0648\u0627\u0644\u0630\u0627\u0643\u0631\u0629",
  "lsBgVarsGoal": "\u0627\u062D\u0641\u0638 \u0646\u0635 \u062A\u0631\u062D\u064A\u0628 \u062F\u0627\u062E\u0644 \u0645\u062A\u063A\u064A\u0631 \u062B\u0645 \u0627\u0637\u0628\u0639\u0647.",
  "lsBgVarsExp1": "\u0627\u0644\u0645\u062A\u063A\u064A\u0631\u0627\u062A \u062A\u0639\u0637\u064A \u0623\u0633\u0645\u0627\u0621 \u0644\u0644\u0642\u064A\u0645 \u062D\u062A\u0649 \u0646\u0639\u064A\u062F \u0627\u0633\u062A\u062E\u062F\u0627\u0645\u0647\u0627 \u0623\u0648 \u062A\u0639\u062F\u064A\u0644\u0647\u0627 \u0644\u0627\u062D\u0642\u0627\u064B.",
  "lsBgVarsExp2": "\u0627\u0633\u062A\u062E\u062F\u0645 \u0643\u0644\u0645\u0629 \u062A\u0639\u0631\u064A\u0641 \u0627\u0644\u0645\u062A\u063A\u064A\u0631 \u0641\u064A \u0644\u0647\u062C\u062A\u0643 \u0645\u062A\u0628\u0648\u0639\u0629 \u0628\u0627\u0644\u0627\u0633\u0645 = \u0627\u0644\u0642\u064A\u0645\u0629.",
  "lsBgVarsHint1": "\u0639\u0631\u0651\u0641 \u0627\u0644\u0645\u062A\u063A\u064A\u0631 \u0623\u0648\u0644\u0627\u064B \u062B\u0645 \u0645\u0631\u0651\u0631 \u0627\u0633\u0645\u0647 \u062F\u0627\u062E\u0644 \u062F\u0627\u0644\u0629 \u0627\u0644\u0637\u0628\u0627\u0639\u0629.",
  "lsBgInputTitle": "06. \u062A\u0631\u062D\u064A\u0628 \u062A\u0641\u0627\u0639\u0644\u064A \u0628\u0627\u0644\u0625\u062F\u062E\u0627\u0644",
  "lsBgInputGoal": "\u0627\u0637\u0644\u0628 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0639\u0628\u0631 \u0627\u0644\u0625\u062F\u062E\u0627\u0644 \u062B\u0645 \u0627\u0637\u0628\u0639 \u062A\u062D\u064A\u0629 \u0628\u0627\u0633\u0645\u0647.",
  "lsBgInputExp1": "\u0623\u0645\u0631 \u0627\u0644\u0625\u062F\u062E\u0627\u0644 \u064A\u0648\u0642\u0641 \u0627\u0644\u062A\u0646\u0641\u064A\u0630 \u0628\u0644\u0637\u0641 \u0644\u064A\u0633\u0623\u0644 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0639\u0646 \u0625\u062C\u0627\u0628\u0629.",
  "lsBgInputExp2": "\u0627\u062D\u0641\u0638 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0641\u064A \u0645\u062A\u063A\u064A\u0631 \u062B\u0645 \u0627\u0637\u0628\u0639 \u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u062A\u0631\u062D\u064A\u0628 \u0628\u0647.",
  "lsBgInputHint1": '\u0627\u0633\u0646\u062F \u0646\u062A\u064A\u062C\u0629 \u062F\u0627\u0644\u0629 \u0627\u0644\u0625\u062F\u062E\u0627\u0644 \u0625\u0644\u0649 \u0645\u062A\u063A\u064A\u0631 \u062B\u0645 \u0627\u0637\u0628\u0639("Salam", \u0627\u0644\u0645\u062A\u063A\u064A\u0631).',
  "lsBgIfTitle": "07. \u0623\u0648\u0644 \u0642\u0631\u0627\u0631 \u0628\u0631\u0645\u062C\u064A",
  "lsBgIfGoal": '\u0627\u0643\u062A\u0628 \u0643\u062A\u0644\u0629 \u0634\u0631\u0637\u064A\u0629 \u0628\u0642\u064A\u0645\u0629 \u0635\u062D\u064A\u062D \u062A\u0637\u0628\u0639 "salam".',
  "lsBgIfExp1": "\u0627\u0644\u0623\u0642\u0648\u0627\u0633 \u0627\u0644\u0645\u0639\u0642\u0648\u0641\u0629 { ... } \u062A\u062C\u0645\u0639 \u0627\u0644\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u062A\u064A \u062A\u062E\u0636\u0639 \u0644\u0644\u0634\u0631\u0637.",
  "lsBgIfExp2": "\u0639\u0646\u062F\u0645\u0627 \u062A\u0643\u0648\u0646 \u0642\u064A\u0645\u0629 \u0627\u0644\u0634\u0631\u0637 \u0635\u062D\u064A\u062D\u0629 \u064A\u062A\u0645 \u062A\u0646\u0641\u064A\u0630 \u0627\u0644\u0645\u062D\u062A\u0648\u0649.",
  "lsBgIfHint1": "\u062A\u0623\u0643\u062F \u0645\u0646 \u0641\u062A\u062D \u0648\u0625\u063A\u0644\u0627\u0642 { \u0648 } \u0628\u0634\u0643\u0644 \u0635\u062D\u064A\u062D.",
  "lsBgElseTitle": "08. \u0645\u0633\u0627\u0631\u0627\u0646 \u0644\u0644\u0642\u0631\u0627\u0631",
  "lsBgElseGoal": '\u0627\u0643\u062A\u0628 \u0634\u0631\u0637\u0627\u064B \u062E\u0627\u0637\u0626\u0627\u064B \u0645\u0639 \u0641\u0631\u0639 \u0628\u062F\u064A\u0644 \u064A\u0637\u0628\u0639 "no".',
  "lsBgElseExp1": "\u0646\u062C\u0645\u0639 \u0628\u064A\u0646 \u0625\u0630\u0627 \u0648\u0625\u0644\u0627 \u0644\u0645\u0639\u0627\u0644\u062C\u0629 \u062D\u0627\u0644\u062A\u064A\u0646 \u0645\u062A\u0642\u0627\u0628\u0644\u062A\u064A\u0646 \u0628\u0648\u0636\u0648\u062D.",
  "lsBgElseExp2": "\u0644\u0623\u0646 \u0627\u0644\u0634\u0631\u0637 \u0627\u0644\u0623\u0648\u0644 \u062E\u0637\u0623 \u0633\u064A\u0646\u0641\u0630 \u0641\u0631\u0639 \u0627\u0644\u0628\u062F\u064A\u0644 \u0645\u0628\u0627\u0634\u0631\u0629.",
  "lsBgElseHint1": '\u062A\u0623\u0643\u062F \u0623\u0646 \u0641\u0631\u0639 \u0627\u0644\u0628\u062F\u064A\u0644 \u064A\u0637\u0628\u0639 "no".',
  "lsBgCompareTitle": "09. \u0645\u0642\u0627\u0631\u0646\u0629 \u0627\u0644\u0623\u0631\u0642\u0627\u0645",
  "lsBgCompareGoal": '\u0627\u0633\u062A\u062E\u062F\u0645 \u0645\u0642\u0627\u0631\u0646\u0629 \u0645\u062B\u0644 (10 > 3) \u062F\u0627\u062E\u0644 \u0627\u0644\u0634\u0631\u0637 \u0644\u0637\u0628\u0627\u0639\u0629 "salam".',
  "lsBgCompareExp1": "\u0639\u0648\u0627\u0645\u0644 \u0627\u0644\u0645\u0642\u0627\u0631\u0646\u0629 > \u0648 < \u0648 == \u062A\u0641\u062D\u0635 \u0627\u0644\u0642\u064A\u0645 \u0648\u062A\u0646\u062A\u062C \u0635\u0648\u0627\u0628\u0627\u064B \u0623\u0648 \u062E\u0637\u0623.",
  "lsBgCompareExp2": "\u062A\u0633\u0645\u062D \u0644\u0644\u0628\u0631\u0627\u0645\u062C \u0628\u0627\u062A\u062E\u0627\u0630 \u0642\u0631\u0627\u0631\u0627\u062A \u0630\u0643\u064A\u0629 \u062D\u0633\u0628 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A.",
  "lsBgCompareHint1": "\u0627\u0643\u062A\u0628 (10 > 3) \u0628\u064A\u0646 \u0642\u0648\u0633\u064A \u0627\u0644\u0634\u0631\u0637.",
  "lsBgWhileTitle": "10. \u062D\u0644\u0642\u0627\u062A \u0627\u0644\u0639\u062F \u0648\u0627\u0644\u062A\u0643\u0631\u0627\u0631 (\u0628\u064A\u0646\u0645\u0627)",
  "lsBgWhileGoal": "\u0639\u062F\u0651 \u0645\u0646 0 \u0625\u0644\u0649 2 \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u062D\u0644\u0642\u0629 \u0628\u064A\u0646\u0645\u0627.",
  "lsBgWhileExp1": "\u064A\u0632\u062F\u0627\u062F \u0627\u0644\u0639\u062F\u0627\u062F \u0641\u064A \u0643\u0644 \u062F\u0648\u0631\u0629 \u062D\u062A\u0649 \u064A\u0635\u0628\u062D \u0627\u0644\u0634\u0631\u0637 \u062E\u0627\u0637\u0626\u0627\u064B \u0648\u062A\u062A\u0648\u0642\u0641 \u0627\u0644\u062D\u0644\u0642\u0629.",
  "lsBgWhileExp2": "\u062D\u062F\u0651\u062B \u0627\u0644\u0639\u062F\u0627\u062F \u062F\u0627\u0626\u0645\u0627\u064B \u062F\u0627\u062E\u0644 \u0627\u0644\u062D\u0644\u0642\u0629 \u062D\u062A\u0649 \u0644\u0627 \u062A\u0633\u062A\u0645\u0631 \u0644\u0644\u0623\u0628\u062F.",
  "lsBgWhileHint1": "\u0627\u0628\u062F\u0623 \u0628\u0640 i = 0 \u0648\u0627\u0641\u062D\u0635 (i < 3) \u062B\u0645 \u0627\u0637\u0628\u0639 i \u0648\u0632\u062F\u0647\u0627 \u0628\u0645\u0642\u062F\u0627\u0631 1.",
  "lsBgForTitle": "11. \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0646\u0637\u0627\u0642\u0627\u062A (\u0644\u0643\u0644)",
  "lsBgForGoal": "\u0643\u0631\u0651\u0631 \u0639\u0628\u0631 \u0627\u0644\u0645\u062C\u0627\u0644 1..3 \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0643\u0644\u0645\u0629 \u0627\u0644\u062A\u0643\u0631\u0627\u0631 \u0644\u0643\u0644.",
  "lsBgForExp1": "\u062D\u0644\u0642\u0627\u062A \u0627\u0644\u0646\u0637\u0627\u0642 \u062A\u0645\u0631 \u0645\u0646 \u0627\u0644\u0628\u062F\u0627\u064A\u0629 \u0625\u0644\u0649 \u0627\u0644\u0646\u0647\u0627\u064A\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u062F\u0648\u0646 \u0639\u062F\u0627\u062F \u064A\u062F\u0648\u064A.",
  "lsBgForExp2": "\u0627\u0643\u062A\u0628 (i : 1..3) \u0644\u064A\u062A\u0646\u0641\u0630 \u0627\u0644\u062C\u0633\u0645 \u0644\u0644\u0623\u0631\u0642\u0627\u0645 1 \u062B\u0645 2 \u062B\u0645 3.",
  "lsBgForHint1": "\u0627\u0633\u062A\u0639\u0645\u0644 (i : 1..3) \u062F\u0627\u062E\u0644 \u0631\u0623\u0633 \u062D\u0644\u0642\u0629 \u0627\u0644\u062A\u0643\u0631\u0627\u0631.",
  "lsBgListTitle": "12. \u0627\u0644\u0642\u0648\u0627\u0626\u0645 \u0648\u062D\u062C\u0645 \u0627\u0644\u0633\u0644\u0629",
  "lsBgListGoal": "\u0623\u0646\u0634\u0626 \u0642\u0627\u0626\u0645\u0629 \u0648\u0623\u0636\u0641 \u0639\u0646\u0635\u0631\u0627\u064B \u062C\u062F\u064A\u062F\u0627\u064B \u062B\u0645 \u0627\u0637\u0628\u0639 \u0637\u0648\u0644\u0647\u0627.",
  "lsBgListExp1": "\u0627\u0644\u0642\u0648\u0627\u0626\u0645 \u062A\u062D\u0641\u0638 \u0645\u062C\u0645\u0648\u0639\u0629 \u0639\u0646\u0627\u0635\u0631 \u0645\u0631\u062A\u0628\u0629 \u062F\u0627\u062E\u0644 \u0627\u0644\u0623\u0642\u0648\u0627\u0633 [ ... ].",
  "lsBgListExp2": "\u0627\u0633\u062A\u0639\u0645\u0644 \u0623\u0645\u0631 \u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u0644\u062A\u0648\u0633\u064A\u0639 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0648\u0623\u0645\u0631 \u0627\u0644\u0637\u0648\u0644 \u0644\u0645\u0639\u0631\u0641\u0629 \u0639\u062F\u062F\u0647\u0627.",
  "lsBgListHint1": "\u0639\u0631\u0651\u0641 \u0642\u0627\u0626\u0645\u0629 \u062B\u0645 \u0623\u0636\u0641 \u0625\u0644\u064A\u0647\u0627 30 \u062B\u0645 \u0627\u0637\u0628\u0639 \u0637\u0648\u0644 \u0627\u0644\u0642\u0627\u0626\u0645\u0629.",
  "lsPrTwoIfsTitle": "01. \u0641\u062D\u0648\u0635\u0627\u062A \u0645\u0633\u062A\u0642\u0644\u0629 \u0645\u062A\u062A\u0627\u0644\u064A\u0629",
  "lsPrTwoIfsGoal": '\u0627\u0643\u062A\u0628 \u0634\u0631\u0637\u064A\u0646 \u0645\u062A\u062A\u0627\u0644\u064A\u064A\u0646 (\u0623\u062D\u062F\u0647\u0645\u0627 \u0635\u062D\u064A\u062D \u0648\u0627\u0644\u0622\u062E\u0631 \u062E\u0627\u0637\u0626) \u0644\u0637\u0628\u0627\u0639\u0629 "salam" \u0648"ahlan".',
  "lsPrTwoIfsExp1": "\u0627\u0644\u0643\u062A\u0644 \u0627\u0644\u0634\u0631\u0637\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u0642\u0644\u0629 \u064A\u062A\u0645 \u062A\u0642\u064A\u064A\u0645 \u0643\u0644 \u0645\u0646\u0647\u0627 \u0639\u0644\u0649 \u062D\u062F\u0629.",
  "lsPrTwoIfsExp2": "\u062A\u0645\u0631\u0646 \u0639\u0644\u0649 \u0643\u062A\u0627\u0628\u0629 \u0623\u0643\u062B\u0631 \u0645\u0646 \u0628\u0646\u064A\u0629 \u062A\u062D\u0643\u0645 \u0628\u062A\u0631\u062A\u064A\u0628 \u0646\u0638\u064A\u0641.",
  "lsPrTwoIfsHint1": '\u0623\u0646\u0634\u0626 \u0634\u0631\u0637\u0627\u064B \u0628\u0642\u064A\u0645\u0629 \u0635\u062D\u064A\u062D \u064A\u0637\u0628\u0639 "salam" \u0648\u0622\u062E\u0631 \u0628\u0642\u064A\u0645\u0629 \u062E\u0637\u0623 \u064A\u0637\u0628\u0639 "ahlan".',
  "lsPrNestedTitle": "02. \u0627\u0644\u0634\u0631\u0648\u0637 \u0627\u0644\u0645\u062A\u062F\u0627\u062E\u0644\u0629",
  "lsPrNestedGoal": '\u0636\u0639 \u0634\u0631\u0637\u0627\u064B \u0648\u0628\u062F\u064A\u0644\u0627\u064B \u062F\u0627\u062E\u0644 \u0634\u0631\u0637 \u062E\u0627\u0631\u062C\u064A \u0644\u064A\u0637\u0628\u0639 \u0627\u0644\u0628\u062F\u064A\u0644 \u0627\u0644\u062F\u0627\u062E\u0644\u064A "b".',
  "lsPrNestedExp1": "\u064A\u0645\u0643\u0646 \u0648\u0636\u0639 \u0634\u0631\u0637 \u062F\u0627\u062E\u0644 \u0622\u062E\u0631 \u0644\u0628\u0646\u0627\u0621 \u0642\u0631\u0627\u0631\u0627\u062A \u0645\u062A\u0639\u062F\u062F\u0629 \u0627\u0644\u0645\u0633\u062A\u0648\u064A\u0627\u062A.",
  "lsPrNestedExp2": "\u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u0627\u0641\u0627\u062A \u0627\u0644\u0628\u0627\u062F\u0626\u0629 \u062D\u062A\u0649 \u062A\u0628\u0642\u0649 \u0627\u0644\u0623\u0642\u0648\u0627\u0633 \u0648\u0627\u0636\u062D\u0629.",
  "lsPrNestedHint1": "\u0636\u0639 \u0627\u0644\u0634\u0631\u0637 \u0627\u0644\u062F\u0627\u062E\u0644\u064A \u0627\u0644\u062E\u0637\u0623 \u0645\u0639 \u0627\u0644\u0628\u062F\u064A\u0644 \u062F\u0627\u062E\u0644 \u0634\u0631\u0637 \u062E\u0627\u0631\u062C\u064A \u0635\u062D\u064A\u062D.",
  "lsPrWhileTitle": "03. \u0628\u0646\u064A\u0629 \u062D\u0644\u0642\u0629 \u0627\u0644\u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0622\u0645\u0646\u0629",
  "lsPrWhileGoal": '\u0643\u0648\u0651\u0646 \u062D\u0644\u0642\u0629 \u0628\u064A\u0646\u0645\u0627 \u0628\u0634\u0631\u0637 \u062E\u0627\u0637\u0626 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0637\u0628\u0627\u0639\u0629 "salam".',
  "lsPrWhileExp1": "\u062A\u0641\u062D\u0635 \u062D\u0644\u0642\u0629 \u0627\u0644\u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0634\u0631\u0637 \u0642\u0628\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0641\u064A \u0643\u0644 \u062F\u0648\u0631\u0629.",
  "lsPrWhileExp2": "\u064A\u0641\u062A\u062D \u0647\u0630\u0627 \u0627\u0644\u062F\u0631\u0633 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0644\u0644\u0647\u062C\u0627\u062A \u0627\u0644\u062A\u064A \u062A\u0636\u0645 \u0643\u0644\u0645\u0629 \u0628\u064A\u0646\u0645\u0627 \u0627\u0644\u0645\u0641\u062A\u0627\u062D\u064A\u0629.",
  "lsPrWhileHint1": "\u062B\u0628\u0651\u062A \u0627\u0644\u062D\u0632\u0645\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629 \u0645\u0646 \u0627\u0644\u0642\u0627\u0645\u0648\u0633 \u0625\u0630\u0627 \u0643\u0627\u0646\u062A \u0644\u0647\u062C\u062A\u0643 \u0627\u0644\u0623\u0648\u0644\u064A\u0629 \u0644\u0627 \u062A\u0636\u0645 \u0628\u064A\u0646\u0645\u0627 \u0628\u0639\u062F.",
  "lsPrFuncTitle": "04. \u0627\u0644\u062F\u0648\u0627\u0644 \u0627\u0644\u0642\u0627\u0628\u0644\u0629 \u0644\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645",
  "lsPrFuncGoal": "\u0639\u0631\u0651\u0641 \u062F\u0627\u0644\u0629 \u0628\u0644\u0647\u062C\u062A\u0643 \u062A\u0633\u062A\u0642\u0628\u0644 \u0648\u0633\u064A\u0637\u0627\u064B \u0648\u0627\u0633\u062A\u062F\u0639\u0647\u0627 \u0645\u0631\u062A\u064A\u0646.",
  "lsPrFuncExp1": "\u0627\u0644\u062F\u0648\u0627\u0644 \u062A\u062C\u0645\u0639 \u062E\u0637\u0648\u0627\u062A \u0645\u062A\u0643\u0631\u0631\u0629 \u062A\u062D\u062A \u0627\u0633\u0645 \u0648\u0627\u062D\u062F \u0648\u062A\u0633\u062A\u0642\u0628\u0644 \u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0645\u062A\u063A\u064A\u0631\u0629.",
  "lsPrFuncExp2": '\u0627\u0633\u062A\u062F\u0639\u0627\u0621 \u0627\u0644\u062F\u0627\u0644\u0629 \u0628\u0642\u064A\u0645\u0629 "Maghreb" \u064A\u0646\u0641\u0630 \u062C\u0633\u0645\u0647\u0627 \u0628\u062A\u0644\u0643 \u0627\u0644\u0642\u064A\u0645\u0629.',
  "lsPrFuncHint1": "\u0639\u0631\u0651\u0641 \u0627\u0644\u062F\u0627\u0644\u0629 \u0628\u0643\u0644\u0645\u0629 \u0627\u0644\u062F\u0627\u0644\u0629 \u062B\u0645 \u0627\u0633\u062A\u062F\u0639\u0647\u0627 \u0645\u0639 \u062A\u0645\u0631\u064A\u0631 \u0646\u0635 \u0628\u064A\u0646 \u0642\u0648\u0633\u064A\u0646.",
  "lsPrReturnTitle": "05. \u0627\u0644\u062F\u0648\u0627\u0644 \u0648\u0625\u0631\u062C\u0627\u0639 \u0627\u0644\u0642\u064A\u0645",
  "lsPrReturnGoal": "\u0627\u0643\u062A\u0628 \u062F\u0627\u0644\u0629 \u062A\u0631\u062C\u0639 \u062D\u0627\u0635\u0644 \u0636\u0631\u0628 a * b \u0648\u0627\u0637\u0628\u0639 \u0646\u062A\u064A\u062C\u062A\u0647\u0627.",
  "lsPrReturnExp1": "\u0643\u0644\u0645\u0629 \u0627\u0644\u0625\u0631\u062C\u0627\u0639 \u062A\u0639\u064A\u062F \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u0645\u062D\u0633\u0648\u0628\u0629 \u0625\u0644\u0649 \u0645\u0643\u0627\u0646 \u0627\u0633\u062A\u062F\u0639\u0627\u0621 \u0627\u0644\u062F\u0627\u0644\u0629.",
  "lsPrReturnExp2": "\u064A\u0645\u0643\u0646 \u062A\u0645\u0631\u064A\u0631 \u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u062F\u0627\u0644\u0629 \u0645\u0628\u0627\u0634\u0631\u0629 \u062F\u0627\u062E\u0644 \u0623\u0645\u0631 \u0627\u0644\u0637\u0628\u0627\u0639\u0629.",
  "lsPrReturnHint1": "\u0623\u0646\u0647\u0650 \u062C\u0633\u0645 \u0627\u0644\u062F\u0627\u0644\u0629 \u0628\u0623\u0645\u0631 \u0627\u0644\u0625\u0631\u062C\u0627\u0639 a * b \u062B\u0645 \u0627\u0637\u0628\u0639 \u0646\u062F\u0627\u0621 \u0627\u0644\u062F\u0627\u0644\u0629.",
  "lsPrArraysTitle": "06. \u0627\u0644\u0645\u0635\u0641\u0648\u0641\u0627\u062A \u0648\u0627\u0644\u0642\u0648\u0627\u0626\u0645",
  "lsPrArraysGoal": "\u0623\u0646\u0634\u0626 \u0642\u0627\u0626\u0645\u0629 \u0648\u0623\u0636\u0641 \u0639\u0646\u0635\u0631\u0627\u064B \u0648\u0627\u0642\u0631\u0623 \u0628\u0627\u0644\u0641\u0647\u0631\u0633 \u062B\u0645 \u0627\u0637\u0628\u0639 \u0627\u0644\u0637\u0648\u0644.",
  "lsPrArraysExp1": "\u0627\u0644\u0623\u0642\u0648\u0627\u0633 \u0627\u0644\u0645\u0631\u0628\u0639\u0629 [0] \u062A\u0642\u0631\u0623 \u0623\u0648\u0644 \u0639\u0646\u0635\u0631 \u0641\u064A \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0645\u0628\u0627\u0634\u0631\u0629 \u0628\u0627\u0644\u0641\u0647\u0631\u0633.",
  "lsPrArraysExp2": "\u064A\u0645\u0643\u0646 \u0625\u0636\u0627\u0641\u0629 \u0639\u0646\u0627\u0635\u0631 \u062C\u062F\u064A\u062F\u0629 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u062A\u0646\u0641\u064A\u0630 \u0639\u0628\u0631 \u062F\u0627\u0644\u0629 \u0627\u0644\u0625\u0636\u0627\u0641\u0629.",
  "lsPrArraysHint1": "\u0627\u062C\u0645\u0639 \u0628\u064A\u0646 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0635\u0641\u0648\u0641\u0629 \u0648\u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u0648\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0639\u0646\u0635\u0631 \u0627\u0644\u0623\u0648\u0644 \u0648\u062D\u0633\u0627\u0628 \u0627\u0644\u0637\u0648\u0644.",
  "lsPrForEachTitle": "07. \u0627\u0644\u0645\u0631\u0648\u0631 \u0639\u0644\u0649 \u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0642\u0627\u0626\u0645\u0629",
  "lsPrForEachGoal": "\u0627\u0633\u062A\u062E\u062F\u0645 \u062D\u0644\u0642\u0629 \u0644\u0643\u0644 \u0644\u0637\u0628\u0627\u0639\u0629 \u0643\u0644 \u0639\u0646\u0635\u0631 \u062F\u0627\u062E\u0644 \u0627\u0644\u0645\u0635\u0641\u0648\u0641\u0629.",
  "lsPrForEachExp1": "\u0627\u0644\u0635\u064A\u063A\u0629 (item : myList) \u062A\u0645\u0631 \u0639\u0644\u0649 \u0643\u0644 \u0639\u0646\u0635\u0631 \u0628\u0627\u0644\u062A\u0631\u062A\u064A\u0628.",
  "lsPrForEachExp2": "\u062A\u063A\u0646\u064A\u0643 \u0647\u0630\u0647 \u0627\u0644\u0635\u064A\u063A\u0629 \u0639\u0646 \u0623\u062E\u0637\u0627\u0621 \u0639\u062F\u0651 \u0627\u0644\u0641\u0647\u0627\u0631\u0633 \u064A\u062F\u0648\u064A\u0627\u064B.",
  "lsPrForEachHint1": "\u0643\u0631\u0651\u0631 \u0639\u0644\u0649 \u0645\u062A\u063A\u064A\u0631 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u062F\u0627\u062E\u0644 \u062D\u0644\u0642\u0629 \u0644\u0643\u0644 \u0648\u0627\u0637\u0628\u0639 \u0627\u0644\u0639\u0646\u0635\u0631.",
  "lsPrForSumTitle": "08. \u0627\u0644\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u062A\u0631\u0627\u0643\u0645\u064A \u0628\u0627\u0644\u0646\u0637\u0627\u0642",
  "lsPrForSumGoal": "\u0627\u062C\u0645\u0639 \u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u0645\u0646 1 \u0625\u0644\u0649 4 \u062F\u0627\u062E\u0644 \u062D\u0644\u0642\u0629 \u0646\u0637\u0627\u0642 \u0648\u0627\u0637\u0628\u0639 \u0627\u0644\u0645\u062C\u0645\u0648\u0639.",
  "lsPrForSumExp1": "\u0627\u0644\u0645\u062A\u063A\u064A\u0631 \u0627\u0644\u062A\u0631\u0627\u0643\u0645\u064A \u064A\u062D\u0641\u0638 \u0627\u0644\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u062C\u0627\u0631\u064A \u0642\u0628\u0644 \u0628\u062F\u0621 \u0627\u0644\u062D\u0644\u0642\u0629 \u0648\u064A\u0632\u064A\u062F\u0647 \u0643\u0644 \u062F\u0648\u0631\u0629.",
  "lsPrForSumExp2": "\u0627\u0637\u0628\u0639 \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u0646\u0647\u0627\u0626\u064A\u0629 \u0628\u0639\u062F \u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u062D\u0644\u0642\u0629 \u0645\u0631\u0629 \u0648\u0627\u062D\u062F\u0629.",
  "lsPrForSumHint1": "\u0627\u0628\u062F\u0623 \u0628\u0640 total = 0 \u062B\u0645 \u062D\u062F\u0651\u062B total = total + i \u062F\u0627\u062E\u0644 (i : 1..4).",
  "lsPrFnListTitle": "09. \u062A\u0645\u0631\u064A\u0631 \u0627\u0644\u0645\u0635\u0641\u0648\u0641\u0627\u062A \u0644\u0644\u062F\u0648\u0627\u0644",
  "lsPrFnListGoal": "\u0627\u0643\u062A\u0628 \u062F\u0627\u0644\u0629 \u062A\u0633\u062A\u0642\u0628\u0644 \u0642\u0627\u0626\u0645\u0629 \u0648\u062A\u064F\u0631\u062C\u0639 \u0637\u0648\u0644\u0647\u0627.",
  "lsPrFnListExp1": "\u062A\u064F\u0645\u0631\u0651\u0631 \u0627\u0644\u0645\u0635\u0641\u0648\u0641\u0627\u062A \u0643\u0648\u0633\u0627\u0626\u0637 \u0644\u0644\u062F\u0648\u0627\u0644 \u062A\u0645\u0627\u0645\u0627\u064B \u0645\u062B\u0644 \u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u0648\u0627\u0644\u0646\u0635\u0648\u0635.",
  "lsPrFnListExp2": "\u0627\u0633\u062A\u062F\u0639\u0627\u0621 \u062F\u0627\u0644\u0629 \u0627\u0644\u0637\u0648\u0644 \u062F\u0627\u062E\u0644 \u0627\u0644\u062F\u0627\u0644\u0629 \u064A\u0639\u064A\u062F \u0639\u062F\u062F \u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0641\u0639\u0644\u064A.",
  "lsPrFnListHint1": "\u0645\u0631\u0651\u0631 \u0642\u0627\u0626\u0645\u0629 bag \u0625\u0644\u0649 \u0627\u0644\u062F\u0627\u0644\u0629 countBag \u0648\u0627\u0637\u0628\u0639 \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u0645\u0631\u062C\u0639\u0629.",
  "lsPrInputGuardTitle": "10. \u0641\u062D\u0635 \u0627\u0644\u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A",
  "lsPrInputGuardGoal": "\u0627\u0642\u0631\u0623 \u0642\u064A\u0645\u0629 \u0639\u0628\u0631 input \u0648\u0627\u0641\u062D\u0635\u0647\u0627 \u0628\u0634\u0631\u0637 \u0625\u0630\u0627/\u0648\u0625\u0644\u0627 \u0648\u0627\u0637\u0628\u0639 \u0627\u0644\u0646\u062A\u064A\u062C\u0629.",
  "lsPrInputGuardExp1": "\u0627\u0644\u062C\u0645\u0639 \u0628\u064A\u0646 \u0627\u0644\u0625\u062F\u062E\u0627\u0644 \u0648\u0627\u0644\u0634\u0631\u0648\u0637 \u064A\u062D\u0645\u064A \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062C \u0645\u0646 \u0627\u0644\u0642\u064A\u0645 \u063A\u064A\u0631 \u0627\u0644\u0645\u062A\u0648\u0642\u0639\u0629.",
  "lsPrInputGuardExp2": "\u0639\u0627\u0644\u062C \u062D\u0627\u0644\u062A\u064A \u0627\u0644\u0646\u062C\u0627\u062D \u0648\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0648\u0636\u0648\u062D.",
  "lsPrInputGuardHint1": "\u0627\u0642\u0631\u0623 \u0627\u0644\u062F\u0631\u062C\u0629 \u0639\u0628\u0631 \u0627\u0644\u0625\u062F\u062E\u0627\u0644 \u062B\u0645 \u062A\u062D\u0642\u0642 \u0645\u0646 (>= 10) \u0645\u0639 \u0641\u0631\u0639 \u0627\u0644\u0628\u062F\u064A\u0644.",
  "lsPrFnComposeTitle": "11. \u062A\u0631\u0643\u064A\u0628 \u0627\u0644\u062F\u0648\u0627\u0644 \u0648\u0645\u0643\u062F\u0633 \u0627\u0644\u0627\u0633\u062A\u062F\u0639\u0627\u0621",
  "lsPrFnComposeGoal": "\u0639\u0631\u0651\u0641 \u062F\u0627\u0644\u062A\u064A\u0646 \u0628\u062D\u064A\u062B \u062A\u0633\u062A\u062F\u0639\u064A \u0627\u0644\u062B\u0627\u0646\u064A\u0629 \u0627\u0644\u062F\u0627\u0644\u0629 \u0627\u0644\u0623\u0648\u0644\u0649.",
  "lsPrFnComposeExp1": "\u062A\u0642\u0633\u064A\u0645 \u0627\u0644\u062E\u0648\u0627\u0631\u0632\u0645\u064A\u0629 \u0625\u0644\u0649 \u062F\u0648\u0627\u0644 \u0645\u0633\u0627\u0639\u062F\u0629 \u064A\u0633\u0647\u0644 \u0627\u0644\u0635\u064A\u0627\u0646\u0629 \u0648\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645.",
  "lsPrFnComposeExp2": "\u062A\u0627\u0628\u0639 \u062E\u0637\u0648\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u062F\u0639\u0627\u0621 \u0641\u064A \u0639\u0627\u0631\u0636 \u0645\u0643\u062F\u0633 \u0627\u0644\u0627\u0633\u062A\u062F\u0639\u0627\u0621 \u0628\u0623\u062F\u0648\u0627\u062A \u0627\u0644\u0645\u0637\u0648\u0631.",
  "lsPrFnComposeHint1": "\u0639\u0631\u0651\u0641 square(n) \u062B\u0645 sumSq(x, y) \u0627\u0644\u062A\u064A \u062A\u0631\u062C\u0639 square(x) + square(y).",
  "lsPrErrorsTitle": "12. \u0641\u062D\u0635 \u062D\u062F\u0648\u062F \u0627\u0644\u0645\u0635\u0641\u0648\u0641\u0629 \u0627\u0644\u0622\u0645\u0646",
  "lsPrErrorsGoal": "\u062A\u062D\u0642\u0642 \u0645\u0646 \u0637\u0648\u0644 \u0627\u0644\u0645\u0635\u0641\u0648\u0641\u0629 \u0642\u0628\u0644 \u0642\u0631\u0627\u0621\u0629 \u0639\u0646\u0635\u0631 \u0628\u0641\u0647\u0631\u0633 \u0645\u062D\u062F\u062F.",
  "lsPrErrorsExp1": "\u0641\u062D\u0635 \u0627\u0644\u0637\u0648\u0644 \u0645\u0633\u0628\u0642\u0627\u064B \u064A\u0645\u0646\u0639 \u0623\u062E\u0637\u0627\u0621 \u062A\u062C\u0627\u0648\u0632 \u062D\u062F\u0648\u062F \u0627\u0644\u0645\u0635\u0641\u0648\u0641\u0629 \u0648\u0642\u062A \u0627\u0644\u062A\u0634\u063A\u064A\u0644.",
  "lsPrErrorsExp2": "\u0648\u0641\u0631 \u0631\u0633\u0627\u0644\u0629 \u0628\u062F\u064A\u0644\u0629 \u0648\u0627\u0636\u062D\u0629 \u0641\u064A \u0641\u0631\u0639 \u0648\u0625\u0644\u0627 \u0639\u0646\u062F \u0642\u0650\u0635\u064E\u0631 \u0627\u0644\u0642\u0627\u0626\u0645\u0629.",
  "lsPrErrorsHint1": "\u0627\u0641\u062D\u0635 (len(items) > 1) \u0642\u0628\u0644 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 items[1].",
  "reviewAgain": "\u0623\u0639\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629",
  "cardLabel": "\u0628\u0637\u0627\u0642\u0629",
  "closeBtn": "\u0625\u063A\u0644\u0627\u0642",
  "lessonRoadmapTitle": "\u062E\u0631\u064A\u0637\u0629 \u062A\u0642\u062F\u0645 \u0627\u0644\u062F\u0631\u0648\u0633",
  "lessonRoadmapSummary": "\u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0623\u064A \u0631\u0642\u0645 \u062F\u0631\u0633 \u0644\u0644\u0627\u0646\u062A\u0642\u0627\u0644 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0625\u0644\u064A\u0647 \u062D\u0633\u0628 \u0645\u0633\u062A\u0648\u0627\u0643.",
  "lessonStageReady": "\u062C\u0627\u0647\u0632",
  "lessonStageCompleted": "\u0645\u0643\u062A\u0645\u0644",
  "lessonStageLocked": "\u0645\u0642\u0641\u0644",
  "lessonStagePlanned": "\u0642\u0627\u062F\u0645",
  "listenLessonAudio": "\u0627\u0633\u062A\u0645\u0639 \u0644\u0644\u0646\u0637\u0642",
  "startReviewSession": "\u062C\u0644\u0633\u0629 \u0645\u0631\u0627\u062C\u0639\u0629",
  "stopReviewSession": "\u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629",
  "reviewSessionTitle": "\u062C\u0644\u0633\u0629 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u062F\u0631\u0648\u0633 \u0627\u0644\u0645\u0643\u062A\u0645\u0644\u0629",
  "reviewCardProgress": "\u0628\u0637\u0627\u0642\u0629 \u0645\u0631\u0627\u062C\u0639\u0629",
  "reviewNext": "\u0627\u0644\u062F\u0631\u0633 \u0627\u0644\u062A\u0627\u0644\u064A",
  "reviewMastered": "\u0623\u064F\u062A\u0642\u0650\u0646\u064E",
  "reviewMasteredCount": "\u062A\u0645\u062A \u0645\u0631\u0627\u062C\u0639\u062A\u0647\u0627 \u0641\u064A \u0627\u0644\u062C\u0644\u0633\u0629",
  "noCompletedForReview": "\u0623\u0643\u0645\u0644 \u062F\u0631\u0633\u0627\u064B \u0648\u0627\u062D\u062F\u0627\u064B \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0644\u0641\u062A\u062D \u062C\u0644\u0633\u0629 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A\u0629.",
  "showSolutionBtn": "\u0643\u0634\u0641 \u0627\u0644\u062D\u0644",
  "kidVisualSpeak": "\u0642\u064F\u0644",
  "kidVisualDoorOpen": "\u0628\u0627\u0628 \u0645\u0641\u062A\u0648\u062D",
  "kidVisualDoorClosed": "\u0637\u0631\u064A\u0642 \u0628\u062F\u064A\u0644",
  "kidVisualLoop": "\u0643\u0631\u0651\u0631",
  "practicePronunciationLabel": "\u062A\u062F\u0631\u064A\u0628 \u0627\u0644\u0646\u0637\u0642",
  "listenSlow": "\u0628\u0637\u064A\u0621 (0.65\xD7)",
  "listenNormal": "\u0639\u0627\u062F\u064A",
  "quizPredictOutputPrompt": "\u0645\u0627\u0630\u0627 \u0633\u064A\u0637\u0628\u0639 \u0647\u0630\u0627 \u0627\u0644\u062F\u0631\u0633 \u0627\u0644\u0645\u0643\u062A\u0645\u0644 \u0639\u0646\u062F \u062A\u0634\u063A\u064A\u0644\u0647\u061F",
  "quizFillKeywordPrompt": "\u0627\u062E\u062A\u0631 \u0627\u0644\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0641\u062A\u0627\u062D\u064A\u0629 \u0627\u0644\u0646\u0627\u0642\u0635\u0629 \u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u0643\u0648\u062F:",
  "quizScoreLabel": "\u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631",
  "quizRestartBtn": "\u062C\u0648\u0644\u0629 \u0627\u062E\u062A\u0628\u0627\u0631 \u062C\u062F\u064A\u062F\u0629",
  "packReadyCountLabel": "\u062C\u0627\u0647\u0632 \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u062D\u0632\u0645\u0629",
  "quizCodeChallengePrompt": "\u0639\u062F\u0651\u0644 \u0623\u0648 \u0623\u0643\u0645\u0644 \u0627\u0644\u062A\u062D\u062F\u064A \u0628\u0627\u0644\u0644\u0647\u062C\u0629 \u0644\u0625\u062A\u0642\u0627\u0646 \u0627\u0644\u062F\u0631\u0633:",
  "achievementsShelfTitle": "\u0625\u0646\u062C\u0627\u0632\u0627\u062A \u0627\u0644\u062A\u0639\u0644\u0651\u0645",
  "achievementsEarnedSummary": "\u0645\u0641\u062A\u0648\u062D\u0629",
  "achievementUnlockedBannerTitle": "\u062A\u0645 \u0641\u062A\u062D \u0625\u0646\u062C\u0627\u0632 \u062A\u0639\u0644\u064A\u0645\u064A \u062C\u062F\u064A\u062F",
  "achievementDismissBtn": "\u0625\u062E\u0641\u0627\u0621",
  "achievementLockedLabel": "\u0645\u0642\u0641\u0644\u0629",
  "achievementEarnedOnLabel": "\u0645\u0643\u062A\u0633\u0628\u0629 \u0641\u064A",
  "achFirstSparkTitle": "\u0627\u0644\u0634\u0631\u0627\u0631\u0629 \u0627\u0644\u0623\u0648\u0644\u0649",
  "achFirstSparkDesc": "\u0623\u062A\u0645\u0645 \u062F\u0631\u0633\u0643 \u0627\u0644\u0623\u0648\u0644 \u0628\u0646\u062C\u0627\u062D \u0641\u064A \u0623\u064A \u0644\u0647\u062C\u0629 \u0645\u063A\u0627\u0631\u0628\u064A\u0629.",
  "achDialectExplorerTitle": "\u0645\u0633\u062A\u0643\u0634\u0641 \u0627\u0644\u0644\u0647\u062C\u0627\u062A",
  "achDialectExplorerDesc": "\u0623\u062A\u0645\u0645 \u062F\u0631\u0633\u0627\u064B \u0648\u0627\u062D\u062F\u0627\u064B \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0641\u064A \u0644\u0647\u062C\u062A\u064A\u0646 \u0645\u062E\u062A\u0644\u0641\u062A\u064A\u0646 \u0623\u0648 \u0623\u0643\u062B\u0631.",
  "achBranchNavigatorTitle": "\u0645\u0644\u0627\u062D \u0627\u0644\u0634\u0631\u0648\u0637",
  "achBranchNavigatorDesc": "\u0623\u0643\u0645\u0644 \u062F\u0631\u0633\u064A\u0646 \u0641\u064A \u0627\u0644\u062A\u0641\u0631\u0639 \u0627\u0644\u0634\u0631\u0637\u064A \u0648\u0627\u0644\u0645\u0646\u0637\u0642 (\u0625\u0630\u0627 / \u0648\u0625\u0644\u0627).",
  "achSyntaxMasterTitle": "\u0623\u0633\u062A\u0627\u0630 \u0627\u0644\u0635\u064A\u0627\u063A\u0629 \u0627\u0644\u0628\u0631\u0645\u062C\u064A\u0629",
  "achSyntaxMasterDesc": "\u0623\u062A\u0642\u0646 \u062F\u0631\u0648\u0633 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u062A\u0642\u062F\u0645 \u0627\u0644\u062B\u0644\u0627\u062B\u0629 \u0644\u0644\u0634\u0631\u0648\u0637 \u0627\u0644\u0645\u062A\u062F\u0627\u062E\u0644\u0629 \u0648\u0627\u0644\u062D\u0644\u0642\u0627\u062A.",
  "achReviewChampionTitle": "\u0628\u0637\u0644 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629",
  "achReviewChampionDesc": "\u0627\u062C\u062A\u0632 3 \u062A\u062D\u062F\u064A\u0627\u062A \u0645\u0631\u0627\u062C\u0639\u0629 \u0628\u0646\u062C\u0627\u062D \u0639\u0628\u0631 \u0645\u062D\u0631\u0643 \u0628\u064A\u0636\u0627\u0621.",
  "achMaghrebPolyglotTitle": "\u0645\u062A\u0639\u062F\u062F \u0627\u0644\u0644\u0647\u062C\u0627\u062A \u0627\u0644\u0645\u063A\u0627\u0631\u0628\u064A\u0629",
  "achMaghrebPolyglotDesc": "\u0623\u0643\u0645\u0644 10 \u062F\u0631\u0648\u0633 \u0645\u062D\u0642\u0642\u0629 \u0639\u0628\u0631 \u0645\u0644\u0641\u0643 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A \u0627\u0644\u0645\u0648\u062D\u062F.",
  "showBadgesBtn": "\u0639\u0631\u0636 \u0627\u0644\u0623\u0648\u0633\u0645\u0629",
  "hideBadgesBtn": "\u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0623\u0648\u0633\u0645\u0629",
  "showMapBtn": "\u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0645\u0633\u0627\u0631",
  "openLessonBtn": "\u0641\u062A\u062D",
  "closeLessonBtn": "\u0625\u063A\u0644\u0627\u0642",
  "hideDetailsBtn": "\u0625\u062E\u0641\u0627\u0621",
  "lessonNextBtn": "\u0627\u0644\u062F\u0631\u0633 \u0627\u0644\u062A\u0627\u0644\u064A",
  "speakSnippetBtn": "\u0646\u0637\u0642 \u0627\u0644\u0645\u0642\u0637\u0639",
  "stopSpeakingBtn": "\u0625\u064A\u0642\u0627\u0641 \u0627\u0644\u0646\u0637\u0642",
  "kidTapTileHint": "\u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0628\u0637\u0627\u0642\u0629 \u0644\u062A\u062E\u062A\u0627\u0631 \u0645\u0627\u0630\u0627 \u064A\u0642\u0648\u0644 \u0627\u0644\u0631\u0648\u0628\u0648\u062A",
  "kidVisualCounter": "\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0646\u0642\u0627\u0637",
  "kidEndStepWord": "\u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u062E\u0637\u0648\u0629",
  "kidVarWord": "\u0635\u0646\u062F\u0648\u0642",
  "kidLessonVisualArrangeHint": "\u0631\u062A\u0628 \u0644\u0628\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u0637\u0642 \u0627\u0644\u0628\u0635\u0631\u064A\u0629 \u0644\u0628\u0646\u0627\u0621 \u0627\u0644\u062E\u0648\u0627\u0631\u0632\u0645\u064A\u0629 \u0627\u0644\u0630\u0647\u0646\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629:",
  "kidVisualMove": "\u062A\u062D\u0631\u0651\u0643",
  "kidVisualJump": "\u0627\u0642\u0641\u0632",
  "kidVisualTurn": "\u0627\u0633\u062A\u062F\u0631",
  "kidQuizPickLogicPrompt": "\u0627\u062E\u062A\u0631 \u062A\u0633\u0644\u0633\u0644 \u0627\u0644\u0645\u0646\u0637\u0642 \u0627\u0644\u0635\u062D\u064A\u062D \u0628\u0627\u0644\u0644\u0628\u0646\u0627\u062A",
  "kidLessonEasy": "\u062A\u0645\u0647\u064A\u062F\u064A \xB7 4\u20135",
  "kidLessonMedium": "\u0627\u0633\u062A\u0643\u0634\u0627\u0641\u064A \xB7 6\u20137",
  "kidLessonChallenge": "\u062A\u062D\u062F\u064A \xB7 8\u20139",
  "kidLessonFilterAge": "\u0627\u0644\u0645\u0646\u0627\u0633\u0628 \u0644\u0639\u0645\u0631\u064A",
  "kidLessonFilterAll": "\u0643\u0644 \u0627\u0644\u0645\u0633\u062A\u0648\u064A\u0627\u062A",
  "consoleInputPromptLabel": "\u0625\u062F\u062E\u0627\u0644:",
  "consoleInputPlaceholder": "\u0627\u0643\u062A\u0628 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0648\u0627\u0636\u063A\u0637 \u0625\u0631\u0633\u0627\u0644...",
  "consoleInputSubmitBtn": "\u0625\u0631\u0633\u0627\u0644",
  "consoleInputResetBtn": "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0625\u062F\u062E\u0627\u0644",
  "kidVisualAsk": "\u0627\u0633\u0623\u0644",
  "kidVisualList": "\u0633\u0644\u0629",
  "kidVisualRecipe": "\u0648\u0635\u0641\u0629",
  "execWarnTitle": "\u062A\u0646\u0628\u064A\u0647 \u0648\u0642\u0627\u0626\u064A \u0644\u0644\u0645\u0648\u0627\u0631\u062F (+75%)",
  "execWarnSteps": "\u0627\u0642\u062A\u0631\u0628\u062A \u062E\u0637\u0648\u0627\u062A \u0627\u0644\u062A\u0646\u0641\u064A\u0630 \u0645\u0646 \u0627\u0644\u062D\u062F \u0627\u0644\u0622\u0645\u0646 (75%+) \u2014 \u0631\u0627\u062C\u0639 \u0634\u0631\u0648\u0637 \u062A\u0648\u0642\u0641 \u0627\u0644\u062D\u0644\u0642\u0627\u062A.",
  "execWarnMemory": "\u0627\u0642\u062A\u0631\u0628 \u0627\u0633\u062A\u0647\u0644\u0627\u0643 \u0630\u0627\u0643\u0631\u0629 \u0628\u064A\u0626\u0629 \u0627\u0644\u062A\u0646\u0641\u064A\u0630 \u0645\u0646 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0627\u0644\u0622\u0645\u0646 (75%+).",
  "execWarnArray": "\u0627\u0642\u062A\u0631\u0628 \u0637\u0648\u0644 \u0627\u0644\u0645\u0635\u0641\u0648\u0641\u0629 \u0645\u0646 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0628\u0647 (75%+).",
  "execWarnRecursion": "\u0627\u0642\u062A\u0631\u0628 \u0639\u0645\u0642 \u0627\u0633\u062A\u062F\u0639\u0627\u0621 \u0627\u0644\u062F\u0648\u0627\u0644 \u0627\u0644\u0645\u062A\u062F\u0627\u062E\u0644\u0629 \u0645\u0646 \u062D\u062F \u0627\u0644\u062D\u0645\u0627\u064A\u0629 (75%+).",
  "execWarnOutput": "\u0627\u0642\u062A\u0631\u0628 \u0639\u062F\u062F \u0623\u0633\u0637\u0631 \u0627\u0644\u0645\u062E\u0631\u062C\u0627\u062A \u0641\u064A \u0627\u0644\u0637\u0631\u0641\u064A\u0629 \u0645\u0646 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D (75%+)."
};
var LESSON_FR = {
  "loadSample": "Exemple",
  "modeKid": "Mode Enfant",
  "modeBeginner": "D\xE9butant",
  "modePro": "Pro",
  "lessonsHeading": "Parcours Progressif (30 Le\xE7ons)",
  "lessonsSubheading": "Chaque le\xE7on s\u2019adapte automatiquement au dialecte actif et d\xE9bloque les concepts.",
  "completedLabel": "Termin\xE9e",
  "lockedLabel": "Verrouill\xE9e",
  "plannedLabel": "Bient\xF4t",
  "requiresConceptsLabel": "Requiert les concepts :",
  "openInPlayground": "Ouvrir dans l\u2019atelier",
  "verifyLesson": "Valider la le\xE7on",
  "lessonPassed": "Bravo ! Le\xE7on valid\xE9e avec succ\xE8s.",
  "lessonCheckFailed": "V\xE9rifiez les crit\xE8res de l\u2019objectif et r\xE9essayez.",
  "arrangeHint": "Cliquez sur les cartes dans l\u2019ordre pour construire un programme valide :",
  "arrangeSelected": "Votre s\xE9quence :",
  "arrangeReset": "R\xE9initialiser",
  "hintBtn": "Indice",
  "hintsUsed": "Indices affich\xE9s",
  "ruleFail_prints_text": "Your program must print the requested text.",
  "ruleFail_prints_number": "Your program must print the exact target number.",
  "ruleFail_prints_bool": "Your program must print the requested boolean value.",
  "ruleFail_prints_in_order": "Print both values in the exact order shown in the goal.",
  "ruleFail_min_prints": "Add more print statements to meet the lesson goal.",
  "ruleFail_has_node": "Use a conditional or loop block for this lesson.",
  "ruleFail_min_nodes": "Include multiple conditional blocks as requested.",
  "ruleFail_has_else": "Add an else branch to handle the alternative path.",
  "ruleFail_nested_if": "Put an if condition inside another if block.",
  "ruleFail_test_token": "Use the specified boolean value inside the condition test.",
  "ruleFail_test_compares": "Use a comparison operator (like > or ==) inside the condition.",
  "ruleFail_min_functions": "Define at least one reusable dialect function for this lesson.",
  "ruleFail_has_return": "Include a return statement inside your function.",
  "ruleFail_uses_input": "Read interactive input from the user using your dialect input word.",
  "ruleFail_uses_array": "Create or inspect a list using [ ... ], indexing, or list helpers.",
  "lsKidTalkTitle": "01. Make the Robot Speak",
  "lsKidTalkGoal": "Snap the Speak block first, then choose the greeting.",
  "lsKidTalkExp1": "Mental algorithms begin with a clear action in the right order.",
  "lsKidTalkExp2": "First pick the Say block, then snap the greeting word after it.",
  "lsKidTalkHint1": "Tap the Say action card first, then tap the salam greeting card.",
  "lsKidTwiceTitle": "02. Two Steps in Order",
  "lsKidTwiceGoal": "Sequence the steps so salam plays before ahlan.",
  "lsKidTwiceExp1": "An algorithm runs commands one step at a time from first to last.",
  "lsKidTwiceExp2": "Keep the step separator between your two actions.",
  "lsKidTwiceHint1": "Start with Say salam, then the next-step divider, then Say ahlan.",
  "lsKidDoorTitle": "03. The Open Logic Door",
  "lsKidDoorGoal": "Build an If-Open path so the robot says salam.",
  "lsKidDoorExp1": "A decision checks whether a magic door is open or closed.",
  "lsKidDoorExp2": "Because the door is open, the action inside the path runs.",
  "lsKidDoorHint1": "Start with the If-Open gate, place Say salam inside, then close the step.",
  "lsKidSunRainTitle": "04. Sun or Rain Path",
  "lsKidSunRainGoal": "Use a closed first gate and an Else path so rain appears.",
  "lsKidSunRainExp1": "When the first gate is closed, logic moves straight to the Else path.",
  "lsKidSunRainExp2": "Else guarantees a smart backup plan always runs.",
  "lsKidSunRainHint1": "Put the closed first gate first, then the Else path, then the rain step.",
  "lsKidAskTitle": "05. Ask & Answer",
  "lsKidAskGoal": "Arrange the Ask block to read a name and greet it.",
  "lsKidAskExp1": "Programs can ask the learner a question and remember the reply.",
  "lsKidAskExp2": "Use input inside print so your greeting uses the answer.",
  "lsKidAskHint1": "Place the Ask card before the greeting step.",
  "lsKidBasketTitle": "06. Magic Treat Basket",
  "lsKidBasketGoal": "Create a basket list of treats and count how many items it holds.",
  "lsKidBasketExp1": "Lists store multiple treats together inside square brackets [ ... ].",
  "lsKidBasketExp2": "Your length command counts every treat inside the basket.",
  "lsKidBasketHint1": "Create the basket variable first, then print its length.",
  "lsBgPrintTitle": "01. Print Hello",
  "lsBgPrintGoal": 'Write a statement that prints "salam".',
  "lsBgPrintExp1": 'Strings of text are wrapped in double quotes like "salam".',
  "lsBgPrintExp2": "Pass the text inside parentheses right after your dialect print keyword.",
  "lsBgPrintHint1": "Make sure the text inside quotes spells salam exactly.",
  "lsBgPrintHint2": "Do not forget closing quotes and closing parentheses.",
  "lsBgTwoTitle": "02. Sequential Lines",
  "lsBgTwoGoal": 'Print "salam" on line 1 and "ahlan" on line 2.',
  "lsBgTwoExp1": "Each statement on its own line executes strictly in sequence.",
  "lsBgTwoExp2": "This forms the backbone of every algorithm.",
  "lsBgTwoHint1": 'Put "salam" first, then "ahlan" on the next line.',
  "lsBgNumberTitle": "03. Printing Numbers",
  "lsBgNumberGoal": "Print the number 7 without quotes.",
  "lsBgNumberExp1": "Numbers are values directly understood for math\u2014they do not use quotes.",
  "lsBgNumberExp2": "Try passing 7 straight inside the print call.",
  "lsBgNumberHint1": "Write 7 inside the parentheses with no double quotes.",
  "lsBgBoolTitle": "04. True or False",
  "lsBgBoolGoal": "Print the boolean value true using your dialect keyword.",
  "lsBgBoolExp1": "Booleans represent logical truth: true or false.",
  "lsBgBoolExp2": "Your dialect has dedicated words for both true and false.",
  "lsBgBoolHint1": "Replace text with your dialect word for true inside print().",
  "lsBgVarsTitle": "05. Variables & Assignment",
  "lsBgVarsGoal": "Store a greeting in a variable and print it.",
  "lsBgVarsExp1": "Variables give names to values so you can reuse or update them later.",
  "lsBgVarsExp2": "Use your dialect let keyword followed by name = value.",
  "lsBgVarsHint1": "Declare the variable first, then pass its name into print().",
  "lsBgInputTitle": "06. Interactive Input Greeting",
  "lsBgInputGoal": "Ask the user for their name with input() and print it.",
  "lsBgInputExp1": "The input command pauses execution and asks the user for a reply.",
  "lsBgInputExp2": "Store the reply in a variable, then print a greeting with it.",
  "lsBgInputHint1": 'Assign your input("Name?") call to a variable, then print("Salam", variable).',
  "lsBgIfTitle": "07. First Decision (If)",
  "lsBgIfGoal": 'Write an if (true) block that prints "salam".',
  "lsBgIfExp1": "Code inside curly braces { ... } forms a conditional block.",
  "lsBgIfExp2": "When the condition inside ( ) is true, the block executes.",
  "lsBgIfHint1": "Check that both { and } braces match properly.",
  "lsBgElseTitle": "08. Two Paths (If / Else)",
  "lsBgElseGoal": 'Write an if (false) branch and an else branch that prints "no".',
  "lsBgElseExp1": "Combine if with else to cover both outcomes of a decision.",
  "lsBgElseExp2": "Use false in the test so execution flows into the else branch.",
  "lsBgElseHint1": 'Ensure the else branch prints "no".',
  "lsBgCompareTitle": "09. Comparing Numbers",
  "lsBgCompareGoal": 'Use a comparison (such as 10 > 3) inside an if condition to print "salam".',
  "lsBgCompareExp1": "Operators like >, <, == compare two values and return true or false.",
  "lsBgCompareExp2": "This lets programs make smart data-driven choices.",
  "lsBgCompareHint1": "Write (10 > 3) inside the if parentheses.",
  "lsBgWhileTitle": "10. Counting Loops (While)",
  "lsBgWhileGoal": "Count from 0 up to 2 using a while loop.",
  "lsBgWhileExp1": "A counter variable grows on each loop step until the condition becomes false.",
  "lsBgWhileExp2": "Always update the counter inside the loop body so it finishes cleanly.",
  "lsBgWhileHint1": "Declare i = 0, check while (i < 3), print i, and increment i = i + 1.",
  "lsBgForTitle": "11. Range Loops (For)",
  "lsBgForGoal": "Loop over the range 1..3 using your dialect for keyword.",
  "lsBgForExp1": "Range loops let you step from start to end without a manual counter.",
  "lsBgForExp2": "Write for (i : 1..3) { ... } to run cleanly across 1, 2, and 3.",
  "lsBgForHint1": "Use i : 1..3 inside your for loop header.",
  "lsBgListTitle": "12. Lists & Basket Length",
  "lsBgListGoal": "Create a list, push a new item, and print its length.",
  "lsBgListExp1": "Arrays hold an ordered sequence inside [ ... ] brackets.",
  "lsBgListExp2": "Use push to add elements and len to check the total size.",
  "lsBgListHint1": "Declare a list variable, call push(list, 30), and print len(list).",
  "lsPrTwoIfsTitle": "01. Chained Independent Checks",
  "lsPrTwoIfsGoal": 'Write two if statements (one true, one false) printing "salam" and "ahlan" branches.',
  "lsPrTwoIfsExp1": "Sequential independent if blocks evaluate separately.",
  "lsPrTwoIfsExp2": "Practice keeping multiple control structures clean and readable.",
  "lsPrTwoIfsHint1": 'Create one if with true ("salam") and another if with false ("ahlan").',
  "lsPrNestedTitle": "02. Nested Decision Logic",
  "lsPrNestedGoal": 'Nest an if/else inside an outer if block so the inner else prints "b".',
  "lsPrNestedExp1": "Conditions can live inside other conditions to model layered logic.",
  "lsPrNestedExp2": "Keep indentation clear so matching braces stay easy to verify.",
  "lsPrNestedHint1": 'Put if (false) { print("a") } else { print("b") } inside an outer if (true).',
  "lsPrWhileTitle": "03. Controlled Loop Guard",
  "lsPrWhileGoal": 'Build a while (false) block containing print("salam") to practice safe loop structure.',
  "lsPrWhileExp1": "A while loop checks its condition before entering the body.",
  "lsPrWhileExp2": "Dialects that provide a while keyword unlock this challenge automatically.",
  "lsPrWhileHint1": "Install the Full Dialect Pack if your dialect does not yet include while.",
  "lsPrFuncTitle": "04. Reusable Functions",
  "lsPrFuncGoal": "Define a dialect function with a parameter and call it twice.",
  "lsPrFuncExp1": "Functions package reusable steps under a clean name and accept parameters.",
  "lsPrFuncExp2": 'Calling greet("Maghreb") runs the function body with that argument.',
  "lsPrFuncHint1": "Declare the function with fn, then invoke it with parentheses.",
  "lsPrReturnTitle": "05. Functions with Return",
  "lsPrReturnGoal": "Write a function that returns a * b and print the result of calling it.",
  "lsPrReturnExp1": "The return keyword sends a computed value back to the caller.",
  "lsPrReturnExp2": "Functions with return can be nested directly inside expressions and print().",
  "lsPrReturnHint1": "End your function body with return a * b and pass the call to print().",
  "lsPrArraysTitle": "06. Collections & Arrays",
  "lsPrArraysGoal": "Create a list, push an element, read by index, and print its length.",
  "lsPrArraysExp1": "Square brackets [0] access the first element cleanly by index.",
  "lsPrArraysExp2": "You can append dynamically using your dialect push helper.",
  "lsPrArraysHint1": "Combine list creation, push(), indexing, and len() in one script.",
  "lsPrForEachTitle": "07. Iterating Over Lists",
  "lsPrForEachGoal": "Use a for-each loop to print every item inside an array.",
  "lsPrForEachExp1": "Use for (item : myList) { ... } to visit each list item in order.",
  "lsPrForEachExp2": "For-each iteration avoids off-by-one index bugs automatically.",
  "lsPrForEachHint1": "Iterate your list variable inside a for (...) block and print the item.",
  "lsPrForSumTitle": "08. Range Accumulator",
  "lsPrForSumGoal": "Sum numbers from 1 to 4 inside a for range loop and print the total.",
  "lsPrForSumExp1": "Accumulators track running totals in a variable declared before the loop.",
  "lsPrForSumExp2": "Add the loop variable on every pass and print once after the loop.",
  "lsPrForSumHint1": "Start total = 0, then update total = total + i inside for (i : 1..4).",
  "lsPrFnListTitle": "09. Functions & Lists Together",
  "lsPrFnListGoal": "Write a function returning the length of a list passed to it.",
  "lsPrFnListExp1": "Arrays can be passed as arguments just like numbers or strings.",
  "lsPrFnListExp2": "Calling len(arr) inside your function returns the live count.",
  "lsPrFnListHint1": "Pass your array variable into countBag(bag) and print the returned number.",
  "lsPrInputGuardTitle": "10. Input Validation Guard",
  "lsPrInputGuardGoal": "Read input, check a numeric threshold with if/else, and print feedback.",
  "lsPrInputGuardExp1": "Combining input() with if/else protects programs against unexpected values.",
  "lsPrInputGuardExp2": "Handle both passing and fallback outcomes cleanly.",
  "lsPrInputGuardHint1": 'Read score = input("Score?"), then branch with >= 10 and else.',
  "lsPrFnComposeTitle": "11. Composing Functions",
  "lsPrFnComposeGoal": "Define two functions where the second composes calls to the first.",
  "lsPrFnComposeExp1": "Breaking big problems into helper functions keeps algorithms modular.",
  "lsPrFnComposeExp2": "Track helper calls inside the Call Stack view in Developer Tools.",
  "lsPrFnComposeHint1": "Define square(n) and sumSq(x, y) returning square(x) + square(y).",
  "lsPrErrorsTitle": "12. Defensive Bounds Check",
  "lsPrErrorsGoal": "Check list length with len() before reading an element by index.",
  "lsPrErrorsExp1": "Checking bounds prevents out-of-range index errors at runtime.",
  "lsPrErrorsExp2": "Provide a safe else message when the collection is too short.",
  "lsPrErrorsHint1": "Check if (len(items) > 1) before reading items[1].",
  "reviewAgain": "\xC0 revoir",
  "cardLabel": "Carte",
  "closeBtn": "Fermer",
  "lessonRoadmapTitle": "Carte de progression (30 Le\xE7ons)",
  "lessonRoadmapSummary": "Cliquez sur une \xE9tape pour ouvrir directement la le\xE7on.",
  "lessonStageReady": "Pr\xEAt",
  "lessonStageCompleted": "Fait",
  "lessonStageLocked": "Verrouill\xE9",
  "lessonStagePlanned": "Feuille de route",
  "listenLessonAudio": "\xC9couter le clip",
  "startReviewSession": "Session de r\xE9vision",
  "stopReviewSession": "Quitter r\xE9vision",
  "reviewSessionTitle": "R\xE9vision des le\xE7ons termin\xE9es",
  "reviewCardProgress": "Carte",
  "reviewNext": "Suivante",
  "reviewMastered": "Ma\xEEtris\xE9e",
  "reviewMasteredCount": "R\xE9vis\xE9es dans la session",
  "noCompletedForReview": "Terminez au moins une le\xE7on pour lancer votre session de r\xE9vision.",
  "showSolutionBtn": "Afficher la solution",
  "kidVisualSpeak": "Dire",
  "kidVisualDoorOpen": "Ouvrir porte",
  "kidVisualDoorClosed": "Autre chemin",
  "kidVisualLoop": "R\xE9p\xE9ter",
  "practicePronunciationLabel": "Pratique de prononciation",
  "listenSlow": "Lent (0.65\xD7)",
  "listenNormal": "Normal",
  "quizPredictOutputPrompt": "Que va afficher cette le\xE7on termin\xE9e ?",
  "quizFillKeywordPrompt": "Choisissez le mot-cl\xE9 manquant :",
  "quizScoreLabel": "Score du quiz",
  "quizRestartBtn": "Nouveau quiz",
  "packReadyCountLabel": "pr\xEAtes dans le pack",
  "quizCodeChallengePrompt": "Compl\xE8te ce d\xE9fi dialectal pour valider ta le\xE7on :",
  "achievementsShelfTitle": "Succ\xE8s d\u2019Apprentissage",
  "achievementsEarnedSummary": "d\xE9bloqu\xE9s",
  "achievementUnlockedBannerTitle": "Nouveau succ\xE8s d\xE9bloqu\xE9",
  "achievementDismissBtn": "Masquer",
  "achievementLockedLabel": "Verrouill\xE9",
  "achievementEarnedOnLabel": "D\xE9bloqu\xE9 le",
  "achFirstSparkTitle": "Premi\xE8re \xC9tincelle",
  "achFirstSparkDesc": "Valide ta premi\xE8re le\xE7on guid\xE9e dans n\u2019importe quel dialecte.",
  "achDialectExplorerTitle": "Explorateur de Dialectes",
  "achDialectExplorerDesc": "Compl\xE8te au moins 1 le\xE7on dans 2 dialectes maghr\xE9bins distincts.",
  "achBranchNavigatorTitle": "Navigateur Logique",
  "achBranchNavigatorDesc": "Compl\xE8te 2 le\xE7ons de conditions (si / sinon / comparaison).",
  "achSyntaxMasterTitle": "Ma\xEEtre de la Syntaxe",
  "achSyntaxMasterDesc": "Ma\xEEtrise les 3 le\xE7ons Pro sur les conditions imbriqu\xE9es et boucles.",
  "achReviewChampionTitle": "Champion de R\xE9vision",
  "achReviewChampionDesc": "R\xE9ussis 3 d\xE9fis de r\xE9vision v\xE9rifi\xE9s par BaydaEngine.",
  "achMaghrebPolyglotTitle": "Polyglotte du Maghreb",
  "achMaghrebPolyglotDesc": "Compl\xE8te 10 le\xE7ons v\xE9rifi\xE9es sur ton profil unifi\xE9.",
  "showBadgesBtn": "Voir badges",
  "hideBadgesBtn": "Masquer badges",
  "showMapBtn": "Parcours",
  "openLessonBtn": "Ouvrir",
  "closeLessonBtn": "Fermer",
  "hideDetailsBtn": "Masquer",
  "lessonNextBtn": "Le\xE7on suivante",
  "speakSnippetBtn": "Lire l\u2019extrait",
  "stopSpeakingBtn": "Arr\xEAter",
  "kidTapTileHint": "Touche une vignette pour choisir ce que dit le robot",
  "kidVisualCounter": "Compteur",
  "kidEndStepWord": "Fin du bloc",
  "kidVarWord": "Bo\xEEte",
  "kidLessonVisualArrangeHint": "Assemble les blocs visuels dans l\u2019ordre pour cr\xE9er l\u2019algorithme :",
  "kidVisualMove": "Avancer",
  "kidVisualJump": "Sauter",
  "kidVisualTurn": "Tourner",
  "kidQuizPickLogicPrompt": "Choisis la bonne suite logique en blocs",
  "kidLessonEasy": "D\xE9butant \xB7 4\u20135",
  "kidLessonMedium": "Explorateur \xB7 6\u20137",
  "kidLessonChallenge": "D\xE9fi \xB7 8\u20139",
  "kidLessonFilterAge": "Pour mon \xE2ge",
  "kidLessonFilterAll": "Tous niveaux",
  "consoleInputPromptLabel": "Entr\xE9e :",
  "consoleInputPlaceholder": "Tapez la r\xE9ponse puis Entr\xE9e...",
  "consoleInputSubmitBtn": "Envoyer",
  "consoleInputResetBtn": "R\xE9initialiser",
  "kidVisualAsk": "Demander",
  "kidVisualList": "Panier",
  "kidVisualRecipe": "Recette",
  "execWarnTitle": "Alerte ressources (75%+)",
  "execWarnSteps": "Les \xE9tapes d\u2019ex\xE9cution ont d\xE9pass\xE9 75 % de la limite \u2014 v\xE9rifiez vos boucles.",
  "execWarnMemory": "L\u2019utilisation m\xE9moire du bac \xE0 sable a d\xE9pass\xE9 75 % du plafond.",
  "execWarnArray": "La taille du tableau a d\xE9pass\xE9 75 % de la limite autoris\xE9e.",
  "execWarnRecursion": "La profondeur des appels r\xE9cursifs a d\xE9pass\xE9 75 % de la limite.",
  "execWarnOutput": "Le nombre de lignes affich\xE9es a d\xE9pass\xE9 75 % de la limite."
};
var LESSON_ES = {
  "loadSample": "Ejemplo",
  "modeKid": "Modo Infantil",
  "modeBeginner": "Principiante",
  "modePro": "Profesional",
  "lessonsHeading": "Curr\xEDculo Progresivo (30 Lecciones)",
  "lessonsSubheading": "Cada lecci\xF3n se adapta autom\xE1ticamente al dialecto activo.",
  "completedLabel": "Completada",
  "lockedLabel": "Bloqueada",
  "plannedLabel": "Pr\xF3ximamente",
  "requiresConceptsLabel": "Requiere conceptos:",
  "openInPlayground": "Abrir en Taller",
  "verifyLesson": "Verificar y Completar",
  "lessonPassed": "\xA1Excelente! Lecci\xF3n completada.",
  "lessonCheckFailed": "Revisa las reglas del objetivo e int\xE9ntalo de nuevo.",
  "arrangeHint": "Haz clic en las tarjetas en orden para construir un programa:",
  "arrangeSelected": "Tu secuencia:",
  "arrangeReset": "Reiniciar orden",
  "hintBtn": "Mostrar Pista",
  "hintsUsed": "Pistas mostradas",
  "ruleFail_prints_text": "Your program must print the requested text.",
  "ruleFail_prints_number": "Your program must print the exact target number.",
  "ruleFail_prints_bool": "Your program must print the requested boolean value.",
  "ruleFail_prints_in_order": "Print both values in the exact order shown in the goal.",
  "ruleFail_min_prints": "Add more print statements to meet the lesson goal.",
  "ruleFail_has_node": "Use a conditional or loop block for this lesson.",
  "ruleFail_min_nodes": "Include multiple conditional blocks as requested.",
  "ruleFail_has_else": "Add an else branch to handle the alternative path.",
  "ruleFail_nested_if": "Put an if condition inside another if block.",
  "ruleFail_test_token": "Use the specified boolean value inside the condition test.",
  "ruleFail_test_compares": "Use a comparison operator (like > or ==) inside the condition.",
  "ruleFail_min_functions": "Define at least one reusable dialect function for this lesson.",
  "ruleFail_has_return": "Include a return statement inside your function.",
  "ruleFail_uses_input": "Read interactive input from the user using your dialect input word.",
  "ruleFail_uses_array": "Create or inspect a list using [ ... ], indexing, or list helpers.",
  "lsKidTalkTitle": "01. Haz Hablar a la Computadora",
  "lsKidTalkGoal": 'Ordena los bloques para imprimir "salam".',
  "lsKidTalkExp1": "Mental algorithms begin with a clear action in the right order.",
  "lsKidTalkExp2": "First pick the Say block, then snap the greeting word after it.",
  "lsKidTalkHint1": "Tap the Say action card first, then tap the salam greeting card.",
  "lsKidTwiceTitle": "02. Dos Mensajes en Orden",
  "lsKidTwiceGoal": 'Ordena los bloques para imprimir "salam" antes de "ahlan".',
  "lsKidTwiceExp1": "An algorithm runs commands one step at a time from first to last.",
  "lsKidTwiceExp2": "Keep the step separator between your two actions.",
  "lsKidTwiceHint1": "Start with Say salam, then the next-step divider, then Say ahlan.",
  "lsKidDoorTitle": "03. La Puerta Abierta",
  "lsKidDoorGoal": 'Construye un bloque if con true para imprimir "salam".',
  "lsKidDoorExp1": "A decision checks whether a magic door is open or closed.",
  "lsKidDoorExp2": "Because the door is open, the action inside the path runs.",
  "lsKidDoorHint1": "Start with the If-Open gate, place Say salam inside, then close the step.",
  "lsKidSunRainTitle": "04. Sol o Lluvia",
  "lsKidSunRainGoal": 'Usa if (false) y else para imprimir "rain".',
  "lsKidSunRainExp1": "When the first gate is closed, logic moves straight to the Else path.",
  "lsKidSunRainExp2": "Else guarantees a smart backup plan always runs.",
  "lsKidSunRainHint1": "Put the closed first gate first, then the Else path, then the rain step.",
  "lsKidAskTitle": "05. Ask & Answer",
  "lsKidAskGoal": "Arrange the Ask block to read a name and greet it.",
  "lsKidAskExp1": "Programs can ask the learner a question and remember the reply.",
  "lsKidAskExp2": "Use input inside print so your greeting uses the answer.",
  "lsKidAskHint1": "Place the Ask card before the greeting step.",
  "lsKidBasketTitle": "06. Magic Treat Basket",
  "lsKidBasketGoal": "Create a basket list of treats and count how many items it holds.",
  "lsKidBasketExp1": "Lists store multiple treats together inside square brackets [ ... ].",
  "lsKidBasketExp2": "Your length command counts every treat inside the basket.",
  "lsKidBasketHint1": "Create the basket variable first, then print its length.",
  "lsBgPrintTitle": "01. Imprimir Hola",
  "lsBgPrintGoal": 'Escribe una l\xEDnea que imprima "salam".',
  "lsBgPrintExp1": 'Strings of text are wrapped in double quotes like "salam".',
  "lsBgPrintExp2": "Pass the text inside parentheses right after your dialect print keyword.",
  "lsBgPrintHint1": "Make sure the text inside quotes spells salam exactly.",
  "lsBgPrintHint2": "Do not forget closing quotes and closing parentheses.",
  "lsBgTwoTitle": "02. L\xEDneas Secuenciales",
  "lsBgTwoGoal": 'Imprime "salam" en la l\xEDnea 1 y "ahlan" en la l\xEDnea 2.',
  "lsBgTwoExp1": "Each statement on its own line executes strictly in sequence.",
  "lsBgTwoExp2": "This forms the backbone of every algorithm.",
  "lsBgTwoHint1": 'Put "salam" first, then "ahlan" on the next line.',
  "lsBgNumberTitle": "03. Imprimir N\xFAmeros",
  "lsBgNumberGoal": "Imprime el n\xFAmero 7 sin comillas.",
  "lsBgNumberExp1": "Numbers are values directly understood for math\u2014they do not use quotes.",
  "lsBgNumberExp2": "Try passing 7 straight inside the print call.",
  "lsBgNumberHint1": "Write 7 inside the parentheses with no double quotes.",
  "lsBgBoolTitle": "04. Verdadero o Falso",
  "lsBgBoolGoal": "Imprime el valor booleano verdadero de tu dialecto.",
  "lsBgBoolExp1": "Booleans represent logical truth: true or false.",
  "lsBgBoolExp2": "Your dialect has dedicated words for both true and false.",
  "lsBgBoolHint1": "Replace text with your dialect word for true inside print().",
  "lsBgVarsTitle": "05. Variables & Assignment",
  "lsBgVarsGoal": "Store a greeting in a variable and print it.",
  "lsBgVarsExp1": "Variables give names to values so you can reuse or update them later.",
  "lsBgVarsExp2": "Use your dialect let keyword followed by name = value.",
  "lsBgVarsHint1": "Declare the variable first, then pass its name into print().",
  "lsBgInputTitle": "06. Interactive Input Greeting",
  "lsBgInputGoal": "Ask the user for their name with input() and print it.",
  "lsBgInputExp1": "The input command pauses execution and asks the user for a reply.",
  "lsBgInputExp2": "Store the reply in a variable, then print a greeting with it.",
  "lsBgInputHint1": 'Assign your input("Name?") call to a variable, then print("Salam", variable).',
  "lsBgIfTitle": "05. Primera Decisi\xF3n (If)",
  "lsBgIfGoal": 'Escribe un bloque if (true) que imprima "salam".',
  "lsBgIfExp1": "Code inside curly braces { ... } forms a conditional block.",
  "lsBgIfExp2": "When the condition inside ( ) is true, the block executes.",
  "lsBgIfHint1": "Check that both { and } braces match properly.",
  "lsBgElseTitle": "06. Dos Caminos (If / Else)",
  "lsBgElseGoal": 'Escribe un bloque if (false) con else que imprima "no".',
  "lsBgElseExp1": "Combine if with else to cover both outcomes of a decision.",
  "lsBgElseExp2": "Use false in the test so execution flows into the else branch.",
  "lsBgElseHint1": 'Ensure the else branch prints "no".',
  "lsBgCompareTitle": "07. Comparar N\xFAmeros",
  "lsBgCompareGoal": "Usa una comparaci\xF3n como (10 > 3) dentro de if.",
  "lsBgCompareExp1": "Operators like >, <, == compare two values and return true or false.",
  "lsBgCompareExp2": "This lets programs make smart data-driven choices.",
  "lsBgCompareHint1": "Write (10 > 3) inside the if parentheses.",
  "lsBgWhileTitle": "10. Counting Loops (While)",
  "lsBgWhileGoal": "Count from 0 up to 2 using a while loop.",
  "lsBgWhileExp1": "A counter variable grows on each loop step until the condition becomes false.",
  "lsBgWhileExp2": "Always update the counter inside the loop body so it finishes cleanly.",
  "lsBgWhileHint1": "Declare i = 0, check while (i < 3), print i, and increment i = i + 1.",
  "lsBgForTitle": "11. Range Loops (For)",
  "lsBgForGoal": "Loop over the range 1..3 using your dialect for keyword.",
  "lsBgForExp1": "Range loops let you step from start to end without a manual counter.",
  "lsBgForExp2": "Write for (i : 1..3) { ... } to run cleanly across 1, 2, and 3.",
  "lsBgForHint1": "Use i : 1..3 inside your for loop header.",
  "lsBgListTitle": "12. Lists & Basket Length",
  "lsBgListGoal": "Create a list, push a new item, and print its length.",
  "lsBgListExp1": "Arrays hold an ordered sequence inside [ ... ] brackets.",
  "lsBgListExp2": "Use push to add elements and len to check the total size.",
  "lsBgListHint1": "Declare a list variable, call push(list, 30), and print len(list).",
  "lsPrTwoIfsTitle": "01. Condiciones Independientes",
  "lsPrTwoIfsGoal": 'Escribe dos if seguidos para "salam" y "ahlan".',
  "lsPrTwoIfsExp1": "Sequential independent if blocks evaluate separately.",
  "lsPrTwoIfsExp2": "Practice keeping multiple control structures clean and readable.",
  "lsPrTwoIfsHint1": 'Create one if with true ("salam") and another if with false ("ahlan").',
  "lsPrNestedTitle": "02. Condiciones Anidadas",
  "lsPrNestedGoal": "Anida un if/else dentro de otro if.",
  "lsPrNestedExp1": "Conditions can live inside other conditions to model layered logic.",
  "lsPrNestedExp2": "Keep indentation clear so matching braces stay easy to verify.",
  "lsPrNestedHint1": 'Put if (false) { print("a") } else { print("b") } inside an outer if (true).',
  "lsPrWhileTitle": "03. Bucle Seguro (While)",
  "lsPrWhileGoal": 'Construye un bucle while (false) con print("salam").',
  "lsPrWhileExp1": "A while loop checks its condition before entering the body.",
  "lsPrWhileExp2": "Dialects that provide a while keyword unlock this challenge automatically.",
  "lsPrWhileHint1": "Install the Full Dialect Pack if your dialect does not yet include while.",
  "lsPrFuncTitle": "04. Reusable Functions",
  "lsPrFuncGoal": "Define a dialect function with a parameter and call it twice.",
  "lsPrFuncExp1": "Functions package reusable steps under a clean name and accept parameters.",
  "lsPrFuncExp2": 'Calling greet("Maghreb") runs the function body with that argument.',
  "lsPrFuncHint1": "Declare the function with fn, then invoke it with parentheses.",
  "lsPrReturnTitle": "05. Functions with Return",
  "lsPrReturnGoal": "Write a function that returns a * b and print the result of calling it.",
  "lsPrReturnExp1": "The return keyword sends a computed value back to the caller.",
  "lsPrReturnExp2": "Functions with return can be nested directly inside expressions and print().",
  "lsPrReturnHint1": "End your function body with return a * b and pass the call to print().",
  "lsPrArraysTitle": "06. Collections & Arrays",
  "lsPrArraysGoal": "Create a list, push an element, read by index, and print its length.",
  "lsPrArraysExp1": "Square brackets [0] access the first element cleanly by index.",
  "lsPrArraysExp2": "You can append dynamically using your dialect push helper.",
  "lsPrArraysHint1": "Combine list creation, push(), indexing, and len() in one script.",
  "lsPrForEachTitle": "07. Iterating Over Lists",
  "lsPrForEachGoal": "Use a for-each loop to print every item inside an array.",
  "lsPrForEachExp1": "Use for (item : myList) { ... } to visit each list item in order.",
  "lsPrForEachExp2": "For-each iteration avoids off-by-one index bugs automatically.",
  "lsPrForEachHint1": "Iterate your list variable inside a for (...) block and print the item.",
  "lsPrForSumTitle": "08. Range Accumulator",
  "lsPrForSumGoal": "Sum numbers from 1 to 4 inside a for range loop and print the total.",
  "lsPrForSumExp1": "Accumulators track running totals in a variable declared before the loop.",
  "lsPrForSumExp2": "Add the loop variable on every pass and print once after the loop.",
  "lsPrForSumHint1": "Start total = 0, then update total = total + i inside for (i : 1..4).",
  "lsPrFnListTitle": "09. Functions & Lists Together",
  "lsPrFnListGoal": "Write a function returning the length of a list passed to it.",
  "lsPrFnListExp1": "Arrays can be passed as arguments just like numbers or strings.",
  "lsPrFnListExp2": "Calling len(arr) inside your function returns the live count.",
  "lsPrFnListHint1": "Pass your array variable into countBag(bag) and print the returned number.",
  "lsPrInputGuardTitle": "10. Input Validation Guard",
  "lsPrInputGuardGoal": "Read input, check a numeric threshold with if/else, and print feedback.",
  "lsPrInputGuardExp1": "Combining input() with if/else protects programs against unexpected values.",
  "lsPrInputGuardExp2": "Handle both passing and fallback outcomes cleanly.",
  "lsPrInputGuardHint1": 'Read score = input("Score?"), then branch with >= 10 and else.',
  "lsPrFnComposeTitle": "11. Composing Functions",
  "lsPrFnComposeGoal": "Define two functions where the second composes calls to the first.",
  "lsPrFnComposeExp1": "Breaking big problems into helper functions keeps algorithms modular.",
  "lsPrFnComposeExp2": "Track helper calls inside the Call Stack view in Developer Tools.",
  "lsPrFnComposeHint1": "Define square(n) and sumSq(x, y) returning square(x) + square(y).",
  "lsPrErrorsTitle": "12. Defensive Bounds Check",
  "lsPrErrorsGoal": "Check list length with len() before reading an element by index.",
  "lsPrErrorsExp1": "Checking bounds prevents out-of-range index errors at runtime.",
  "lsPrErrorsExp2": "Provide a safe else message when the collection is too short.",
  "lsPrErrorsHint1": "Check if (len(items) > 1) before reading items[1].",
  "reviewAgain": "Repetir",
  "cardLabel": "Tarjeta",
  "closeBtn": "Cerrar",
  "lessonRoadmapTitle": "Mapa de Progreso (30 Lecciones)",
  "lessonRoadmapSummary": "Haz clic en cualquier lecci\xF3n para ir directamente a ella.",
  "lessonStageReady": "Lista",
  "lessonStageCompleted": "Hecha",
  "lessonStageLocked": "Bloqueada",
  "lessonStagePlanned": "Pr\xF3xima",
  "listenLessonAudio": "Escuchar clip",
  "startReviewSession": "Sesi\xF3n de Repaso",
  "stopReviewSession": "Salir del Repaso",
  "reviewSessionTitle": "Sesi\xF3n de Repaso de Lecciones Completadas",
  "reviewCardProgress": "Tarjeta",
  "reviewNext": "Siguiente",
  "reviewMastered": "Dominada",
  "reviewMasteredCount": "Repasadas en esta sesi\xF3n",
  "noCompletedForReview": "Completa al menos una lecci\xF3n para iniciar tu Sesi\xF3n de Repaso.",
  "showSolutionBtn": "Mostrar soluci\xF3n",
  "kidVisualSpeak": "Decir",
  "kidVisualDoorOpen": "Puerta Abierta",
  "kidVisualDoorClosed": "Camino Alterno",
  "kidVisualLoop": "Repetir",
  "practicePronunciationLabel": "Pr\xE1ctica de pronunciaci\xF3n",
  "listenSlow": "Lento (0.65\xD7)",
  "listenNormal": "Normal",
  "quizPredictOutputPrompt": "\xBFQu\xE9 imprimir\xE1 esta lecci\xF3n completada?",
  "quizFillKeywordPrompt": "Elige la palabra clave que falta:",
  "quizScoreLabel": "Puntuaci\xF3n",
  "quizRestartBtn": "Nuevo cuestionario",
  "packReadyCountLabel": "listas en este paquete",
  "quizCodeChallengePrompt": "Corrige o escribe el c\xF3digo dialectal para validar tu retenci\xF3n:",
  "achievementsShelfTitle": "Logros de Aprendizaje",
  "achievementsEarnedSummary": "desbloqueados",
  "achievementUnlockedBannerTitle": "Nuevo logro desbloqueado",
  "achievementDismissBtn": "Ocultar",
  "achievementLockedLabel": "Bloqueado",
  "achievementEarnedOnLabel": "Desbloqueado",
  "achFirstSparkTitle": "Primera Chispa",
  "achFirstSparkDesc": "Verifica tu primera lecci\xF3n guiada en cualquier dialecto.",
  "achDialectExplorerTitle": "Explorador de Dialectos",
  "achDialectExplorerDesc": "Completa al menos 1 lecci\xF3n en 2 o m\xE1s dialectos distintos.",
  "achBranchNavigatorTitle": "Navegante Condicional",
  "achBranchNavigatorDesc": "Completa 2 lecciones de l\xF3gica condicional (si / sino).",
  "achSyntaxMasterTitle": "Maestro de Sintaxis",
  "achSyntaxMasterDesc": "Domina las 3 lecciones Pro de condiciones anidadas y bucles.",
  "achReviewChampionTitle": "Campe\xF3n de Repaso",
  "achReviewChampionDesc": "Supera 3 desaf\xEDos de repaso verificados por BaydaEngine.",
  "achMaghrebPolyglotTitle": "Pol\xEDglota Magreb\xED",
  "achMaghrebPolyglotDesc": "Completa 10 lecciones verificadas en tu perfil unificado.",
  "showBadgesBtn": "Ver insignias",
  "hideBadgesBtn": "Ocultar insignias",
  "showMapBtn": "Mapa",
  "openLessonBtn": "Abrir",
  "closeLessonBtn": "Cerrar",
  "hideDetailsBtn": "Ocultar",
  "lessonNextBtn": "Siguiente lecci\xF3n",
  "speakSnippetBtn": "Escuchar fragmento",
  "stopSpeakingBtn": "Detener voz",
  "kidTapTileHint": "Toca una tarjeta para elegir qu\xE9 dice el robot",
  "kidVisualCounter": "Score Box",
  "kidEndStepWord": "End step",
  "kidVarWord": "Counter",
  "kidLessonVisualArrangeHint": "Tap the visual logic blocks in order to build the mental algorithm:",
  "kidVisualMove": "Move",
  "kidVisualJump": "Jump",
  "kidVisualTurn": "Turn",
  "kidQuizPickLogicPrompt": "Pick the matching visual logic sequence",
  "kidLessonEasy": "Starter \xB7 4\u20135",
  "kidLessonMedium": "Explorer \xB7 6\u20137",
  "kidLessonChallenge": "Challenge \xB7 8\u20139",
  "kidLessonFilterAge": "For My Age",
  "kidLessonFilterAll": "All Levels",
  "consoleInputPromptLabel": "Entrada:",
  "consoleInputPlaceholder": "Escribe tu respuesta y pulsa Enviar...",
  "consoleInputSubmitBtn": "Enviar",
  "consoleInputResetBtn": "Reiniciar",
  "kidVisualAsk": "Preguntar",
  "kidVisualList": "Cesta",
  "kidVisualRecipe": "Receta",
  "execWarnTitle": "Alerta de recursos (75%+)",
  "execWarnSteps": "Los pasos de ejecuci\xF3n superaron el 75 % del l\xEDmite \u2014 revisa tus bucles.",
  "execWarnMemory": "El uso de memoria en el entorno seguro super\xF3 el 75 % del l\xEDmite.",
  "execWarnArray": "El tama\xF1o de la lista super\xF3 el 75 % del l\xEDmite permitido.",
  "execWarnRecursion": "La profundidad de recursi\xF3n super\xF3 el 75 % del l\xEDmite.",
  "execWarnOutput": "Las l\xEDneas de salida superaron el 75 % del l\xEDmite."
};
var LESSON_PT_BR = {
  "loadSample": "Exemplo",
  "modeKid": "Modo Crian\xE7a",
  "modeBeginner": "Iniciante",
  "modePro": "Avan\xE7ado",
  "lessonsHeading": "Trilha Progressiva (30 Li\xE7\xF5es)",
  "lessonsSubheading": "Cada li\xE7\xE3o se adapta ao dialeto selecionado em tempo real.",
  "completedLabel": "Conclu\xEDda",
  "lockedLabel": "Bloqueada",
  "plannedLabel": "Em breve",
  "requiresConceptsLabel": "Requer conceitos:",
  "openInPlayground": "Abrir no Laborat\xF3rio",
  "verifyLesson": "Verificar e Concluir",
  "lessonPassed": "Muito bem! Li\xE7\xE3o conclu\xEDda com sucesso.",
  "lessonCheckFailed": "Revise as regras do objetivo e tente novamente.",
  "arrangeHint": "Clique nos cart\xF5es em ordem para montar um programa:",
  "arrangeSelected": "Sua sequ\xEAncia:",
  "arrangeReset": "Reiniciar ordem",
  "hintBtn": "Ver Dica",
  "hintsUsed": "Dicas exibidas",
  "ruleFail_prints_text": "Your program must print the requested text.",
  "ruleFail_prints_number": "Your program must print the exact target number.",
  "ruleFail_prints_bool": "Your program must print the requested boolean value.",
  "ruleFail_prints_in_order": "Print both values in the exact order shown in the goal.",
  "ruleFail_min_prints": "Add more print statements to meet the lesson goal.",
  "ruleFail_has_node": "Use a conditional or loop block for this lesson.",
  "ruleFail_min_nodes": "Include multiple conditional blocks as requested.",
  "ruleFail_has_else": "Add an else branch to handle the alternative path.",
  "ruleFail_nested_if": "Put an if condition inside another if block.",
  "ruleFail_test_token": "Use the specified boolean value inside the condition test.",
  "ruleFail_test_compares": "Use a comparison operator (like > or ==) inside the condition.",
  "ruleFail_min_functions": "Define at least one reusable dialect function for this lesson.",
  "ruleFail_has_return": "Include a return statement inside your function.",
  "ruleFail_uses_input": "Read interactive input from the user using your dialect input word.",
  "ruleFail_uses_array": "Create or inspect a list using [ ... ], indexing, or list helpers.",
  "lsKidTalkTitle": "01. Fa\xE7a o Computador Falar",
  "lsKidTalkGoal": 'Ordene os blocos para imprimir "salam".',
  "lsKidTalkExp1": "Mental algorithms begin with a clear action in the right order.",
  "lsKidTalkExp2": "First pick the Say block, then snap the greeting word after it.",
  "lsKidTalkHint1": "Tap the Say action card first, then tap the salam greeting card.",
  "lsKidTwiceTitle": "02. Duas Mensagens em Ordem",
  "lsKidTwiceGoal": 'Ordene os blocos para imprimir "salam" antes de "ahlan".',
  "lsKidTwiceExp1": "An algorithm runs commands one step at a time from first to last.",
  "lsKidTwiceExp2": "Keep the step separator between your two actions.",
  "lsKidTwiceHint1": "Start with Say salam, then the next-step divider, then Say ahlan.",
  "lsKidDoorTitle": "03. A Porta Aberta",
  "lsKidDoorGoal": 'Monte um bloco if com true para imprimir "salam".',
  "lsKidDoorExp1": "A decision checks whether a magic door is open or closed.",
  "lsKidDoorExp2": "Because the door is open, the action inside the path runs.",
  "lsKidDoorHint1": "Start with the If-Open gate, place Say salam inside, then close the step.",
  "lsKidSunRainTitle": "04. Sol ou Chuva",
  "lsKidSunRainGoal": 'Use if (false) e else para imprimir "rain".',
  "lsKidSunRainExp1": "When the first gate is closed, logic moves straight to the Else path.",
  "lsKidSunRainExp2": "Else guarantees a smart backup plan always runs.",
  "lsKidSunRainHint1": "Put the closed first gate first, then the Else path, then the rain step.",
  "lsKidAskTitle": "05. Ask & Answer",
  "lsKidAskGoal": "Arrange the Ask block to read a name and greet it.",
  "lsKidAskExp1": "Programs can ask the learner a question and remember the reply.",
  "lsKidAskExp2": "Use input inside print so your greeting uses the answer.",
  "lsKidAskHint1": "Place the Ask card before the greeting step.",
  "lsKidBasketTitle": "06. Magic Treat Basket",
  "lsKidBasketGoal": "Create a basket list of treats and count how many items it holds.",
  "lsKidBasketExp1": "Lists store multiple treats together inside square brackets [ ... ].",
  "lsKidBasketExp2": "Your length command counts every treat inside the basket.",
  "lsKidBasketHint1": "Create the basket variable first, then print its length.",
  "lsBgPrintTitle": "01. Print Hello",
  "lsBgPrintGoal": 'Write a statement that prints "salam".',
  "lsBgPrintExp1": 'Strings of text are wrapped in double quotes like "salam".',
  "lsBgPrintExp2": "Pass the text inside parentheses right after your dialect print keyword.",
  "lsBgPrintHint1": "Make sure the text inside quotes spells salam exactly.",
  "lsBgPrintHint2": "Do not forget closing quotes and closing parentheses.",
  "lsBgTwoTitle": "02. Sequential Lines",
  "lsBgTwoGoal": 'Print "salam" on line 1 and "ahlan" on line 2.',
  "lsBgTwoExp1": "Each statement on its own line executes strictly in sequence.",
  "lsBgTwoExp2": "This forms the backbone of every algorithm.",
  "lsBgTwoHint1": 'Put "salam" first, then "ahlan" on the next line.',
  "lsBgNumberTitle": "03. Printing Numbers",
  "lsBgNumberGoal": "Print the number 7 without quotes.",
  "lsBgNumberExp1": "Numbers are values directly understood for math\u2014they do not use quotes.",
  "lsBgNumberExp2": "Try passing 7 straight inside the print call.",
  "lsBgNumberHint1": "Write 7 inside the parentheses with no double quotes.",
  "lsBgBoolTitle": "04. True or False",
  "lsBgBoolGoal": "Print the boolean value true using your dialect keyword.",
  "lsBgBoolExp1": "Booleans represent logical truth: true or false.",
  "lsBgBoolExp2": "Your dialect has dedicated words for both true and false.",
  "lsBgBoolHint1": "Replace text with your dialect word for true inside print().",
  "lsBgVarsTitle": "05. Variables & Assignment",
  "lsBgVarsGoal": "Store a greeting in a variable and print it.",
  "lsBgVarsExp1": "Variables give names to values so you can reuse or update them later.",
  "lsBgVarsExp2": "Use your dialect let keyword followed by name = value.",
  "lsBgVarsHint1": "Declare the variable first, then pass its name into print().",
  "lsBgInputTitle": "06. Interactive Input Greeting",
  "lsBgInputGoal": "Ask the user for their name with input() and print it.",
  "lsBgInputExp1": "The input command pauses execution and asks the user for a reply.",
  "lsBgInputExp2": "Store the reply in a variable, then print a greeting with it.",
  "lsBgInputHint1": 'Assign your input("Name?") call to a variable, then print("Salam", variable).',
  "lsBgIfTitle": "07. First Decision (If)",
  "lsBgIfGoal": 'Write an if (true) block that prints "salam".',
  "lsBgIfExp1": "Code inside curly braces { ... } forms a conditional block.",
  "lsBgIfExp2": "When the condition inside ( ) is true, the block executes.",
  "lsBgIfHint1": "Check that both { and } braces match properly.",
  "lsBgElseTitle": "08. Two Paths (If / Else)",
  "lsBgElseGoal": 'Write an if (false) branch and an else branch that prints "no".',
  "lsBgElseExp1": "Combine if with else to cover both outcomes of a decision.",
  "lsBgElseExp2": "Use false in the test so execution flows into the else branch.",
  "lsBgElseHint1": 'Ensure the else branch prints "no".',
  "lsBgCompareTitle": "09. Comparing Numbers",
  "lsBgCompareGoal": 'Use a comparison (such as 10 > 3) inside an if condition to print "salam".',
  "lsBgCompareExp1": "Operators like >, <, == compare two values and return true or false.",
  "lsBgCompareExp2": "This lets programs make smart data-driven choices.",
  "lsBgCompareHint1": "Write (10 > 3) inside the if parentheses.",
  "lsBgWhileTitle": "10. Counting Loops (While)",
  "lsBgWhileGoal": "Count from 0 up to 2 using a while loop.",
  "lsBgWhileExp1": "A counter variable grows on each loop step until the condition becomes false.",
  "lsBgWhileExp2": "Always update the counter inside the loop body so it finishes cleanly.",
  "lsBgWhileHint1": "Declare i = 0, check while (i < 3), print i, and increment i = i + 1.",
  "lsBgForTitle": "11. Range Loops (For)",
  "lsBgForGoal": "Loop over the range 1..3 using your dialect for keyword.",
  "lsBgForExp1": "Range loops let you step from start to end without a manual counter.",
  "lsBgForExp2": "Write for (i : 1..3) { ... } to run cleanly across 1, 2, and 3.",
  "lsBgForHint1": "Use i : 1..3 inside your for loop header.",
  "lsBgListTitle": "12. Lists & Basket Length",
  "lsBgListGoal": "Create a list, push a new item, and print its length.",
  "lsBgListExp1": "Arrays hold an ordered sequence inside [ ... ] brackets.",
  "lsBgListExp2": "Use push to add elements and len to check the total size.",
  "lsBgListHint1": "Declare a list variable, call push(list, 30), and print len(list).",
  "lsPrTwoIfsTitle": "01. Chained Independent Checks",
  "lsPrTwoIfsGoal": 'Write two if statements (one true, one false) printing "salam" and "ahlan" branches.',
  "lsPrTwoIfsExp1": "Sequential independent if blocks evaluate separately.",
  "lsPrTwoIfsExp2": "Practice keeping multiple control structures clean and readable.",
  "lsPrTwoIfsHint1": 'Create one if with true ("salam") and another if with false ("ahlan").',
  "lsPrNestedTitle": "02. Nested Decision Logic",
  "lsPrNestedGoal": 'Nest an if/else inside an outer if block so the inner else prints "b".',
  "lsPrNestedExp1": "Conditions can live inside other conditions to model layered logic.",
  "lsPrNestedExp2": "Keep indentation clear so matching braces stay easy to verify.",
  "lsPrNestedHint1": 'Put if (false) { print("a") } else { print("b") } inside an outer if (true).',
  "lsPrWhileTitle": "03. Controlled Loop Guard",
  "lsPrWhileGoal": 'Build a while (false) block containing print("salam") to practice safe loop structure.',
  "lsPrWhileExp1": "A while loop checks its condition before entering the body.",
  "lsPrWhileExp2": "Dialects that provide a while keyword unlock this challenge automatically.",
  "lsPrWhileHint1": "Install the Full Dialect Pack if your dialect does not yet include while.",
  "lsPrFuncTitle": "04. Reusable Functions",
  "lsPrFuncGoal": "Define a dialect function with a parameter and call it twice.",
  "lsPrFuncExp1": "Functions package reusable steps under a clean name and accept parameters.",
  "lsPrFuncExp2": 'Calling greet("Maghreb") runs the function body with that argument.',
  "lsPrFuncHint1": "Declare the function with fn, then invoke it with parentheses.",
  "lsPrReturnTitle": "05. Functions with Return",
  "lsPrReturnGoal": "Write a function that returns a * b and print the result of calling it.",
  "lsPrReturnExp1": "The return keyword sends a computed value back to the caller.",
  "lsPrReturnExp2": "Functions with return can be nested directly inside expressions and print().",
  "lsPrReturnHint1": "End your function body with return a * b and pass the call to print().",
  "lsPrArraysTitle": "06. Collections & Arrays",
  "lsPrArraysGoal": "Create a list, push an element, read by index, and print its length.",
  "lsPrArraysExp1": "Square brackets [0] access the first element cleanly by index.",
  "lsPrArraysExp2": "You can append dynamically using your dialect push helper.",
  "lsPrArraysHint1": "Combine list creation, push(), indexing, and len() in one script.",
  "lsPrForEachTitle": "07. Iterating Over Lists",
  "lsPrForEachGoal": "Use a for-each loop to print every item inside an array.",
  "lsPrForEachExp1": "Use for (item : myList) { ... } to visit each list item in order.",
  "lsPrForEachExp2": "For-each iteration avoids off-by-one index bugs automatically.",
  "lsPrForEachHint1": "Iterate your list variable inside a for (...) block and print the item.",
  "lsPrForSumTitle": "08. Range Accumulator",
  "lsPrForSumGoal": "Sum numbers from 1 to 4 inside a for range loop and print the total.",
  "lsPrForSumExp1": "Accumulators track running totals in a variable declared before the loop.",
  "lsPrForSumExp2": "Add the loop variable on every pass and print once after the loop.",
  "lsPrForSumHint1": "Start total = 0, then update total = total + i inside for (i : 1..4).",
  "lsPrFnListTitle": "09. Functions & Lists Together",
  "lsPrFnListGoal": "Write a function returning the length of a list passed to it.",
  "lsPrFnListExp1": "Arrays can be passed as arguments just like numbers or strings.",
  "lsPrFnListExp2": "Calling len(arr) inside your function returns the live count.",
  "lsPrFnListHint1": "Pass your array variable into countBag(bag) and print the returned number.",
  "lsPrInputGuardTitle": "10. Input Validation Guard",
  "lsPrInputGuardGoal": "Read input, check a numeric threshold with if/else, and print feedback.",
  "lsPrInputGuardExp1": "Combining input() with if/else protects programs against unexpected values.",
  "lsPrInputGuardExp2": "Handle both passing and fallback outcomes cleanly.",
  "lsPrInputGuardHint1": 'Read score = input("Score?"), then branch with >= 10 and else.',
  "lsPrFnComposeTitle": "11. Composing Functions",
  "lsPrFnComposeGoal": "Define two functions where the second composes calls to the first.",
  "lsPrFnComposeExp1": "Breaking big problems into helper functions keeps algorithms modular.",
  "lsPrFnComposeExp2": "Track helper calls inside the Call Stack view in Developer Tools.",
  "lsPrFnComposeHint1": "Define square(n) and sumSq(x, y) returning square(x) + square(y).",
  "lsPrErrorsTitle": "12. Defensive Bounds Check",
  "lsPrErrorsGoal": "Check list length with len() before reading an element by index.",
  "lsPrErrorsExp1": "Checking bounds prevents out-of-range index errors at runtime.",
  "lsPrErrorsExp2": "Provide a safe else message when the collection is too short.",
  "lsPrErrorsHint1": "Check if (len(items) > 1) before reading items[1].",
  "reviewAgain": "Rever",
  "cardLabel": "Cart\xE3o",
  "closeBtn": "Fechar",
  "lessonRoadmapTitle": "Mapa de Progresso (30 Li\xE7\xF5es)",
  "lessonRoadmapSummary": "Clique em qualquer li\xE7\xE3o para ir diretamente at\xE9 ela.",
  "lessonStageReady": "Pronta",
  "lessonStageCompleted": "Conclu\xEDda",
  "lessonStageLocked": "Bloqueada",
  "lessonStagePlanned": "Roteiro",
  "listenLessonAudio": "Ouvir \xE1udio",
  "startReviewSession": "Sess\xE3o de Revis\xE3o",
  "stopReviewSession": "Sair da Revis\xE3o",
  "reviewSessionTitle": "Revis\xE3o de Li\xE7\xF5es Conclu\xEDdas",
  "reviewCardProgress": "Cart\xE3o",
  "reviewNext": "Pr\xF3xima",
  "reviewMastered": "Dominada",
  "reviewMasteredCount": "Revisadas nesta sess\xE3o",
  "noCompletedForReview": "Conclua pelo menos uma li\xE7\xE3o para iniciar sua Sess\xE3o de Revis\xE3o.",
  "showSolutionBtn": "Mostrar resposta",
  "kidVisualSpeak": "Dizer",
  "kidVisualDoorOpen": "Porta Aberta",
  "kidVisualDoorClosed": "Outro Caminho",
  "kidVisualLoop": "Repetir",
  "practicePronunciationLabel": "Pr\xE1tica de pron\xFAncia",
  "listenSlow": "Lento (0.65\xD7)",
  "listenNormal": "Normal",
  "quizPredictOutputPrompt": "O que esta li\xE7\xE3o conclu\xEDda vai imprimir?",
  "quizFillKeywordPrompt": "Escolha a palavra-chave que falta no trecho:",
  "quizScoreLabel": "Pontua\xE7\xE3o do Quiz",
  "quizRestartBtn": "Novo Quiz",
  "packReadyCountLabel": "prontas no pacote",
  "quizCodeChallengePrompt": "Corrija ou escreva o c\xF3digo no dialeto para validar com o motor:",
  "achievementsShelfTitle": "Conquistas de Aprendizagem",
  "achievementsEarnedSummary": "desbloqueadas",
  "achievementUnlockedBannerTitle": "Nova conquista desbloqueada",
  "achievementDismissBtn": "Dispensar",
  "achievementLockedLabel": "Bloqueada",
  "achievementEarnedOnLabel": "Conquistada em",
  "achFirstSparkTitle": "Primeira Fa\xEDsca",
  "achFirstSparkDesc": "Verifique sua primeira li\xE7\xE3o guiada em qualquer dialeto.",
  "achDialectExplorerTitle": "Explorador de Dialetos",
  "achDialectExplorerDesc": "Conclua pelo menos 1 li\xE7\xE3o em 2 ou mais dialetos distintos.",
  "achBranchNavigatorTitle": "Navegador de Condi\xE7\xF5es",
  "achBranchNavigatorDesc": "Conclua 2 li\xE7\xF5es de l\xF3gica condicional (se / sen\xE3o).",
  "achSyntaxMasterTitle": "Mestre da Sintaxe",
  "achSyntaxMasterDesc": "Domine as 3 li\xE7\xF5es Pro de condi\xE7\xF5es aninhadas e la\xE7os.",
  "achReviewChampionTitle": "Campe\xE3o da Revis\xE3o",
  "achReviewChampionDesc": "Acertar 3 desafios de revis\xE3o verificados pelo BaydaEngine.",
  "achMaghrebPolyglotTitle": "Poliglota do Magrebe",
  "achMaghrebPolyglotDesc": "Conclua 10 li\xE7\xF5es verificadas no seu perfil unificado.",
  "showBadgesBtn": "Ver medalhas",
  "hideBadgesBtn": "Ocultar medalhas",
  "showMapBtn": "Mapa",
  "openLessonBtn": "Abrir",
  "closeLessonBtn": "Fechar",
  "hideDetailsBtn": "Ocultar",
  "lessonNextBtn": "Pr\xF3xima li\xE7\xE3o",
  "speakSnippetBtn": "Ouvir trecho",
  "stopSpeakingBtn": "Parar voz",
  "kidTapTileHint": "Toque em um cart\xE3o para escolher o que o rob\xF4 diz",
  "kidVisualCounter": "Score Box",
  "kidEndStepWord": "End step",
  "kidVarWord": "Counter",
  "kidLessonVisualArrangeHint": "Tap the visual logic blocks in order to build the mental algorithm:",
  "kidVisualMove": "Move",
  "kidVisualJump": "Jump",
  "kidVisualTurn": "Turn",
  "kidQuizPickLogicPrompt": "Pick the matching visual logic sequence",
  "kidLessonEasy": "Starter \xB7 4\u20135",
  "kidLessonMedium": "Explorer \xB7 6\u20137",
  "kidLessonChallenge": "Challenge \xB7 8\u20139",
  "kidLessonFilterAge": "For My Age",
  "kidLessonFilterAll": "All Levels",
  "consoleInputPromptLabel": "Entrada:",
  "consoleInputPlaceholder": "Digite a resposta e envie...",
  "consoleInputSubmitBtn": "Enviar",
  "consoleInputResetBtn": "Reiniciar",
  "kidVisualAsk": "Perguntar",
  "kidVisualList": "Cesta",
  "kidVisualRecipe": "Receita",
  "execWarnTitle": "Alerta de recursos (75%+)",
  "execWarnSteps": "Os passos de execu\xE7\xE3o ultrapassaram 75% do limite \u2014 revise os la\xE7os.",
  "execWarnMemory": "O uso de mem\xF3ria do ambiente seguro ultrapassou 75% do limite.",
  "execWarnArray": "O tamanho da lista ultrapassou 75% do limite permitido.",
  "execWarnRecursion": "A profundidade de chamadas recursivas ultrapassou 75% do limite.",
  "execWarnOutput": "As linhas de sa\xEDda ultrapassaram 75% do limite."
};
var LESSON_ARN = {
  "loadSample": "Adk\xFCnun",
  "modeKid": "Pichikeche",
  "modeBeginner": "W\xFCne Kimeltu",
  "modePro": "Kimche",
  "lessonsHeading": "Kim\xFCn Dungu (30 Troki\xF1)",
  "lessonsSubheading": "Kake kim\xFCn ad\xFCmuwkey tami dulliel dungun mew.",
  "completedLabel": "Wechungey",
  "lockedLabel": "N\xFCr\xFCfk\xFCley",
  "plannedLabel": "Pichin mew",
  "requiresConceptsLabel": "Duamyey t\xFCfa:",
  "openInPlayground": "N\xFClan K\xFCzawwe mew",
  "verifyLesson": "Leli ka Wechun",
  "lessonPassed": "\xA1M\xFCna k\xFCme! Kim\xFCn wechungey.",
  "lessonCheckFailed": "Wi\xF1o leliymi tami k\xF3digo ka feypinge ka ki\xF1e rupa.",
  "arrangeHint": "N\xFCtr\xFCm\xFCn tarjeta k\xFCme ad mew:",
  "arrangeSelected": "Tami adk\xFCnun:",
  "arrangeReset": "Wi\xF1o eltun",
  "hintBtn": "Pen Kellu",
  "hintsUsed": "Kellu pegey",
  "ruleFail_prints_text": "Your program must print the requested text.",
  "ruleFail_prints_number": "Your program must print the exact target number.",
  "ruleFail_prints_bool": "Your program must print the requested boolean value.",
  "ruleFail_prints_in_order": "Print both values in the exact order shown in the goal.",
  "ruleFail_min_prints": "Add more print statements to meet the lesson goal.",
  "ruleFail_has_node": "Use a conditional or loop block for this lesson.",
  "ruleFail_min_nodes": "Include multiple conditional blocks as requested.",
  "ruleFail_has_else": "Add an else branch to handle the alternative path.",
  "ruleFail_nested_if": "Put an if condition inside another if block.",
  "ruleFail_test_token": "Use the specified boolean value inside the condition test.",
  "ruleFail_test_compares": "Use a comparison operator (like > or ==) inside the condition.",
  "ruleFail_min_functions": "Define at least one reusable dialect function for this lesson.",
  "ruleFail_has_return": "Include a return statement inside your function.",
  "ruleFail_uses_input": "Read interactive input from the user using your dialect input word.",
  "ruleFail_uses_array": "Create or inspect a list using [ ... ], indexing, or list helpers.",
  "lsKidTalkTitle": "01. Make the Robot Speak",
  "lsKidTalkGoal": "Snap the Speak block first, then choose the greeting.",
  "lsKidTalkExp1": "Mental algorithms begin with a clear action in the right order.",
  "lsKidTalkExp2": "First pick the Say block, then snap the greeting word after it.",
  "lsKidTalkHint1": "Tap the Say action card first, then tap the salam greeting card.",
  "lsKidTwiceTitle": "02. Two Steps in Order",
  "lsKidTwiceGoal": "Sequence the steps so salam plays before ahlan.",
  "lsKidTwiceExp1": "An algorithm runs commands one step at a time from first to last.",
  "lsKidTwiceExp2": "Keep the step separator between your two actions.",
  "lsKidTwiceHint1": "Start with Say salam, then the next-step divider, then Say ahlan.",
  "lsKidDoorTitle": "03. The Open Logic Door",
  "lsKidDoorGoal": "Build an If-Open path so the robot says salam.",
  "lsKidDoorExp1": "A decision checks whether a magic door is open or closed.",
  "lsKidDoorExp2": "Because the door is open, the action inside the path runs.",
  "lsKidDoorHint1": "Start with the If-Open gate, place Say salam inside, then close the step.",
  "lsKidSunRainTitle": "04. Sun or Rain Path",
  "lsKidSunRainGoal": "Use a closed first gate and an Else path so rain appears.",
  "lsKidSunRainExp1": "When the first gate is closed, logic moves straight to the Else path.",
  "lsKidSunRainExp2": "Else guarantees a smart backup plan always runs.",
  "lsKidSunRainHint1": "Put the closed first gate first, then the Else path, then the rain step.",
  "lsKidAskTitle": "05. Ask & Answer",
  "lsKidAskGoal": "Arrange the Ask block to read a name and greet it.",
  "lsKidAskExp1": "Programs can ask the learner a question and remember the reply.",
  "lsKidAskExp2": "Use input inside print so your greeting uses the answer.",
  "lsKidAskHint1": "Place the Ask card before the greeting step.",
  "lsKidBasketTitle": "06. Magic Treat Basket",
  "lsKidBasketGoal": "Create a basket list of treats and count how many items it holds.",
  "lsKidBasketExp1": "Lists store multiple treats together inside square brackets [ ... ].",
  "lsKidBasketExp2": "Your length command counts every treat inside the basket.",
  "lsKidBasketHint1": "Create the basket variable first, then print its length.",
  "lsBgPrintTitle": "01. Print Hello",
  "lsBgPrintGoal": 'Write a statement that prints "salam".',
  "lsBgPrintExp1": 'Strings of text are wrapped in double quotes like "salam".',
  "lsBgPrintExp2": "Pass the text inside parentheses right after your dialect print keyword.",
  "lsBgPrintHint1": "Make sure the text inside quotes spells salam exactly.",
  "lsBgPrintHint2": "Do not forget closing quotes and closing parentheses.",
  "lsBgTwoTitle": "02. Sequential Lines",
  "lsBgTwoGoal": 'Print "salam" on line 1 and "ahlan" on line 2.',
  "lsBgTwoExp1": "Each statement on its own line executes strictly in sequence.",
  "lsBgTwoExp2": "This forms the backbone of every algorithm.",
  "lsBgTwoHint1": 'Put "salam" first, then "ahlan" on the next line.',
  "lsBgNumberTitle": "03. Printing Numbers",
  "lsBgNumberGoal": "Print the number 7 without quotes.",
  "lsBgNumberExp1": "Numbers are values directly understood for math\u2014they do not use quotes.",
  "lsBgNumberExp2": "Try passing 7 straight inside the print call.",
  "lsBgNumberHint1": "Write 7 inside the parentheses with no double quotes.",
  "lsBgBoolTitle": "04. True or False",
  "lsBgBoolGoal": "Print the boolean value true using your dialect keyword.",
  "lsBgBoolExp1": "Booleans represent logical truth: true or false.",
  "lsBgBoolExp2": "Your dialect has dedicated words for both true and false.",
  "lsBgBoolHint1": "Replace text with your dialect word for true inside print().",
  "lsBgVarsTitle": "05. Variables & Assignment",
  "lsBgVarsGoal": "Store a greeting in a variable and print it.",
  "lsBgVarsExp1": "Variables give names to values so you can reuse or update them later.",
  "lsBgVarsExp2": "Use your dialect let keyword followed by name = value.",
  "lsBgVarsHint1": "Declare the variable first, then pass its name into print().",
  "lsBgInputTitle": "06. Interactive Input Greeting",
  "lsBgInputGoal": "Ask the user for their name with input() and print it.",
  "lsBgInputExp1": "The input command pauses execution and asks the user for a reply.",
  "lsBgInputExp2": "Store the reply in a variable, then print a greeting with it.",
  "lsBgInputHint1": 'Assign your input("Name?") call to a variable, then print("Salam", variable).',
  "lsBgIfTitle": "07. First Decision (If)",
  "lsBgIfGoal": 'Write an if (true) block that prints "salam".',
  "lsBgIfExp1": "Code inside curly braces { ... } forms a conditional block.",
  "lsBgIfExp2": "When the condition inside ( ) is true, the block executes.",
  "lsBgIfHint1": "Check that both { and } braces match properly.",
  "lsBgElseTitle": "08. Two Paths (If / Else)",
  "lsBgElseGoal": 'Write an if (false) branch and an else branch that prints "no".',
  "lsBgElseExp1": "Combine if with else to cover both outcomes of a decision.",
  "lsBgElseExp2": "Use false in the test so execution flows into the else branch.",
  "lsBgElseHint1": 'Ensure the else branch prints "no".',
  "lsBgCompareTitle": "09. Comparing Numbers",
  "lsBgCompareGoal": 'Use a comparison (such as 10 > 3) inside an if condition to print "salam".',
  "lsBgCompareExp1": "Operators like >, <, == compare two values and return true or false.",
  "lsBgCompareExp2": "This lets programs make smart data-driven choices.",
  "lsBgCompareHint1": "Write (10 > 3) inside the if parentheses.",
  "lsBgWhileTitle": "10. Counting Loops (While)",
  "lsBgWhileGoal": "Count from 0 up to 2 using a while loop.",
  "lsBgWhileExp1": "A counter variable grows on each loop step until the condition becomes false.",
  "lsBgWhileExp2": "Always update the counter inside the loop body so it finishes cleanly.",
  "lsBgWhileHint1": "Declare i = 0, check while (i < 3), print i, and increment i = i + 1.",
  "lsBgForTitle": "11. Range Loops (For)",
  "lsBgForGoal": "Loop over the range 1..3 using your dialect for keyword.",
  "lsBgForExp1": "Range loops let you step from start to end without a manual counter.",
  "lsBgForExp2": "Write for (i : 1..3) { ... } to run cleanly across 1, 2, and 3.",
  "lsBgForHint1": "Use i : 1..3 inside your for loop header.",
  "lsBgListTitle": "12. Lists & Basket Length",
  "lsBgListGoal": "Create a list, push a new item, and print its length.",
  "lsBgListExp1": "Arrays hold an ordered sequence inside [ ... ] brackets.",
  "lsBgListExp2": "Use push to add elements and len to check the total size.",
  "lsBgListHint1": "Declare a list variable, call push(list, 30), and print len(list).",
  "lsPrTwoIfsTitle": "01. Chained Independent Checks",
  "lsPrTwoIfsGoal": 'Write two if statements (one true, one false) printing "salam" and "ahlan" branches.',
  "lsPrTwoIfsExp1": "Sequential independent if blocks evaluate separately.",
  "lsPrTwoIfsExp2": "Practice keeping multiple control structures clean and readable.",
  "lsPrTwoIfsHint1": 'Create one if with true ("salam") and another if with false ("ahlan").',
  "lsPrNestedTitle": "02. Nested Decision Logic",
  "lsPrNestedGoal": 'Nest an if/else inside an outer if block so the inner else prints "b".',
  "lsPrNestedExp1": "Conditions can live inside other conditions to model layered logic.",
  "lsPrNestedExp2": "Keep indentation clear so matching braces stay easy to verify.",
  "lsPrNestedHint1": 'Put if (false) { print("a") } else { print("b") } inside an outer if (true).',
  "lsPrWhileTitle": "03. Controlled Loop Guard",
  "lsPrWhileGoal": 'Build a while (false) block containing print("salam") to practice safe loop structure.',
  "lsPrWhileExp1": "A while loop checks its condition before entering the body.",
  "lsPrWhileExp2": "Dialects that provide a while keyword unlock this challenge automatically.",
  "lsPrWhileHint1": "Install the Full Dialect Pack if your dialect does not yet include while.",
  "lsPrFuncTitle": "04. Reusable Functions",
  "lsPrFuncGoal": "Define a dialect function with a parameter and call it twice.",
  "lsPrFuncExp1": "Functions package reusable steps under a clean name and accept parameters.",
  "lsPrFuncExp2": 'Calling greet("Maghreb") runs the function body with that argument.',
  "lsPrFuncHint1": "Declare the function with fn, then invoke it with parentheses.",
  "lsPrReturnTitle": "05. Functions with Return",
  "lsPrReturnGoal": "Write a function that returns a * b and print the result of calling it.",
  "lsPrReturnExp1": "The return keyword sends a computed value back to the caller.",
  "lsPrReturnExp2": "Functions with return can be nested directly inside expressions and print().",
  "lsPrReturnHint1": "End your function body with return a * b and pass the call to print().",
  "lsPrArraysTitle": "06. Collections & Arrays",
  "lsPrArraysGoal": "Create a list, push an element, read by index, and print its length.",
  "lsPrArraysExp1": "Square brackets [0] access the first element cleanly by index.",
  "lsPrArraysExp2": "You can append dynamically using your dialect push helper.",
  "lsPrArraysHint1": "Combine list creation, push(), indexing, and len() in one script.",
  "lsPrForEachTitle": "07. Iterating Over Lists",
  "lsPrForEachGoal": "Use a for-each loop to print every item inside an array.",
  "lsPrForEachExp1": "Use for (item : myList) { ... } to visit each list item in order.",
  "lsPrForEachExp2": "For-each iteration avoids off-by-one index bugs automatically.",
  "lsPrForEachHint1": "Iterate your list variable inside a for (...) block and print the item.",
  "lsPrForSumTitle": "08. Range Accumulator",
  "lsPrForSumGoal": "Sum numbers from 1 to 4 inside a for range loop and print the total.",
  "lsPrForSumExp1": "Accumulators track running totals in a variable declared before the loop.",
  "lsPrForSumExp2": "Add the loop variable on every pass and print once after the loop.",
  "lsPrForSumHint1": "Start total = 0, then update total = total + i inside for (i : 1..4).",
  "lsPrFnListTitle": "09. Functions & Lists Together",
  "lsPrFnListGoal": "Write a function returning the length of a list passed to it.",
  "lsPrFnListExp1": "Arrays can be passed as arguments just like numbers or strings.",
  "lsPrFnListExp2": "Calling len(arr) inside your function returns the live count.",
  "lsPrFnListHint1": "Pass your array variable into countBag(bag) and print the returned number.",
  "lsPrInputGuardTitle": "10. Input Validation Guard",
  "lsPrInputGuardGoal": "Read input, check a numeric threshold with if/else, and print feedback.",
  "lsPrInputGuardExp1": "Combining input() with if/else protects programs against unexpected values.",
  "lsPrInputGuardExp2": "Handle both passing and fallback outcomes cleanly.",
  "lsPrInputGuardHint1": 'Read score = input("Score?"), then branch with >= 10 and else.',
  "lsPrFnComposeTitle": "11. Composing Functions",
  "lsPrFnComposeGoal": "Define two functions where the second composes calls to the first.",
  "lsPrFnComposeExp1": "Breaking big problems into helper functions keeps algorithms modular.",
  "lsPrFnComposeExp2": "Track helper calls inside the Call Stack view in Developer Tools.",
  "lsPrFnComposeHint1": "Define square(n) and sumSq(x, y) returning square(x) + square(y).",
  "lsPrErrorsTitle": "12. Defensive Bounds Check",
  "lsPrErrorsGoal": "Check list length with len() before reading an element by index.",
  "lsPrErrorsExp1": "Checking bounds prevents out-of-range index errors at runtime.",
  "lsPrErrorsExp2": "Provide a safe else message when the collection is too short.",
  "lsPrErrorsHint1": "Check if (len(items) > 1) before reading items[1].",
  "reviewAgain": "Wi\xF1o lelin",
  "cardLabel": "Tarjeta",
  "closeBtn": "N\xFCr\xFCfun",
  "lessonRoadmapTitle": "30 Kim\xFCn Dungu \xF1i R\xFCp\xFC",
  "lessonRoadmapSummary": "N\xFCtr\xFCm\xFCn chem kim\xFCn rume tami amuam.",
  "lessonStageReady": "Pepik\xFCley",
  "lessonStageCompleted": "Wechungey",
  "lessonStageLocked": "N\xFCr\xFCfk\xFCley",
  "lessonStagePlanned": "Inalechi",
  "listenLessonAudio": "Allk\xFCtun Dungun",
  "startReviewSession": "Wi\xF1o Kintun Dungu",
  "stopReviewSession": "Tripan Wi\xF1o Kintun mew",
  "reviewSessionTitle": "Wechuel Kim\xFCn \xF1i Wi\xF1o Kintun",
  "reviewCardProgress": "Tarjeta",
  "reviewNext": "Inalechi",
  "reviewMastered": "Kimngey",
  "reviewMasteredCount": "Wi\xF1o kintungey",
  "noCompletedForReview": "Wechunge ki\xF1e kim\xFCn w\xFCne tami llitual wi\xF1o kintun.",
  "showSolutionBtn": "Pen k\xFCme wirin",
  "kidVisualSpeak": "Feypin",
  "kidVisualDoorOpen": "N\xFClalechi W\xFClngi\xF1",
  "kidVisualDoorClosed": "Kake R\xFCp\xFC",
  "kidVisualLoop": "Wi\xF1otu",
  "practicePronunciationLabel": "Allk\xFCtun ka Wirintukun",
  "listenSlow": "\xD1ochi (0.65\xD7)",
  "listenNormal": "K\xFCme",
  "quizPredictOutputPrompt": "\xBFChem dungu tripapay t\xFCfachi k\xF3digo mew?",
  "quizFillKeywordPrompt": "Dullinge ti falin nem\xFCl nielu:",
  "quizScoreLabel": "Wechun",
  "quizRestartBtn": "We Ramtun",
  "packReadyCountLabel": "k\xFCme m\xFCley t\xFCfa mew",
  "quizCodeChallengePrompt": "K\xFCme wirintukunge ti k\xF3digo tami kimel\xFCn mew:",
  "achievementsShelfTitle": "Kim\xFCn K\xFCzaw Medalla",
  "achievementsEarnedSummary": "n\xFClal",
  "achievementUnlockedBannerTitle": "We kim\xFCn medalla n\xFClal",
  "achievementDismissBtn": "K\xFCnun",
  "achievementLockedLabel": "N\xFCr\xFCf\xFCn",
  "achievementEarnedOnLabel": "Wechun ant\xFC",
  "achFirstSparkTitle": "W\xFCne K\xFCtral",
  "achFirstSparkDesc": "Wechunge w\xFCne kimeltun ki\xF1e Magreb dungun mew.",
  "achDialectExplorerTitle": "Dungun Kintukafe",
  "achDialectExplorerDesc": "Wechunge kimeltun epu kakewme dungun mew.",
  "achBranchNavigatorTitle": "R\xFCp\xFC Adk\xFCnufe",
  "achBranchNavigatorDesc": "Wechunge epu r\xFCp\xFC rakiduam kimeltun.",
  "achSyntaxMasterTitle": "K\xF3digo Kimfe",
  "achSyntaxMasterDesc": "Wechunge k\xFCla al\xFCn Pro k\xF3digo kimeltun.",
  "achReviewChampionTitle": "Inantukun Wechufe",
  "achReviewChampionDesc": "Wechunge k\xFCla inantukun ramtun BaydaEngine mew.",
  "achMaghrebPolyglotTitle": "Kom Magreb Kimfe",
  "achMaghrebPolyglotDesc": "Wechunge mari kimeltun tami perfil mew.",
  "showBadgesBtn": "Pen Medalla",
  "hideBadgesBtn": "Llum\xFCm\xFCn Medalla",
  "showMapBtn": "R\xFCp\xFC",
  "openLessonBtn": "N\xFClal",
  "closeLessonBtn": "N\xFCr\xFCf\xFCn",
  "hideDetailsBtn": "Llum\xFCm\xFCn",
  "lessonNextBtn": "Inalechi kimeltun",
  "speakSnippetBtn": "Speak Snippet",
  "stopSpeakingBtn": "Stop Speech",
  "kidTapTileHint": "N\xFCwk\xFCtu ki\xF1e karta tami dungual",
  "kidVisualCounter": "Score Box",
  "kidEndStepWord": "End step",
  "kidVarWord": "Counter",
  "kidLessonVisualArrangeHint": "Tap the visual logic blocks in order to build the mental algorithm:",
  "kidVisualMove": "Move",
  "kidVisualJump": "Jump",
  "kidVisualTurn": "Turn",
  "kidQuizPickLogicPrompt": "Pick the matching visual logic sequence",
  "kidLessonEasy": "Starter \xB7 4\u20135",
  "kidLessonMedium": "Explorer \xB7 6\u20137",
  "kidLessonChallenge": "Challenge \xB7 8\u20139",
  "kidLessonFilterAge": "For My Age",
  "kidLessonFilterAll": "All Levels",
  "consoleInputPromptLabel": "Tukun:",
  "consoleInputPlaceholder": "Wirin tami dungu...",
  "consoleInputSubmitBtn": "Werk\xFCn",
  "consoleInputResetBtn": "Wi\xF1o eltun",
  "kidVisualAsk": "Ramtun",
  "kidVisualList": "K\xFClko",
  "kidVisualRecipe": "Adk\xFCnun",
  "execWarnTitle": "Ku\xF1iw\xFCn r\xFCp\xFC (75%+)",
  "execWarnSteps": "Fentren rupan (75%+): ng\xFCneduamnge tami loop.",
  "execWarnMemory": "M\xFCna newen memory (75%+) t\xFCfachi k\xFCzaw mew.",
  "execWarnArray": "M\xFCna al\xFCn rakin lista (75%+).",
  "execWarnRecursion": "M\xFCna kon\xFCn f\xFClke r\xFCp\xFC (75%+).",
  "execWarnOutput": "Fentren wirin tripapay (75%+)."
};
var LESSON_HT = {
  "loadSample": "Egzanp",
  "modeKid": "M\xF2d Timoun",
  "modeBeginner": "Debitan",
  "modePro": "Pwofesyon\xE8l",
  "lessonsHeading": "Pwogram Leson Pwogresif (30 Leson)",
  "lessonsSubheading": "Chak leson adapte otomatikman ak dyal\xE8k ou chwazi a.",
  "completedLabel": "Fini",
  "lockedLabel": "F\xE8men",
  "plannedLabel": "Tal\xE8",
  "requiresConceptsLabel": "Mande kons\xE8p:",
  "openInPlayground": "Louvri nan Atelye",
  "verifyLesson": "Verifye & Fini",
  "lessonPassed": "Bravo! Ou reyisi leson an.",
  "lessonCheckFailed": "Verifye r\xE8g objektif la anba a epi eseye ank\xF2.",
  "arrangeHint": "Klike sou kat yo nan bon l\xF2d pou bati pwogram nan:",
  "arrangeSelected": "Sekans ou a:",
  "arrangeReset": "Rek\xF2manse l\xF2d",
  "hintBtn": "Montre Endis",
  "hintsUsed": "Endis montre",
  "ruleFail_prints_text": "Your program must print the requested text.",
  "ruleFail_prints_number": "Your program must print the exact target number.",
  "ruleFail_prints_bool": "Your program must print the requested boolean value.",
  "ruleFail_prints_in_order": "Print both values in the exact order shown in the goal.",
  "ruleFail_min_prints": "Add more print statements to meet the lesson goal.",
  "ruleFail_has_node": "Use a conditional or loop block for this lesson.",
  "ruleFail_min_nodes": "Include multiple conditional blocks as requested.",
  "ruleFail_has_else": "Add an else branch to handle the alternative path.",
  "ruleFail_nested_if": "Put an if condition inside another if block.",
  "ruleFail_test_token": "Use the specified boolean value inside the condition test.",
  "ruleFail_test_compares": "Use a comparison operator (like > or ==) inside the condition.",
  "ruleFail_min_functions": "Define at least one reusable dialect function for this lesson.",
  "ruleFail_has_return": "Include a return statement inside your function.",
  "ruleFail_uses_input": "Read interactive input from the user using your dialect input word.",
  "ruleFail_uses_array": "Create or inspect a list using [ ... ], indexing, or list helpers.",
  "lsKidTalkTitle": "01. Make the Robot Speak",
  "lsKidTalkGoal": "Snap the Speak block first, then choose the greeting.",
  "lsKidTalkExp1": "Mental algorithms begin with a clear action in the right order.",
  "lsKidTalkExp2": "First pick the Say block, then snap the greeting word after it.",
  "lsKidTalkHint1": "Tap the Say action card first, then tap the salam greeting card.",
  "lsKidTwiceTitle": "02. Two Steps in Order",
  "lsKidTwiceGoal": "Sequence the steps so salam plays before ahlan.",
  "lsKidTwiceExp1": "An algorithm runs commands one step at a time from first to last.",
  "lsKidTwiceExp2": "Keep the step separator between your two actions.",
  "lsKidTwiceHint1": "Start with Say salam, then the next-step divider, then Say ahlan.",
  "lsKidDoorTitle": "03. The Open Logic Door",
  "lsKidDoorGoal": "Build an If-Open path so the robot says salam.",
  "lsKidDoorExp1": "A decision checks whether a magic door is open or closed.",
  "lsKidDoorExp2": "Because the door is open, the action inside the path runs.",
  "lsKidDoorHint1": "Start with the If-Open gate, place Say salam inside, then close the step.",
  "lsKidSunRainTitle": "04. Sun or Rain Path",
  "lsKidSunRainGoal": "Use a closed first gate and an Else path so rain appears.",
  "lsKidSunRainExp1": "When the first gate is closed, logic moves straight to the Else path.",
  "lsKidSunRainExp2": "Else guarantees a smart backup plan always runs.",
  "lsKidSunRainHint1": "Put the closed first gate first, then the Else path, then the rain step.",
  "lsKidAskTitle": "05. Ask & Answer",
  "lsKidAskGoal": "Arrange the Ask block to read a name and greet it.",
  "lsKidAskExp1": "Programs can ask the learner a question and remember the reply.",
  "lsKidAskExp2": "Use input inside print so your greeting uses the answer.",
  "lsKidAskHint1": "Place the Ask card before the greeting step.",
  "lsKidBasketTitle": "06. Magic Treat Basket",
  "lsKidBasketGoal": "Create a basket list of treats and count how many items it holds.",
  "lsKidBasketExp1": "Lists store multiple treats together inside square brackets [ ... ].",
  "lsKidBasketExp2": "Your length command counts every treat inside the basket.",
  "lsKidBasketHint1": "Create the basket variable first, then print its length.",
  "lsBgPrintTitle": "01. Print Hello",
  "lsBgPrintGoal": 'Write a statement that prints "salam".',
  "lsBgPrintExp1": 'Strings of text are wrapped in double quotes like "salam".',
  "lsBgPrintExp2": "Pass the text inside parentheses right after your dialect print keyword.",
  "lsBgPrintHint1": "Make sure the text inside quotes spells salam exactly.",
  "lsBgPrintHint2": "Do not forget closing quotes and closing parentheses.",
  "lsBgTwoTitle": "02. Sequential Lines",
  "lsBgTwoGoal": 'Print "salam" on line 1 and "ahlan" on line 2.',
  "lsBgTwoExp1": "Each statement on its own line executes strictly in sequence.",
  "lsBgTwoExp2": "This forms the backbone of every algorithm.",
  "lsBgTwoHint1": 'Put "salam" first, then "ahlan" on the next line.',
  "lsBgNumberTitle": "03. Printing Numbers",
  "lsBgNumberGoal": "Print the number 7 without quotes.",
  "lsBgNumberExp1": "Numbers are values directly understood for math\u2014they do not use quotes.",
  "lsBgNumberExp2": "Try passing 7 straight inside the print call.",
  "lsBgNumberHint1": "Write 7 inside the parentheses with no double quotes.",
  "lsBgBoolTitle": "04. True or False",
  "lsBgBoolGoal": "Print the boolean value true using your dialect keyword.",
  "lsBgBoolExp1": "Booleans represent logical truth: true or false.",
  "lsBgBoolExp2": "Your dialect has dedicated words for both true and false.",
  "lsBgBoolHint1": "Replace text with your dialect word for true inside print().",
  "lsBgVarsTitle": "05. Variables & Assignment",
  "lsBgVarsGoal": "Store a greeting in a variable and print it.",
  "lsBgVarsExp1": "Variables give names to values so you can reuse or update them later.",
  "lsBgVarsExp2": "Use your dialect let keyword followed by name = value.",
  "lsBgVarsHint1": "Declare the variable first, then pass its name into print().",
  "lsBgInputTitle": "06. Interactive Input Greeting",
  "lsBgInputGoal": "Ask the user for their name with input() and print it.",
  "lsBgInputExp1": "The input command pauses execution and asks the user for a reply.",
  "lsBgInputExp2": "Store the reply in a variable, then print a greeting with it.",
  "lsBgInputHint1": 'Assign your input("Name?") call to a variable, then print("Salam", variable).',
  "lsBgIfTitle": "07. First Decision (If)",
  "lsBgIfGoal": 'Write an if (true) block that prints "salam".',
  "lsBgIfExp1": "Code inside curly braces { ... } forms a conditional block.",
  "lsBgIfExp2": "When the condition inside ( ) is true, the block executes.",
  "lsBgIfHint1": "Check that both { and } braces match properly.",
  "lsBgElseTitle": "08. Two Paths (If / Else)",
  "lsBgElseGoal": 'Write an if (false) branch and an else branch that prints "no".',
  "lsBgElseExp1": "Combine if with else to cover both outcomes of a decision.",
  "lsBgElseExp2": "Use false in the test so execution flows into the else branch.",
  "lsBgElseHint1": 'Ensure the else branch prints "no".',
  "lsBgCompareTitle": "09. Comparing Numbers",
  "lsBgCompareGoal": 'Use a comparison (such as 10 > 3) inside an if condition to print "salam".',
  "lsBgCompareExp1": "Operators like >, <, == compare two values and return true or false.",
  "lsBgCompareExp2": "This lets programs make smart data-driven choices.",
  "lsBgCompareHint1": "Write (10 > 3) inside the if parentheses.",
  "lsBgWhileTitle": "10. Counting Loops (While)",
  "lsBgWhileGoal": "Count from 0 up to 2 using a while loop.",
  "lsBgWhileExp1": "A counter variable grows on each loop step until the condition becomes false.",
  "lsBgWhileExp2": "Always update the counter inside the loop body so it finishes cleanly.",
  "lsBgWhileHint1": "Declare i = 0, check while (i < 3), print i, and increment i = i + 1.",
  "lsBgForTitle": "11. Range Loops (For)",
  "lsBgForGoal": "Loop over the range 1..3 using your dialect for keyword.",
  "lsBgForExp1": "Range loops let you step from start to end without a manual counter.",
  "lsBgForExp2": "Write for (i : 1..3) { ... } to run cleanly across 1, 2, and 3.",
  "lsBgForHint1": "Use i : 1..3 inside your for loop header.",
  "lsBgListTitle": "12. Lists & Basket Length",
  "lsBgListGoal": "Create a list, push a new item, and print its length.",
  "lsBgListExp1": "Arrays hold an ordered sequence inside [ ... ] brackets.",
  "lsBgListExp2": "Use push to add elements and len to check the total size.",
  "lsBgListHint1": "Declare a list variable, call push(list, 30), and print len(list).",
  "lsPrTwoIfsTitle": "01. Chained Independent Checks",
  "lsPrTwoIfsGoal": 'Write two if statements (one true, one false) printing "salam" and "ahlan" branches.',
  "lsPrTwoIfsExp1": "Sequential independent if blocks evaluate separately.",
  "lsPrTwoIfsExp2": "Practice keeping multiple control structures clean and readable.",
  "lsPrTwoIfsHint1": 'Create one if with true ("salam") and another if with false ("ahlan").',
  "lsPrNestedTitle": "02. Nested Decision Logic",
  "lsPrNestedGoal": 'Nest an if/else inside an outer if block so the inner else prints "b".',
  "lsPrNestedExp1": "Conditions can live inside other conditions to model layered logic.",
  "lsPrNestedExp2": "Keep indentation clear so matching braces stay easy to verify.",
  "lsPrNestedHint1": 'Put if (false) { print("a") } else { print("b") } inside an outer if (true).',
  "lsPrWhileTitle": "03. Controlled Loop Guard",
  "lsPrWhileGoal": 'Build a while (false) block containing print("salam") to practice safe loop structure.',
  "lsPrWhileExp1": "A while loop checks its condition before entering the body.",
  "lsPrWhileExp2": "Dialects that provide a while keyword unlock this challenge automatically.",
  "lsPrWhileHint1": "Install the Full Dialect Pack if your dialect does not yet include while.",
  "lsPrFuncTitle": "04. Reusable Functions",
  "lsPrFuncGoal": "Define a dialect function with a parameter and call it twice.",
  "lsPrFuncExp1": "Functions package reusable steps under a clean name and accept parameters.",
  "lsPrFuncExp2": 'Calling greet("Maghreb") runs the function body with that argument.',
  "lsPrFuncHint1": "Declare the function with fn, then invoke it with parentheses.",
  "lsPrReturnTitle": "05. Functions with Return",
  "lsPrReturnGoal": "Write a function that returns a * b and print the result of calling it.",
  "lsPrReturnExp1": "The return keyword sends a computed value back to the caller.",
  "lsPrReturnExp2": "Functions with return can be nested directly inside expressions and print().",
  "lsPrReturnHint1": "End your function body with return a * b and pass the call to print().",
  "lsPrArraysTitle": "06. Collections & Arrays",
  "lsPrArraysGoal": "Create a list, push an element, read by index, and print its length.",
  "lsPrArraysExp1": "Square brackets [0] access the first element cleanly by index.",
  "lsPrArraysExp2": "You can append dynamically using your dialect push helper.",
  "lsPrArraysHint1": "Combine list creation, push(), indexing, and len() in one script.",
  "lsPrForEachTitle": "07. Iterating Over Lists",
  "lsPrForEachGoal": "Use a for-each loop to print every item inside an array.",
  "lsPrForEachExp1": "Use for (item : myList) { ... } to visit each list item in order.",
  "lsPrForEachExp2": "For-each iteration avoids off-by-one index bugs automatically.",
  "lsPrForEachHint1": "Iterate your list variable inside a for (...) block and print the item.",
  "lsPrForSumTitle": "08. Range Accumulator",
  "lsPrForSumGoal": "Sum numbers from 1 to 4 inside a for range loop and print the total.",
  "lsPrForSumExp1": "Accumulators track running totals in a variable declared before the loop.",
  "lsPrForSumExp2": "Add the loop variable on every pass and print once after the loop.",
  "lsPrForSumHint1": "Start total = 0, then update total = total + i inside for (i : 1..4).",
  "lsPrFnListTitle": "09. Functions & Lists Together",
  "lsPrFnListGoal": "Write a function returning the length of a list passed to it.",
  "lsPrFnListExp1": "Arrays can be passed as arguments just like numbers or strings.",
  "lsPrFnListExp2": "Calling len(arr) inside your function returns the live count.",
  "lsPrFnListHint1": "Pass your array variable into countBag(bag) and print the returned number.",
  "lsPrInputGuardTitle": "10. Input Validation Guard",
  "lsPrInputGuardGoal": "Read input, check a numeric threshold with if/else, and print feedback.",
  "lsPrInputGuardExp1": "Combining input() with if/else protects programs against unexpected values.",
  "lsPrInputGuardExp2": "Handle both passing and fallback outcomes cleanly.",
  "lsPrInputGuardHint1": 'Read score = input("Score?"), then branch with >= 10 and else.',
  "lsPrFnComposeTitle": "11. Composing Functions",
  "lsPrFnComposeGoal": "Define two functions where the second composes calls to the first.",
  "lsPrFnComposeExp1": "Breaking big problems into helper functions keeps algorithms modular.",
  "lsPrFnComposeExp2": "Track helper calls inside the Call Stack view in Developer Tools.",
  "lsPrFnComposeHint1": "Define square(n) and sumSq(x, y) returning square(x) + square(y).",
  "lsPrErrorsTitle": "12. Defensive Bounds Check",
  "lsPrErrorsGoal": "Check list length with len() before reading an element by index.",
  "lsPrErrorsExp1": "Checking bounds prevents out-of-range index errors at runtime.",
  "lsPrErrorsExp2": "Provide a safe else message when the collection is too short.",
  "lsPrErrorsHint1": "Check if (len(items) > 1) before reading items[1].",
  "reviewAgain": "Revize ank\xF2",
  "cardLabel": "Kat",
  "closeBtn": "F\xE8men",
  "lessonRoadmapTitle": "Kat Pwogresyon (30 Leson)",
  "lessonRoadmapSummary": "Klike sou nenp\xF2t leson pou ale dir\xE8kteman ladan l.",
  "lessonStageReady": "Pare",
  "lessonStageCompleted": "Fini",
  "lessonStageLocked": "F\xE8men",
  "lessonStagePlanned": "Pwochen",
  "listenLessonAudio": "Koute odyo",
  "startReviewSession": "Sesyon Revizyon",
  "stopReviewSession": "Soti nan Revizyon",
  "reviewSessionTitle": "Revize Leson ou Fini yo",
  "reviewCardProgress": "Kat",
  "reviewNext": "Pwochen Leson",
  "reviewMastered": "Metrize",
  "reviewMasteredCount": "Revize nan sesyon sa a",
  "noCompletedForReview": "Fini omwen yon leson pou louvri Sesyon Revizyon ou a.",
  "showSolutionBtn": "Montre repons lan",
  "kidVisualSpeak": "Di",
  "kidVisualDoorOpen": "P\xF2t Louvri",
  "kidVisualDoorClosed": "L\xF2t Chemen",
  "kidVisualLoop": "Repete",
  "practicePronunciationLabel": "Pratik Pwononsiyasyon",
  "listenSlow": "Dousman (0.65\xD7)",
  "listenNormal": "N\xF2mal",
  "quizPredictOutputPrompt": "Ki sa leson sa a pral enprime?",
  "quizFillKeywordPrompt": "Chwazi mo kle ki manke nan k\xF2d la:",
  "quizScoreLabel": "N\xF2t Egzamen",
  "quizRestartBtn": "Nouvo Egzamen",
  "packReadyCountLabel": "pare nan pake a",
  "quizCodeChallengePrompt": "Korije oswa ekri k\xF2d dyal\xE8k la pou mot\xE8 a verifye sa ou sonje:",
  "achievementsShelfTitle": "Reyisit Aprantisaj",
  "achievementsEarnedSummary": "debloke",
  "achievementUnlockedBannerTitle": "Nouvo badj debloke",
  "achievementDismissBtn": "F\xE8men",
  "achievementLockedLabel": "F\xE8men",
  "achievementEarnedOnLabel": "Genyen",
  "achFirstSparkTitle": "Premye Etens\xE8l",
  "achFirstSparkDesc": "Verifye premye leson gide w nan nenp\xF2t dyal\xE8k Magr\xE8b.",
  "achDialectExplorerTitle": "Eksplorat\xE8 Dyal\xE8k",
  "achDialectExplorerDesc": "Fini omwen 1 leson nan 2 dyal\xE8k diferan oswa plis.",
  "achBranchNavigatorTitle": "Navigat\xE8 Kondisyon",
  "achBranchNavigatorDesc": "Fini 2 leson lojik kondisyon\xE8l (si / sinon).",
  "achSyntaxMasterTitle": "M\xE8t Sentaks",
  "achSyntaxMasterDesc": "Metrize tout 3 leson Pro sou kondisyon ak bouk yo.",
  "achReviewChampionTitle": "Chanpyon Revizyon",
  "achReviewChampionDesc": "Reyisi 3 defi Sesyon Revizyon verifye pa BaydaEngine.",
  "achMaghrebPolyglotTitle": "Poligl\xF2t Magr\xE8b",
  "achMaghrebPolyglotDesc": "Fini 10 leson verifye sou pwofil inifye ou.",
  "showBadgesBtn": "W\xE8 badj",
  "hideBadgesBtn": "Kache badj",
  "showMapBtn": "Chemen",
  "openLessonBtn": "Louvri",
  "closeLessonBtn": "F\xE8men",
  "hideDetailsBtn": "Kache",
  "lessonNextBtn": "Pwochen Leson",
  "speakSnippetBtn": "Speak Snippet",
  "stopSpeakingBtn": "Stop Speech",
  "kidTapTileHint": "Peze yon kat pou chwazi sa wobo a ap di",
  "kidVisualCounter": "Score Box",
  "kidEndStepWord": "End step",
  "kidVarWord": "Counter",
  "kidLessonVisualArrangeHint": "Tap the visual logic blocks in order to build the mental algorithm:",
  "kidVisualMove": "Move",
  "kidVisualJump": "Jump",
  "kidVisualTurn": "Turn",
  "kidQuizPickLogicPrompt": "Pick the matching visual logic sequence",
  "kidLessonEasy": "Starter \xB7 4\u20135",
  "kidLessonMedium": "Explorer \xB7 6\u20137",
  "kidLessonChallenge": "Challenge \xB7 8\u20139",
  "kidLessonFilterAge": "For My Age",
  "kidLessonFilterAll": "All Levels",
  "consoleInputPromptLabel": "Antre:",
  "consoleInputPlaceholder": "Ekri repons ou epi voye...",
  "consoleInputSubmitBtn": "Voye",
  "consoleInputResetBtn": "Rek\xF2manse",
  "kidVisualAsk": "Mande",
  "kidVisualList": "Panye",
  "kidVisualRecipe": "Res\xE8t",
  "execWarnTitle": "Av\xE8tisman resous (75%+)",
  "execWarnSteps": "Etap ekzekisyon yo depase 75% limit la \u2014 tcheke bouk ou yo.",
  "execWarnMemory": "Memwa anviw\xF2nman an depase 75% kapasite sekirite a.",
  "execWarnArray": "Gwos\xE8 lis la depase 75% limit otorize a.",
  "execWarnRecursion": "Pwofond\xE8 ap\xE8l fonksyon yo depase 75% limit la.",
  "execWarnOutput": "Liy rezilta yo depase 75% limit la."
};
var LESSON_IT = {
  ...LESSON_EN,
  "loadSample": "Esempio",
  "modeKid": "Bambini",
  "modeBeginner": "Principiante",
  "modePro": "Esperto",
  "closeBtn": "Chiudi",
  "lessonNextBtn": "Prossima lezione",
  "kidTapTileHint": "Tocca una tessera per scegliere cosa dice il robot",
  "consoleInputPlaceholder": "Scrivi risposta e invia...",
  "consoleInputSubmitBtn": "Invia",
  "consoleInputResetBtn": "Reimposta",
  "kidVisualAsk": "Chiedi",
  "kidVisualList": "Cesto",
  "kidVisualRecipe": "Ricetta",
  "execWarnTitle": "Avviso risorse (75%+)",
  "execWarnSteps": "I passaggi di esecuzione hanno superato il 75% del limite \u2014 controlla i cicli.",
  "execWarnMemory": "La memoria della sandbox ha superato il 75% del limite consentito.",
  "execWarnArray": "La dimensione della lista ha superato il 75% del limite.",
  "execWarnRecursion": "La profondit\xE0 della ricorsione ha superato il 75% del limite.",
  "execWarnOutput": "Le righe di output hanno superato il 75% del limite."
};
var LESSON_DE = {
  ...LESSON_EN,
  "loadSample": "Beispiel",
  "modeKid": "Kindermodus",
  "modeBeginner": "Anf\xE4nger",
  "modePro": "Profi",
  "closeBtn": "Schlie\xDFen",
  "lessonNextBtn": "N\xE4chste Lektion",
  "kidTapTileHint": "Tippe auf eine Karte, um auszuw\xE4hlen, was der Roboter sagt",
  "consoleInputPromptLabel": "Eingabe:",
  "consoleInputPlaceholder": "Antwort eingeben...",
  "consoleInputSubmitBtn": "Senden",
  "consoleInputResetBtn": "Zur\xFCcksetzen",
  "kidVisualAsk": "Fragen",
  "kidVisualList": "Korb",
  "kidVisualRecipe": "Rezept",
  "execWarnTitle": "Ressourcenwarnung (75%+)",
  "execWarnSteps": "Ausf\xFChrungsschritte \xFCber 75 % des Limits \u2014 Schleifenbedingungen pr\xFCfen.",
  "execWarnMemory": "Sandbox-Speicherverbrauch liegt \xFCber 75 % des Limits.",
  "execWarnArray": "Listenl\xE4nge liegt \xFCber 75 % des erlaubten Limits.",
  "execWarnRecursion": "Rekursionstiefe liegt \xFCber 75 % des Sicherheitslimits.",
  "execWarnOutput": "Ausgabezeilen \xFCberschreiten 75 % des Limits."
};
var LESSON_NL = {
  ...LESSON_EN,
  "loadSample": "Voorbeeld",
  "modeKid": "Kindmodus",
  "modePro": "Gevorderd",
  "closeBtn": "Sluiten",
  "lessonNextBtn": "Volgende les",
  "kidTapTileHint": "Tik op een tegel om te kiezen wat de robot zegt",
  "consoleInputPromptLabel": "Invoer:",
  "consoleInputPlaceholder": "Typ antwoord en verstuur...",
  "consoleInputSubmitBtn": "Verzenden",
  "consoleInputResetBtn": "Herstellen",
  "kidVisualAsk": "Vragen",
  "kidVisualList": "Mandje",
  "kidVisualRecipe": "Recept",
  "execWarnTitle": "Bronwaarschuwing (75%+)",
  "execWarnSteps": "Uitvoeringsstappen boven 75% van de limiet \u2014 controleer je lussen.",
  "execWarnMemory": "Sandbox-geheugengebruik boven 75% van het maximum.",
  "execWarnArray": "Lijstlengte overschrijdt 75% van het toegestane maximum.",
  "execWarnRecursion": "Recursiediepte overschrijdt 75% van de limiet.",
  "execWarnOutput": "Uitvoerregels overschrijden 75% van de limiet."
};
var LESSON_UI_COPY = {
  ar: LESSON_AR,
  en: LESSON_EN,
  fr: LESSON_FR,
  es: LESSON_ES,
  "pt-BR": LESSON_PT_BR,
  it: LESSON_IT,
  de: LESSON_DE,
  nl: LESSON_NL,
  arn: LESSON_ARN,
  ht: LESSON_HT
};
function isLessonUiLang(val) {
  return Boolean(val && LESSON_UI_LANGUAGES.some((l) => l.code === val));
}
function getLessonUiStrings(uiLang = "en", overrides) {
  const base = LESSON_UI_COPY[uiLang] ?? LESSON_UI_COPY.en;
  if (!overrides) return base;
  return { ...base, ...overrides };
}
function resolveLessonCopy(lesson, uiLang = "en", overrides) {
  const dict = getLessonUiStrings(uiLang, overrides);
  return {
    title: dict[lesson.titleKey] ?? lesson.titleKey,
    goal: dict[lesson.goalKey] ?? lesson.goalKey,
    explains: lesson.explainKeys.map((k) => dict[k] ?? k),
    hints: lesson.hintKeys.map((k) => dict[k] ?? k)
  };
}
function formatLessonVerdictMessage(verdict, uiLang = "en", overrides) {
  const dict = getLessonUiStrings(uiLang, overrides);
  const dictRecord = dict;
  if (verdict.status === "ok") {
    return dict.lessonPassed;
  }
  if (verdict.status === "wrong") {
    const key = `ruleFail_${verdict.failed}`;
    return dictRecord[key] ?? dict.lessonCheckFailed;
  }
  if (verdict.status === "awaiting_input") {
    return `${dict.consoleInputPromptLabel} ${verdict.prompt}`;
  }
  if (verdict.status === "consent_required") {
    return verdict.message;
  }
  return verdict.message;
}
function resolveAchievementCopy(def, uiLang = "en", overrides) {
  const dict = getLessonUiStrings(uiLang, overrides);
  return {
    id: def.id,
    title: dict[def.titleKey] ?? def.titleKey,
    description: dict[def.descKey] ?? def.descKey,
    target: def.target
  };
}

// src/lessons/session.ts
function createEmptyReviewSession() {
  return {
    active: false,
    quizzes: [],
    index: 0,
    pick: null,
    codeInput: "",
    evaluation: null,
    score: 0,
    answeredCount: 0,
    attemptedIds: [],
    passedIds: []
  };
}
function sanitizeCompletedMap(raw) {
  if (!raw || !isPlainObject(raw)) return {};
  const clean = {};
  for (const [k, v] of Object.entries(raw).slice(0, 40)) {
    if (/^[a-z0-9][a-z0-9-]{1,39}$/i.test(k) && Array.isArray(v)) {
      clean[k] = Array.from(
        new Set(
          v.filter((item) => typeof item === "string" && item.length > 0 && item.length <= 64)
        )
      ).slice(0, 200);
    }
  }
  return clean;
}
function createLessonSession(options = {}) {
  const catalog = options.lessons ?? LESSONS_CURRICULUM;
  const initialMode = options.mode ?? "beginner";
  const initialStars = Math.max(0, options.kidStars ?? 0);
  const initialBand = options.kidAgeBand ?? "auto";
  const initialCompleted = sanitizeCompletedMap(options.completedByDialect);
  const initialProfile = options.profile ?? createEmptyLearnerProfile();
  const initialEval = evaluateAchievements(initialCompleted, initialProfile);
  let state = {
    mode: initialMode,
    kidAgeBand: initialBand,
    kidStars: initialStars,
    resolvedKidBand: initialMode === "kid" ? resolveKidTier(initialStars, initialBand).band : null,
    kidLessonFilter: options.kidLessonFilter ?? "age",
    pack: options.pack ?? STARTER_DIALECT_PACKS[0],
    uiLang: options.uiLang ?? "en",
    hasConsent: options.hasConsent ?? true,
    enforceConsent: options.enforceConsent ?? false,
    target: options.target ?? "js",
    includeTrace: options.includeTrace ?? false,
    completedByDialect: initialCompleted,
    profile: initialEval.updatedProfile,
    achievementItems: initialEval.items,
    recentUnlockedBadges: [],
    inputsByLesson: {},
    arrangeByLesson: {},
    hintCounts: {},
    verdicts: {},
    promptInputsByLesson: {},
    pendingPromptByLesson: {},
    reviewSession: createEmptyReviewSession()
  };
  const listeners = /* @__PURE__ */ new Set();
  const emit = () => {
    for (const listener of listeners) {
      listener(state);
    }
  };
  const getModeLessons = () => catalog.filter((l) => l.mode === state.mode).sort((a, b) => a.order - b.order);
  const getVisibleLessons = () => {
    const modeLessons = getModeLessons();
    if (state.mode === "kid" && state.resolvedKidBand && state.kidLessonFilter === "age") {
      return filterKidLessonsForBand(modeLessons, state.resolvedKidBand);
    }
    return modeLessons;
  };
  const buildKidLabels = () => {
    const dict = getLessonUiStrings(state.uiLang, options.copyOverrides);
    return {
      sayWord: dict.kidVisualSpeak,
      ifWord: dict.kidVisualDoorOpen,
      elseWord: dict.kidVisualDoorClosed,
      loopWord: dict.kidVisualLoop,
      varWord: dict.kidVarWord,
      trueWord: "\u2705",
      falseWord: "\u274C",
      endStepWord: dict.kidEndStepWord,
      askWord: dict.kidVisualAsk,
      listWord: dict.kidVisualList,
      recipeWord: dict.kidVisualRecipe
    };
  };
  const markLessonCompleted = (lessonId) => {
    const currentList = state.completedByDialect[state.pack.id] ?? [];
    if (currentList.includes(lessonId)) return;
    const nextCompleted = {
      ...state.completedByDialect,
      [state.pack.id]: [...currentList, lessonId]
    };
    const evalRes = evaluateAchievements(nextCompleted, state.profile);
    const nextStars = state.mode === "kid" ? state.kidStars + 1 : state.kidStars;
    state = {
      ...state,
      completedByDialect: nextCompleted,
      kidStars: nextStars,
      resolvedKidBand: state.mode === "kid" ? resolveKidTier(nextStars, state.kidAgeBand).band : null,
      profile: evalRes.updatedProfile,
      achievementItems: evalRes.items,
      recentUnlockedBadges: evalRes.newlyUnlocked.length > 0 ? Array.from(/* @__PURE__ */ new Set([...state.recentUnlockedBadges, ...evalRes.newlyUnlocked])) : state.recentUnlockedBadges
    };
  };
  const getHydratedLesson = (lessonId) => {
    const lesson = catalog.find((l) => l.id === lessonId);
    if (!lesson) return null;
    const missingConcepts = missingConceptsForLesson(lesson, state.pack.keywords);
    const isLocked = lesson.status === "planned" || missingConcepts.length > 0;
    const completedForPack = state.completedByDialect[state.pack.id] ?? [];
    const isCompleted = completedForPack.includes(lesson.id);
    const isConsentBlocked = Boolean(state.enforceConsent && state.pack.requiresConsent && !state.hasConsent);
    const starterCode = lesson.template ? fillSlots(lesson.template, state.pack.keywords).text : "";
    const copy = resolveLessonCopy(lesson, state.uiLang, options.copyOverrides);
    const verdict = state.verdicts[lesson.id];
    const verdictMessage = verdict ? formatLessonVerdictMessage(verdict, state.uiLang, options.copyOverrides) : void 0;
    let shuffledCards;
    let visualCards;
    if (lesson.kind === "arrange" && lesson.cards && lesson.cards.length > 0) {
      const { shuffled } = getShuffledLessonCards(lesson, state.pack);
      shuffledCards = shuffled;
      const labels = buildKidLabels();
      visualCards = shuffled.map((item) => ({
        ...formatDialectCardForKids(item.text, state.pack, labels),
        index: item.index,
        rawText: item.text
      }));
    }
    return {
      lesson,
      copy,
      starterCode,
      missingConcepts,
      isLocked,
      isCompleted,
      isConsentBlocked,
      shuffledCards,
      visualCards,
      kidTier: lesson.mode === "kid" ? resolveKidLessonTier(lesson) : void 0,
      companionGuide: lesson.mode === "kid" ? buildKidLessonCompanionGuide(lesson, state.pack) : void 0,
      pronunciationClips: buildLessonPronunciationClips(lesson, state.pack),
      currentInput: state.inputsByLesson[lesson.id] ?? "",
      selectedCardIndices: state.arrangeByLesson[lesson.id] ?? [],
      revealedHints: state.hintCounts[lesson.id] ?? 0,
      verdict,
      verdictMessage,
      pendingPrompt: state.pendingPromptByLesson[lesson.id] ?? null
    };
  };
  const runVerification = (lesson, source, inputsOverride) => {
    const useInteractive = inputsOverride !== void 0 || lesson.requires.includes("input");
    const result = verifyLessonSolution(source, state.pack, lesson, {
      inputs: inputsOverride ?? state.promptInputsByLesson[lesson.id],
      interactiveInput: useInteractive,
      enforceConsent: state.enforceConsent,
      hasConsent: state.hasConsent,
      target: state.target,
      includeTrace: state.includeTrace
    });
    if (result.status === "awaiting_input") {
      state = {
        ...state,
        verdicts: { ...state.verdicts, [lesson.id]: result },
        pendingPromptByLesson: {
          ...state.pendingPromptByLesson,
          [lesson.id]: result.prompt
        }
      };
      emit();
      return result;
    }
    state = {
      ...state,
      verdicts: { ...state.verdicts, [lesson.id]: result },
      pendingPromptByLesson: {
        ...state.pendingPromptByLesson,
        [lesson.id]: null
      }
    };
    if (result.status === "ok") {
      markLessonCompleted(lesson.id);
    }
    emit();
    return result;
  };
  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setMode: (mode) => {
      state = {
        ...state,
        mode,
        resolvedKidBand: mode === "kid" ? resolveKidTier(state.kidStars, state.kidAgeBand).band : null,
        reviewSession: createEmptyReviewSession()
      };
      emit();
    },
    setDialect: (pack) => {
      state = {
        ...state,
        pack,
        arrangeByLesson: {},
        verdicts: {},
        promptInputsByLesson: {},
        pendingPromptByLesson: {},
        reviewSession: createEmptyReviewSession()
      };
      emit();
    },
    setDialectById: (dialectId, useFullPack = false) => {
      const pack = useFullPack ? getFullDialectById(dialectId) : getDialectById(dialectId);
      state = {
        ...state,
        pack,
        arrangeByLesson: {},
        verdicts: {},
        promptInputsByLesson: {},
        pendingPromptByLesson: {},
        reviewSession: createEmptyReviewSession()
      };
      emit();
    },
    setUiLang: (uiLang) => {
      state = { ...state, uiLang };
      emit();
    },
    setKidAgeBand: (kidAgeBand) => {
      state = {
        ...state,
        kidAgeBand,
        resolvedKidBand: state.mode === "kid" ? resolveKidTier(state.kidStars, kidAgeBand).band : null
      };
      emit();
    },
    setKidStars: (stars) => {
      const nextStars = Math.max(0, Math.floor(stars));
      state = {
        ...state,
        kidStars: nextStars,
        resolvedKidBand: state.mode === "kid" ? resolveKidTier(nextStars, state.kidAgeBand).band : null
      };
      emit();
    },
    setKidLessonFilter: (kidLessonFilter) => {
      state = { ...state, kidLessonFilter };
      emit();
    },
    setConsent: (hasConsent) => {
      state = { ...state, hasConsent };
      emit();
    },
    setEnforceConsent: (enforceConsent) => {
      state = { ...state, enforceConsent };
      emit();
    },
    getVisibleLessons,
    getHydratedLesson,
    getHydratedLessons: () => getVisibleLessons().map((l) => getHydratedLesson(l.id)).filter((item) => item !== null),
    setLessonCode: (lessonId, code) => {
      const sanitized = stripTrojanAndControlChars(code, { allowNewlines: true }).cleaned;
      state = {
        ...state,
        inputsByLesson: { ...state.inputsByLesson, [lessonId]: sanitized },
        pendingPromptByLesson: { ...state.pendingPromptByLesson, [lessonId]: null }
      };
      emit();
    },
    loadSampleIntoLesson: (lessonId) => {
      const lesson = catalog.find((l) => l.id === lessonId);
      if (!lesson?.template) return;
      const filled = fillSlots(lesson.template, state.pack.keywords).text;
      state = {
        ...state,
        inputsByLesson: { ...state.inputsByLesson, [lessonId]: filled },
        pendingPromptByLesson: { ...state.pendingPromptByLesson, [lessonId]: null }
      };
      emit();
    },
    toggleArrangeCard: (lessonId, cardIndex) => {
      const prev = state.arrangeByLesson[lessonId] ?? [];
      const next = prev.includes(cardIndex) ? prev.filter((i) => i !== cardIndex) : [...prev, cardIndex];
      state = {
        ...state,
        arrangeByLesson: { ...state.arrangeByLesson, [lessonId]: next }
      };
      emit();
    },
    resetArrange: (lessonId) => {
      state = {
        ...state,
        arrangeByLesson: { ...state.arrangeByLesson, [lessonId]: [] },
        promptInputsByLesson: { ...state.promptInputsByLesson, [lessonId]: [] },
        pendingPromptByLesson: { ...state.pendingPromptByLesson, [lessonId]: null }
      };
      emit();
    },
    revealHint: (lessonId) => {
      const lesson = catalog.find((l) => l.id === lessonId);
      const maxHints = lesson?.hintKeys.length ?? 0;
      const cur = state.hintCounts[lessonId] ?? 0;
      state = {
        ...state,
        hintCounts: { ...state.hintCounts, [lessonId]: Math.min(maxHints, cur + 1) }
      };
      emit();
    },
    submitInputPrompt: (lessonId, value) => {
      const lesson = catalog.find((l) => l.id === lessonId);
      if (!lesson) return null;
      const cleanValue = stripTrojanAndControlChars(value, { allowNewlines: false }).cleaned;
      const nextInputs = [...state.promptInputsByLesson[lessonId] ?? [], cleanValue];
      state = {
        ...state,
        promptInputsByLesson: { ...state.promptInputsByLesson, [lessonId]: nextInputs }
      };
      const source = lesson.kind === "arrange" ? (() => {
        const cards = (lesson.cards ?? []).map((c) => fillSlots(c, state.pack.keywords).text);
        return (state.arrangeByLesson[lessonId] ?? []).map((i) => cards[i] ?? "").join("");
      })() : state.inputsByLesson[lessonId] ?? "";
      return runVerification(lesson, source, nextInputs);
    },
    resetPromptInputs: (lessonId) => {
      state = {
        ...state,
        promptInputsByLesson: { ...state.promptInputsByLesson, [lessonId]: [] },
        pendingPromptByLesson: { ...state.pendingPromptByLesson, [lessonId]: null }
      };
      emit();
    },
    verifyLesson: (lessonId) => {
      const lesson = catalog.find((l) => l.id === lessonId);
      if (!lesson) return null;
      const source = lesson.kind === "arrange" ? (() => {
        const cards = (lesson.cards ?? []).map((c) => fillSlots(c, state.pack.keywords).text);
        return (state.arrangeByLesson[lessonId] ?? []).map((i) => cards[i] ?? "").join("");
      })() : state.inputsByLesson[lessonId] ?? "";
      return runVerification(lesson, source);
    },
    startReview: () => {
      const completedForPack = state.completedByDialect[state.pack.id] ?? [];
      const quizzes = generateLessonReviewQuizzes(completedForPack, getModeLessons(), state.pack);
      state = {
        ...state,
        reviewSession: {
          active: true,
          quizzes,
          index: 0,
          pick: null,
          codeInput: quizzes[0]?.starterBrokenCode ?? "",
          evaluation: null,
          score: 0,
          answeredCount: 0,
          attemptedIds: [],
          passedIds: []
        }
      };
      emit();
    },
    setReviewCodeInput: (code) => {
      state = {
        ...state,
        reviewSession: {
          ...state.reviewSession,
          codeInput: stripTrojanAndControlChars(code, { allowNewlines: true }).cleaned
        }
      };
      emit();
    },
    answerReview: (submission) => {
      const rs = state.reviewSession;
      if (!rs.active || rs.quizzes.length === 0) return null;
      const curQuiz = rs.quizzes[rs.index % rs.quizzes.length];
      const evalResult = verifyReviewQuizChallenge(curQuiz, submission, state.pack);
      const attemptedIds = rs.attemptedIds.includes(curQuiz.id) ? rs.attemptedIds : [...rs.attemptedIds, curQuiz.id];
      const answeredCount = rs.attemptedIds.includes(curQuiz.id) ? rs.answeredCount : rs.answeredCount + 1;
      let passedIds = rs.passedIds;
      let score = rs.score;
      let nextProfile = state.profile;
      let nextItems = state.achievementItems;
      let nextRecent = state.recentUnlockedBadges;
      if (evalResult.ok && !rs.passedIds.includes(curQuiz.id)) {
        passedIds = [...rs.passedIds, curQuiz.id];
        score += 1;
        const incrementedProfile = {
          ...state.profile,
          reviewPasses: state.profile.reviewPasses + 1
        };
        const achEval = evaluateAchievements(state.completedByDialect, incrementedProfile);
        nextProfile = achEval.updatedProfile;
        nextItems = achEval.items;
        if (achEval.newlyUnlocked.length > 0) {
          nextRecent = Array.from(/* @__PURE__ */ new Set([...nextRecent, ...achEval.newlyUnlocked]));
        }
      }
      state = {
        ...state,
        profile: nextProfile,
        achievementItems: nextItems,
        recentUnlockedBadges: nextRecent,
        reviewSession: {
          ...rs,
          pick: curQuiz.kind === "code-challenge" && evalResult.ok ? curQuiz.correctOption : submission,
          evaluation: evalResult,
          score,
          answeredCount,
          attemptedIds,
          passedIds
        }
      };
      emit();
      return evalResult;
    },
    nextReview: () => {
      const rs = state.reviewSession;
      if (!rs.active || rs.quizzes.length === 0) return;
      const nextIdx = (rs.index + 1) % rs.quizzes.length;
      state = {
        ...state,
        reviewSession: {
          ...rs,
          index: nextIdx,
          pick: null,
          evaluation: null,
          codeInput: rs.quizzes[nextIdx]?.starterBrokenCode ?? ""
        }
      };
      emit();
    },
    closeReview: () => {
      state = {
        ...state,
        reviewSession: createEmptyReviewSession()
      };
      emit();
    },
    dismissBadge: (id) => {
      state = {
        ...state,
        recentUnlockedBadges: state.recentUnlockedBadges.filter((b) => b !== id)
      };
      emit();
    },
    getProgress: () => computeDialectCurriculumProgress(
      state.completedByDialect[state.pack.id] ?? [],
      getModeLessons(),
      state.pack
    ),
    serializeProgress: () => JSON.stringify({
      version: 1,
      completedByDialect: state.completedByDialect,
      profile: state.profile
    }),
    hydrateProgress: (rawJson) => {
      const parsed = safeJsonParse(rawJson, 128 * 1024);
      if (!parsed.ok || !isPlainObject(parsed.value)) return false;
      const payload = parsed.value;
      const cleanCompleted = sanitizeCompletedMap(
        payload.completedByDialect
      );
      const parsedProfile = payload.profile ? parseLearnerProfile(JSON.stringify(payload.profile)) : createEmptyLearnerProfile();
      const achEval = evaluateAchievements(cleanCompleted, parsedProfile);
      state = {
        ...state,
        completedByDialect: cleanCompleted,
        profile: achEval.updatedProfile,
        achievementItems: achEval.items
      };
      emit();
      return true;
    }
  };
}

// src/lessons/index.ts
function createLessonsToolkit(config = {}) {
  const initialPack = config.pack ?? (config.dialectId ? config.useFullPack ? getFullDialectById(config.dialectId) : getDialectById(config.dialectId) : STARTER_DIALECT_PACKS[0]);
  const uiLang = config.uiLang ?? "en";
  return {
    version: "1.0.0",
    curriculum: LESSONS_CURRICULUM,
    starterDialects: STARTER_DIALECT_PACKS,
    fullDialects: FULL_DIALECT_PACKS,
    engine: BaydaEngine,
    getStrings: (lang = uiLang) => getLessonUiStrings(lang, config.copyOverrides),
    getLessonsForMode: (mode, kidBand, stars = 0) => {
      const modeLessons = LESSONS_CURRICULUM.filter((l) => l.mode === mode).sort(
        (a, b) => a.order - b.order
      );
      if (mode === "kid" && kidBand) {
        const resolved = resolveKidTier(stars, kidBand).band;
        return filterKidLessonsForBand(modeLessons, resolved);
      }
      return modeLessons;
    },
    resolveLesson: (lesson, pack = initialPack, lang = uiLang) => ({
      lesson,
      copy: resolveLessonCopy(lesson, lang, config.copyOverrides),
      starterCode: lesson.template ? fillSlots(lesson.template, pack.keywords).text : "",
      missingConcepts: missingConceptsForLesson(lesson, pack.keywords),
      shuffledCards: lesson.kind === "arrange" ? getShuffledLessonCards(lesson, pack) : void 0,
      kidTier: lesson.mode === "kid" ? resolveKidLessonTier(lesson) : void 0,
      companionGuide: lesson.mode === "kid" ? buildKidLessonCompanionGuide(lesson, pack) : void 0,
      pronunciationClips: buildLessonPronunciationClips(lesson, pack)
    }),
    verifySolution: (source, lesson, pack = initialPack, options) => {
      const result = verifyLessonSolution(source, pack, lesson, {
        inputs: options?.inputs,
        interactiveInput: options?.interactiveInput,
        enforceConsent: config.enforceConsent,
        hasConsent: options?.hasConsent ?? config.hasConsent,
        target: options?.target,
        includeTrace: options?.includeTrace
      });
      return {
        ...result,
        localizedMessage: formatLessonVerdictMessage(
          result,
          options?.uiLang ?? uiLang,
          config.copyOverrides
        )
      };
    },
    createSession: (sessionOpts = {}) => createLessonSession({
      pack: initialPack,
      uiLang,
      enforceConsent: config.enforceConsent,
      hasConsent: config.hasConsent,
      copyOverrides: config.copyOverrides,
      ...sessionOpts
    }),
    evaluateAchievements: (completedByDialect, profile = createEmptyLearnerProfile(), lang = uiLang) => {
      const evalRes = evaluateAchievements(completedByDialect, profile);
      return {
        ...evalRes,
        localizedItems: evalRes.items.map((item) => ({
          ...item,
          ...resolveAchievementCopy(item, lang, config.copyOverrides)
        }))
      };
    },
    generateReviewQuizzes: (completedIds, pack = initialPack, mode) => {
      const subset = mode ? LESSONS_CURRICULUM.filter((l) => l.mode === mode) : LESSONS_CURRICULUM;
      return generateLessonReviewQuizzes(completedIds, subset, pack);
    },
    verifyReviewQuiz: verifyReviewQuizChallenge,
    formatVisualCard: formatDialectCardForKids,
    parseVisualSteps: parseCodeStepsForKids,
    buildAudioPhrase: buildLessonAudioPhrase,
    buildPronunciationClips: buildLessonPronunciationClips,
    compile: translateDialect,
    execute: executeAst,
    trace: traceExecutionAst,
    diagnoseError: diagnoseCompileError,
    resolveDialectPack,
    buildAndVerifyFullPack,
    loadValidatedInstalledPacks,
    validateDialectPack,
    verifyPackIntegrity,
    computeSha256Hex,
    parseLearnerProfile,
    achievementDefinitions: ACHIEVEMENT_DEFINITIONS,
    branchLessonIds: BRANCH_LESSON_IDS,
    proSyntaxLessonIds: PRO_SYNTAX_LESSON_IDS,
    computeProgress: computeDialectCurriculumProgress,
    lessonsUiCopy: LESSON_UI_COPY,
    lessonsUiLanguages: LESSON_UI_LANGUAGES
  };
}
export {
  ACHIEVEMENT_DEFINITIONS,
  BRANCH_LESSON_IDS,
  BaydaEngine,
  FULL_DIALECT_PACKS,
  LESSONS_CURRICULUM,
  LESSON_UI_COPY,
  LESSON_UI_LANGUAGES,
  MAX_ARRAY_LENGTH,
  MAX_CALL_DEPTH,
  MAX_LOOP_ITERATIONS,
  MAX_OUTPUT_LINES,
  MAX_PACK_JSON_BYTES,
  MAX_RUNTIME_BYTES,
  MAX_STRING_LENGTH,
  MAX_TOTAL_STEPS,
  PRO_SYNTAX_LESSON_IDS,
  STARTER_DIALECT_PACKS,
  TARGET_META,
  VALID_TARGETS,
  buildAndVerifyFullPack,
  buildKidLessonCompanionGuide,
  buildKidVoiceCommandHints,
  buildLessonAudioPhrase,
  buildLessonPronunciationClips,
  checkAstRules,
  computeDialectCurriculumProgress,
  computeSha256Hex,
  createEmptyLearnerProfile,
  createLessonSession,
  createLessonsToolkit,
  defaultInputsForLesson,
  detectSpeechLang,
  deterministicShuffleIndices,
  diagnoseCompileError,
  evaluateAchievements,
  executeAst,
  extractSelectedCodeSpeech,
  fillSlots,
  filterKidLessonsForBand,
  findConceptWord,
  formatDialectCardForKids,
  formatLessonVerdictMessage,
  formatSpeechReadableSnippet,
  generateLessonReviewQuizzes,
  getDialectById,
  getFullDialectById,
  getLessonUiStrings,
  getShuffledLessonCards,
  getVoiceRecognitionLang,
  isLessonUiLang,
  isRtlTarget,
  isValidTarget,
  loadValidatedInstalledPacks,
  missingConceptsForLesson,
  parseCodeStepsForKids,
  parseKidVoiceCommand,
  parseLearnerProfile,
  resolveAchievementCopy,
  resolveDialectPack,
  resolveKidLessonTier,
  resolveKidTier,
  resolveLessonCopy,
  stripEmojisForSpeech,
  traceExecutionAst,
  translateDialect,
  uiLangToSpeechTag,
  validateDialectPack,
  verifyLessonSolution,
  verifyLessonSource,
  verifyPackIntegrity,
  verifyReviewQuizChallenge,
  visualForConcept
};
