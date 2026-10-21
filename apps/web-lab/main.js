// core/lexer.ts
var WORD_REGEX = /[\p{L}\p{M}_]/u;
var NUMBER_REGEX = /[0-9]/;
var Lexer = class {
  constructor(input, keywordsMap) {
    this.position = 0;
    this.line = 1;
    this.col = 1;
    this.input = input;
    this.keywords = new Set(Object.keys(keywordsMap));
  }
  currentChar() {
    return this.input[this.position] || "\0";
  }
  advance() {
    if (this.currentChar() === "\n") {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    this.position++;
  }
  skipWhitespace() {
    while (/\s/.test(this.currentChar()) && this.currentChar() !== "\0") {
      this.advance();
    }
  }
  tokenize() {
    const tokens = [];
    while (this.position < this.input.length) {
      this.skipWhitespace();
      if (this.position >= this.input.length) break;
      const char = this.currentChar();
      const startLine = this.line;
      const startCol = this.col;
      if (char === '"' || char === "'") {
        const quote2 = char;
        this.advance();
        let value = "";
        while (this.currentChar() !== quote2 && this.currentChar() !== "\0") {
          value += this.currentChar();
          this.advance();
        }
        if (this.currentChar() === quote2) this.advance();
        tokens.push({ type: "STRING", value, line: startLine, col: startCol });
        continue;
      }
      if (NUMBER_REGEX.test(char)) {
        let j = this.position;
        while (j < this.input.length && NUMBER_REGEX.test(this.input[j])) j++;
        const francoWord = j < this.input.length && WORD_REGEX.test(this.input[j]);
        let value = "";
        if (francoWord) {
          while (WORD_REGEX.test(this.currentChar()) || NUMBER_REGEX.test(this.currentChar())) {
            value += this.currentChar();
            this.advance();
          }
          tokens.push({ type: "IDENT", value, line: startLine, col: startCol });
          continue;
        }
        while (NUMBER_REGEX.test(this.currentChar()) || this.currentChar() === ".") {
          value += this.currentChar();
          this.advance();
        }
        tokens.push({ type: "NUMBER", value, line: startLine, col: startCol });
        continue;
      }
      if (WORD_REGEX.test(char)) {
        let value = "";
        while (WORD_REGEX.test(this.currentChar()) || NUMBER_REGEX.test(this.currentChar())) {
          value += this.currentChar();
          this.advance();
        }
        const type = this.keywords.has(value) ? "KEYWORD" : "IDENT";
        tokens.push({ type, value, line: startLine, col: startCol });
        continue;
      }
      tokens.push({ type: "SYMBOL", value: char, line: startLine, col: startCol });
      this.advance();
    }
    tokens.push({ type: "EOF", value: "", line: this.line, col: this.col });
    return tokens;
  }
};

// core/normalizer.ts
function toMap(keywords) {
  if (!keywords) return {};
  if (keywords instanceof Set) {
    const m = {};
    for (const k of keywords) m[k] = k;
    return m;
  }
  return keywords;
}
function normalize(tokens, keywords = {}) {
  const map = toMap(keywords);
  const phraseKeys = Object.keys(map).filter((k) => /\s/.test(k)).sort((a, b) => b.trim().split(/\s+/).length - a.trim().split(/\s+/).length);
  const out = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === "STRING" || t.type === "NUMBER" || t.type === "SYMBOL" || t.type === "EOF") {
      out.push(t);
      i++;
      continue;
    }
    let matched = false;
    for (const phrase of phraseKeys) {
      const words = phrase.trim().split(/\s+/);
      if (i + words.length > tokens.length) continue;
      let ok = true;
      for (let k = 0; k < words.length; k++) {
        const tk = tokens[i + k];
        if (!tk || tk.type !== "IDENT" && tk.type !== "KEYWORD" || tk.value !== words[k] || tk.line !== t.line) {
          ok = false;
          break;
        }
      }
      if (ok) {
        out.push({ ...t, type: "KEYWORD", value: map[phrase] });
        i += words.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    if ((t.type === "IDENT" || t.type === "KEYWORD") && Object.prototype.hasOwnProperty.call(map, t.value)) {
      out.push({ ...t, type: "KEYWORD", value: map[t.value] });
    } else {
      out.push(t);
    }
    i++;
  }
  return out;
}

// core/program.ts
function parseProgram(tokens) {
  let i = 0;
  const fail = (t) => {
    throw new Error(`Unexpected "${t.value}" at line ${t.line}, col ${t.col}`);
  };
  const isSym = (t, v) => !!t && t.type === "SYMBOL" && t.value === v;
  const skip = () => {
    while (tokens[i] && (tokens[i].type === "SYMBOL" && ["\n", ";", " "].includes(tokens[i].value))) i++;
  };
  const parseCall = () => {
    const t = tokens[i];
    if (t.type !== "KEYWORD" && t.type !== "IDENT") fail(t);
    const open = tokens[i + 1];
    if (!open || open.type !== "SYMBOL" || open.value !== "(") fail(open || t);
    i += 2;
    const args = [];
    let cur = [];
    let depth = 0;
    const flush = () => {
      if (!cur.length) return;
      const one = cur.length === 1 ? cur[0] : null;
      if (one && one.type === "STRING") args.push({ type: "String", value: one.value });
      else if (one && one.type === "NUMBER") args.push({ type: "Number", value: one.value });
      else if (one && (one.type === "IDENT" || one.type === "KEYWORD")) {
        if (one.value === "true" || one.value === "false") {
          args.push({ type: "Raw", tokens: [{ ...one, value: one.value }] });
        } else {
          args.push({ type: "Raw", tokens: cur });
        }
      } else {
        args.push({ type: "Raw", tokens: cur });
      }
      cur = [];
    };
    while (true) {
      const a = tokens[i];
      if (!a || a.type === "EOF") fail(a || tokens[i - 1]);
      if (a.type === "SYMBOL" && a.value === "\n") {
        i++;
        continue;
      }
      if (a.type === "SYMBOL" && a.value === " ") {
        i++;
        continue;
      }
      if (isSym(a, ")") && depth === 0) break;
      if (isSym(a, ",") && depth === 0) {
        flush();
        i++;
        continue;
      }
      if (isSym(a, "(")) depth++;
      else if (isSym(a, ")")) depth--;
      cur.push(a);
      i++;
    }
    flush();
    i++;
    return { type: "Call", name: t.value, args };
  };
  const closeOf = (list) => {
    let d = 0;
    for (let k = 0; k < list.length; k++) {
      if (isSym(list[k], "(")) d++;
      else if (isSym(list[k], ")")) {
        d--;
        if (d === 0) return k;
      }
    }
    return -1;
  };
  const stripParens = (list) => {
    while (list.length > 1 && isSym(list[0], "(") && closeOf(list) === list.length - 1) return list.slice(1, -1);
    return list;
  };
  const parseBlock = () => {
    if (!isSym(tokens[i], "{")) fail(tokens[i] || tokens[i - 1]);
    i++;
    const out = [];
    while (true) {
      skip();
      const t = tokens[i];
      if (!t || t.type === "EOF") fail(t || tokens[i - 1]);
      if (isSym(t, "}")) {
        i++;
        return out;
      }
      out.push(parseStmt());
    }
  };
  const parseIf = () => {
    i++;
    const test = [];
    let depth = 0;
    while (tokens[i] && tokens[i].type !== "EOF") {
      const t = tokens[i];
      if (isSym(t, "(")) depth++;
      else if (isSym(t, ")")) depth--;
      else if (isSym(t, "{") && depth === 0) break;
      test.push(t);
      i++;
    }
    if (!test.length) fail(tokens[i] || tokens[i - 1]);
    const then = parseBlock();
    let j = i;
    while (tokens[j] && tokens[j].type === "SYMBOL" && tokens[j].value === "\n") j++;
    const nx = tokens[j];
    let other = null;
    if (nx && nx.type === "KEYWORD" && nx.value === "else if") {
      i = j;
      other = [parseIf()];
    } else if (nx && nx.type === "KEYWORD" && nx.value === "else") {
      i = j + 1;
      other = parseBlock();
    }
    return { type: "If", test: { type: "Raw", tokens: stripParens(test) }, then, else: other };
  };
  const parseWhile = () => {
    i++;
    const test = [];
    let depth = 0;
    while (tokens[i] && tokens[i].type !== "EOF") {
      const t = tokens[i];
      if (isSym(t, "(")) depth++;
      else if (isSym(t, ")")) depth--;
      else if (isSym(t, "{") && depth === 0) break;
      test.push(t);
      i++;
    }
    if (!test.length) fail(tokens[i] || tokens[i - 1]);
    const body2 = parseBlock();
    return { type: "While", test: { type: "Raw", tokens: stripParens(test) }, body: body2 };
  };
  const parseStmt = () => {
    const t = tokens[i];
    if (t.type === "KEYWORD" && t.value === "if") return parseIf();
    if (t.type === "KEYWORD" && t.value === "while") return parseWhile();
    return parseCall();
  };
  const body = [];
  while (true) {
    skip();
    if (i >= tokens.length || tokens[i].type === "EOF") break;
    body.push(parseStmt());
  }
  return { type: "Program", body };
}

// writers/common.ts
var wordy = (t) => t.type === "IDENT" || t.type === "KEYWORD" || t.type === "NUMBER";
var quote = (s) => JSON.stringify(s);
var jsWord = (t) => t.value;
var arg = (a, word) => a.type === "String" ? quote(a.value) : a.type === "Raw" ? renderTokens(a.tokens, word) : a.value;
function renderTokens(tokens, word) {
  let out = "";
  let prev;
  for (const t of tokens) {
    if (prev && wordy(prev) && wordy(t)) out += " ";
    out += t.type === "STRING" ? quote(t.value) : word(t);
    prev = t;
  }
  return out;
}

// writers/js-writer.ts
function toJS(node, keywords) {
  return compileNode(node, 0, keywords);
}
function compileIf(node, indentLevel, keywords, kw) {
  const indent = "  ".repeat(indentLevel);
  const test = renderTokens(node.test.tokens, jsWord);
  let code = `${indent}${kw} (${test}) {
`;
  code += node.then.map((n) => compileNode(n, indentLevel + 1, keywords)).join("\n");
  code += `
${indent}}`;
  if (node.else && node.else.length > 0) {
    if (node.else.length === 1 && node.else[0].type === "If") {
      const nested = compileIf(node.else[0], indentLevel, keywords, "else if");
      code += " " + nested.slice(indent.length);
    } else {
      code += ` else {
`;
      code += node.else.map((n) => compileNode(n, indentLevel + 1, keywords)).join("\n");
      code += `
${indent}}`;
    }
  }
  return code;
}
function compileNode(node, indentLevel, keywords) {
  const indent = "  ".repeat(indentLevel);
  switch (node.type) {
    case "Program":
      return node.body.map((n) => compileNode(n, indentLevel, keywords)).join("\n");
    case "Call": {
      let funcName = node.name;
      const concept = keywords[funcName] ?? funcName;
      if (concept === "print" || concept === "log" || concept === "console.log") {
        funcName = "console.log";
      }
      const args = node.args.map((a) => arg(a, jsWord)).join(", ");
      return `${indent}${funcName}(${args});`;
    }
    case "If":
      return compileIf(node, indentLevel, keywords, "if");
    case "While": {
      const test = renderTokens(node.test.tokens, jsWord);
      const body = node.body.map((n) => compileNode(n, indentLevel + 1, keywords)).join("\n");
      return `${indent}while (${test}) {
${body}
${indent}}`;
    }
    case "StringLiteral":
      return `"${node.value}"`;
    case "NumberLiteral":
      return String(node.value);
    case "Identifier": {
      const concept = keywords[node.name] ?? node.name;
      if (concept === "true") return "true";
      if (concept === "false") return "false";
      return node.name;
    }
    default:
      return "";
  }
}

// writers/python-writer.ts
var pyWord = (t) => t.value === "true" ? "True" : t.value === "false" ? "False" : t.value;
function toPython(node, keywords) {
  return compileNode2(node, 0, keywords);
}
function compileIf2(node, indentLevel, keywords, kw) {
  const indent = "    ".repeat(indentLevel);
  const test = renderTokens(node.test.tokens, pyWord);
  let code = `${indent}${kw} ${test}:
`;
  const thenBody = node.then.map((n) => compileNode2(n, indentLevel + 1, keywords)).join("\n");
  code += thenBody || `${indent}    pass`;
  if (node.else && node.else.length > 0) {
    if (node.else.length === 1 && node.else[0].type === "If") {
      const nested = compileIf2(node.else[0], indentLevel, keywords, "elif");
      code += "\n" + nested;
    } else {
      code += `
${indent}else:
`;
      const elseBody = node.else.map((n) => compileNode2(n, indentLevel + 1, keywords)).join("\n");
      code += elseBody || `${indent}    pass`;
    }
  }
  return code;
}
function compileNode2(node, indentLevel, keywords) {
  const indent = "    ".repeat(indentLevel);
  switch (node.type) {
    case "Program":
      return node.body.map((n) => compileNode2(n, indentLevel, keywords)).join("\n");
    case "Call": {
      let funcName = node.name;
      const concept = keywords[funcName] ?? funcName;
      if (concept === "print" || concept === "log" || concept === "console.log") {
        funcName = "print";
      }
      const args = node.args.map((a) => arg(a, pyWord)).join(", ");
      return `${indent}${funcName}(${args})`;
    }
    case "If":
      return compileIf2(node, indentLevel, keywords, "if");
    case "While": {
      const test = renderTokens(node.test.tokens, pyWord);
      const body = node.body.map((n) => compileNode2(n, indentLevel + 1, keywords)).join("\n");
      return `${indent}while ${test}:
${body}`;
    }
    case "StringLiteral":
      return `"${node.value}"`;
    case "NumberLiteral":
      return String(node.value);
    case "Identifier": {
      const concept = keywords[node.name] ?? node.name;
      if (concept === "true") return "True";
      if (concept === "false") return "False";
      return node.name;
    }
    default:
      return "";
  }
}

// core/errors.ts
var MAX_SOURCE_BYTES = 1e6;
var BaydaError = class _BaydaError extends Error {
  constructor(code, message, details) {
    super(`[${code}] ${message}`);
    this.name = "BaydaError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, _BaydaError.prototype);
  }
};

// core/translate.ts
var VALID_TARGETS = ["js", "py"];
function assertTarget(target) {
  if (typeof target !== "string" || !VALID_TARGETS.includes(target)) {
    throw new BaydaError("INVALID_TARGET", `\u0647\u062F\u0641 \u063A\u064A\u0631 \u0645\u062F\u0639\u0648\u0645: ${String(target)}`, {
      target,
      valid: VALID_TARGETS
    });
  }
}
function assertSource(source) {
  if (typeof source !== "string") {
    throw new BaydaError("INVALID_SOURCE", "\u0627\u0644\u0645\u0635\u062F\u0631 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0646\u0635\u0627\u064B.");
  }
  if (source.length > MAX_SOURCE_BYTES) {
    throw new BaydaError(
      "SOURCE_TOO_LARGE",
      `\u062D\u062C\u0645 \u0627\u0644\u0645\u0635\u062F\u0631 \u064A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F (${MAX_SOURCE_BYTES} \u0628\u0627\u064A\u062A).`,
      { length: source.length }
    );
  }
}
function translate(source, input) {
  assertSource(source);
  if (!input || typeof input !== "object") {
    throw new BaydaError("INVALID_SOURCE", "\u0627\u0644\u0645\u062F\u062E\u0644\u0627\u062A \u0645\u0637\u0644\u0648\u0628\u0629 (TranslateInput).");
  }
  const target = input.target ?? "js";
  assertTarget(target);
  const keywords = input.keywords || {};
  try {
    const tokens = new Lexer(source, keywords).tokenize();
    const normalized = normalize(tokens, keywords);
    const ast = parseProgram(normalized);
    const code = target === "py" ? toPython(ast, keywords) : toJS(ast, keywords);
    return { code, target, dialect: input.id, tokens: normalized, ast, keywords };
  } catch (e) {
    if (e instanceof BaydaError) throw e;
    throw new BaydaError("PARSE_ERROR", e.message, {
      cause: e.name,
      dialect: input.id
    });
  }
}

// apps/web-lab/dialects.ts
var dz_latn_kw = {
  "kteb": "print",
  "ila": "if",
  "sah": "true",
  "ghalt": "false",
  "wela": "else"
};
var kab_latn_kw = {
  "aru": "print",
  "ma": "if",
  "tidett": "true",
  "tidtt": "true",
  "tdt": "true",
  "mtu": "true",
  "amtu": "true",
  "sahih": "true",
  "shih": "true",
  "sa7i7": "true",
  "mgaz": "false",
  "amgaz": "false",
  "ghalat": "false",
  "wela": "else",
  "wla": "else"
};
var kab_tifinagh_kw = {
  "\u2D49\u2D37\u2D40\u2D30": "if",
  "\u2D61\u2D3B\u2D4D\u2D4D\u2D30": "else",
  "\u2D59\u2D49\u2D4F\u2D53\u2D4F": "else",
  "\u2D3D\u2D5C\u2D30\u2D31": "print",
  "\u2D33\u2D53\u2D4D": "print",
  "\u2D40\u2D30\u2D47\u2D47": "true",
  "\u2D31\u2D4D\u2D30": "false",
  "\u2D5C\u2D30\u2D61\u2D30": "while",
  "\u2D49\u2D3D\u2D3B\u2D4D": "for",
  "\u2D4E\u2D30": "if",
  "\u2D4E\u2D30\u2D5B\u2D30": "else"
};
var ly_latn_kw = {
  "kteb": "print",
  "kan": "if",
  "sahih": "true",
  "ghalet": "false",
  "wela": "else"
};
var mr_latn_kw = {
  "ktab": "print",
  "idha": "if",
  "haqq": "true",
  "bla": "false",
  "wela": "else"
};
var shi_latn_kw = {
  "aru": "print",
  "skr": "print",
  "ma": "if",
  "ila": "if",
  "tidett": "true",
  "tidtt": "true",
  "tdt": "true",
  "amgaz": "false",
  "mgaz": "false",
  "wela": "else",
  "wla": "else",
  "maulac": "else",
  "mlac": "else"
};
var tn_latn_kw = {
  "ekteb": "print",
  "ektb": "print",
  "goul": "print",
  "9oul": "print",
  "9olli": "print",
  "golli": "print",
  "idha": "if",
  "ida": "if",
  "s7i7": "true",
  "shih": "true",
  "ghalet": "false",
  "ghalt": "false",
  "8alt": "false",
  "wella": "else",
  "wlla": "else"
};
var allKeywords = {
  "dz-latn": dz_latn_kw,
  "kab-latn": kab_latn_kw,
  "kab-tifinagh": kab_tifinagh_kw,
  "ly-latn": ly_latn_kw,
  "mr-latn": mr_latn_kw,
  "shi-latn": shi_latn_kw,
  "tn-latn": tn_latn_kw
};

// apps/web-lab/vocabularies.ts
var dz_latn_vocab = {
  "\u062E\u0644\u0627\u0635": "end",
  "\u0643\u0645\u0644": "end",
  "\u0648": "and",
  "\u0648\u0644\u0627": "or",
  "\u0645\u0627\u0634\u064A": "not",
  "\u062C\u064A\u0628": "input",
  "\u062F\u062E\u0644": "input",
  "\u0623\u0642\u0631\u0627": "input",
  "\u0633\u0642\u0633\u064A": "input",
  "\u062D\u0627\u062C\u0629": "variable",
  "\u0639\u0641\u0633\u0629": "variable",
  "\u0644\u064A\u0633\u062A\u0629": "array_list",
  "\u0645\u0633\u062D": "clear_delete",
  "\u0646\u0642\u064A": "clear_delete",
  "\u062E\u062F\u0645\u0629": "function_method",
  "\u0634\u0639\u0644": "run_execute",
  "\u0633\u062C\u0651\u0644": "save_commit",
  "\u062E\u0628\u0651\u064A": "save_commit",
  "\u062D\u0648\u0651\u0633": "debug",
  "\u0628\u0627\u063A": "error_bug",
  "\u0637\u0627\u062D": "crash",
  "\u062A\u0645\u062A": "success",
  "\u0635\u0644\u062D\u062A": "success",
  "\u0646\u0633\u062E\u0629": "clone",
  "\u0641\u0631\u062E": "object",
  "\u0648\u0631\u062B": "inheritance",
  "\u0627\u0644\u0632\u0628\u0627\u0644": "garbage_collector",
  "\u0627\u0644\u0628\u0627\u0628": "port",
  "\u0627\u0644\u0631\u0648\u0634\u0646": "api_endpoint",
  "\u0623\u0628\u0639\u062B": "request",
  "\u062F\u0632": "request",
  "\u062C\u0648\u0627\u0628": "response",
  "\u0641\u0627\u062A \u0627\u0644\u0648\u0642\u062A": "timeout",
  "\u0627\u0644\u0633\u064A\u0631\u0641\u0631": "server",
  "\u0637\u0644\u0642": "deploy",
  "\u0627\u0644\u062E\u0632\u064A\u0646": "backup",
  "\u062E\u0644\u0637": "merge",
  "\u0623\u062C\u0628\u062F": "pull",
  "\u062F\u0648\u0631 \u0628\u0644\u0627 \u062D\u0628\u0627\u0633": "infinite_loop",
  "\u0623\u0633\u062A\u0646\u0649": "loading_spinner",
  "\u0639\u0646\u062F\u0648 \u0627\u0644\u0636\u0648 \u062E\u0636\u0631": "authorized",
  "\u0628\u0644\u0648\u0643\u064A": "blocked_banned",
  "\u062D\u0628\u0633": "freeze_not_responding",
  "\u0623\u0631\u0642\u062F": "delay_sleep",
  "\u0627\u0644\u0634\u0641\u0631\u0629": "password",
  "\u0627\u0644\u0633\u0631\u0627\u0642": "hacker",
  "\u0627\u0644\u062E\u0632\u0646\u0629": "database",
  "\u062D\u0648\u0651\u0633 \u0641\u064A \u0627\u0644\u062F\u0641\u062A\u0631": "query",
  "\u0627\u0644\u0628\u0635\u0645\u0629": "primary_key",
  "\u0627\u0644\u0633\u0627\u0633": "framework",
  "\u0641\u0627\u0628\u0648\u0631": "open_source",
  "\u0639\u0646\u062F\u064A": "localhost",
  "\u0627\u0644\u0641\u0648\u0642": "cloud",
  "\u0641\u0631\u0639": "branch",
  "\u062A\u062E\u0644\u0637\u062A": "conflict",
  "\u0648\u0644\u0651\u064A \u0643\u064A\u0645\u0627 \u0643\u0627\u0646": "rollback",
  "\u0627\u0644\u0643\u0628\u0633\u0629": "button",
  "\u0627\u0644\u062F\u0627\u062E\u0644": "padding",
  "\u0627\u0644\u0628\u0631\u0627": "margin",
  "\u062A\u0639\u064A\u0637 \u0644\u0631\u0648\u062D\u0647\u0627": "recursion",
  "\u0635\u062D \u0648\u0644\u0627 \u0644\u0627": "boolean"
};
var kab_latn_vocab = {
  "ne\u0263": "or",
  "amar": "and",
  "ur": "not",
  "ulac": "empty",
  "semsawi": "equal",
  "ameqqran": "greater",
  "ame\u1E93yan": "less",
  "yella": "exists",
  "seg": "from",
  "\u0263er": "to",
  "s": "with",
  "ak": "with",
  "\u0263ef": "on",
  "ddaw": "under",
  "nnig": "above",
  "zdat": "before",
  "deffir": "after",
  "tikli": "loop",
  "tikelt": "iteration",
  "a\u0263balu": "source",
  "abrid": "path",
  "isem": "name",
  "azal": "value",
  "tamawt": "type",
  "tazmert": "promise",
  "tucc\u1E0Da": "error",
  "akal": "global",
  "agmam": "module",
  "tawuri": "process",
  "tal\u0263a": "args",
  "inadi": "index",
  "am\u1E0Dan": "count",
  "amzwaru": "first",
  "aneggaru": "last",
  "talemmast": "middle",
  "a\u1E25ric": "slice",
  "dukel": "concat",
  "ini": "say",
  "steqsi": "prompt",
  "wali": "check",
  "i": "for"
};
var kab_tifinagh_vocab = {
  "\u2D30\u2D63\u2D53\u2D4D": "\u0623\u0647\u0644\u0627\u064B",
  "\u2D5C\u2D30\u2D4E\u2D30\u2D63\u2D49\u2D56\u2D5C": "\u0623\u0645\u0627\u0632\u064A\u063A\u064A\u0629",
  "\u2D30\u2D4E\u2D30\u2D4F": "\u0645\u0627\u0621",
  "\u2D30\u2D56\u2D54\u2D53\u2D4E": "\u062E\u0628\u0632",
  "\u2D5C\u2D30\u2D3C\u2D30\u2D5C": "\u0636\u0648\u0621"
};
var ly_latn_vocab = {
  "\u0648": "and",
  "\u0648\u0644\u0627": "or",
  "\u0645\u0634": "not",
  "\u0645\u0648\u0634": "not",
  "\u0623\u0648": "or",
  "\u0644\u0643\u0644": "foreach",
  "\u0644\u0643\u0644 \u0648\u0627\u062D\u062F": "foreach",
  "\u062D\u0627\u062C\u0629 \u0648\u062A\u062E\u0644\u0627\u0635": "variable",
  "\u0645\u0633\u0645\u0627\u0631 \u0641\u064A \u062D\u064A\u0637": "constant",
  "\u0633\u0644\u0627\u0651\u0637": "array_list",
  "\u0633\u062A\u064A\u0643\u0629": "array_list",
  "\u0645\u0641\u0644\u0633": "null_empty",
  "\u0645\u0641\u064A\u0634 \u0635\u0628\u0639": "null_empty",
  "\u0627\u0645\u0633\u062D \u0627\u0644\u062D\u0643\u0627\u0643\u0629": "clear_delete",
  "\u0642\u0631\u0628\u0639": "clear_delete",
  "\u0627\u0644\u0635\u0646\u0639\u0629": "function_method",
  "\u0648\u0644\u0651\u0639": "run_execute",
  "\u0627\u0636\u063A\u0637 \u0627\u0644\u0632\u0631": "run_execute",
  "\u0623\u0642\u0641\u0644 \u0639\u0644\u064A\u0647\u0627": "save_commit",
  "\u062F\u0633\u0651\u0647\u0627": "save_commit",
  "\u0646\u0628\u0651\u0634": "debug",
  "\u062F\u0648\u0631 \u0627\u0644\u0633\u0631\u064A\u0628": "debug",
  "\u0639\u0643\u0651\u0629": "error_bug",
  "\u0627\u0644\u0633\u064A\u0633\u062A\u0645 \u062E\u0634 \u0641\u064A \u062D\u064A\u0637": "error_bug",
  "\u0637\u0627\u062D \u0627\u0644\u0633\u064A\u0631\u0641\u0631": "crash",
  "\u062A\u0641\u0634\u0641\u0634": "crash",
  "\u062A\u0645\u062A \u0628\u062C\u0648\u062F\u0629": "success",
  "\u0623\u0645\u0648\u0631\u0647\u0627 \u0644\u0648\u0632": "success",
  "\u0627\u0644\u0646\u0633\u062E\u0629": "object",
  "\u0627\u0644\u0641\u0631\u062E": "object",
  "\u0637\u0627\u0644\u0639 \u0644\u0628\u0648\u0629": "inheritance",
  "\u0645\u0648\u0631\u0651\u062B": "inheritance",
  "\u0627\u0644\u0643\u0646\u0651\u0627\u0633": "garbage_collector",
  "\u0644\u0645\u0651\u0627\u0645 \u0627\u0644\u0641\u0636\u0644\u0629": "garbage_collector",
  "\u0627\u0644\u0631\u0648\u0634\u0646": "api_endpoint",
  "\u0646\u062E\u0633": "request",
  "\u062F\u0632\u0651\u0644\u064A": "request",
  "\u0631\u062C\u0639\u0644\u064A \u0627\u0644\u062C\u0648\u0627\u0628": "response",
  "\u0641\u0627\u062A \u0627\u0644\u0645\u064A\u0639\u0627\u062F": "timeout",
  "\u0645\u0644\u0651\u064A\u0646\u0627": "timeout",
  "\u0627\u0644\u062D\u0648\u0634 \u0627\u0644\u0643\u0628\u064A\u0631": "server",
  "\u0627\u0644\u0631\u0623\u0633 \u0627\u0644\u0643\u0628\u064A\u0631\u0629": "server",
  "\u0643\u0644 \u062D\u062F \u0628\u0631\u0623\u0633\u0647": "asynchronous",
  "\u0623\u0637\u0644\u0642 \u0641\u064A \u0627\u0644\u0633\u0648\u0642": "deploy",
  "\u0637\u0644\u0639\u0647\u0627 \u0644\u0644\u0636\u0648\u0621": "deploy",
  "\u0627\u0644\u0636\u0645\u0651\u0627\u0646": "backup",
  "\u0627\u0644\u062E\u0632\u064A\u0646": "backup",
  "\u0646\u0641\u0651\u0636 \u063A\u0628\u0627\u0631\u0647": "update_upgrade",
  "\u062F\u064A\u0631\u0644\u0647 \u0644\u0642\u0637\u0629 \u062C\u062F\u064A\u062F\u0629": "update_upgrade",
  "\u062E\u0644\u0651\u0637\u0647\u0645": "merge",
  "\u0635\u064F\u0628\u0651 \u0627\u0644\u062D\u0645\u0648\u0644 \u0639\u0644\u0649 \u0628\u0639\u0636\u0647\u0627": "merge",
  "\u0627\u062C\u0628\u062F\u0647": "pull",
  "\u0633\u0627\u0642\u064A\u0629 \u062A\u062F\u0648\u0631": "infinite_loop",
  "\u0645\u062A\u0627\u0647\u0629 \u063A\u0631\u0642\u0646\u0627 \u0641\u064A\u0647\u0627": "infinite_loop",
  "\u0631\u0627\u062C\u064A \u0634\u0648\u064A\u0629": "loading_spinner",
  "\u064A\u0628\u0631\u0645": "loading_spinner",
  "\u0639\u0646\u062F\u0647 \u0627\u0644\u0636\u064A \u0627\u0644\u0623\u062E\u0636\u0631": "authorized",
  "\u0635\u0643\u0651\u0631\u0648\u0627 \u0639\u0644\u064A\u0647 \u0627\u0644\u0633\u0643\u0629": "blocked_banned",
  "\u0627\u0644\u0645\u0633\u0637\u0631\u0629 \u062A\u0639\u0628\u0651\u064A": "progress_bar",
  "\u062E\u0637 \u0627\u0644\u062E\u0637\u0648\u0627\u062A": "progress_bar",
  "\u062E\u0648\u062F \u0646\u064E\u0641\u064E\u0633": "delay_sleep",
  "\u0627\u0631\u0642\u062F \u0634\u0648\u064A\u0629": "delay_sleep",
  "\u062A\u063A\u0645\u064A\u0642 \u0627\u0644\u0633\u0631\u064A\u0628": "encryption",
  "\u062D\u0637\u0651\u0647 \u0641\u064A \u0642\u0632\u0651\u064A\u0631": "encryption",
  "\u0627\u0644\u0643\u0644\u0645\u0629 \u0627\u0644\u0633\u0631\u0627\u0646\u064A\u0629": "password",
  "\u0627\u0644\u0634\u0641\u0631\u0629": "password",
  "\u0627\u0644\u0633\u0631\u0651\u0627\u0642": "hacker",
  "\u0645\u062E\u0631\u0628\u0634 \u0627\u0644\u0633\u064A\u0633\u062A\u0645": "hacker",
  "\u0627\u0644\u062A\u0630\u0643\u0631\u0629": "token",
  "\u0627\u0644\u0648\u0631\u0642\u0629": "token",
  "\u0627\u0644\u062E\u0632\u064A\u0646\u0629": "database",
  "\u0627\u0644\u062F\u0641\u062A\u0631 \u0627\u0644\u0643\u0628\u064A\u0631": "database",
  "\u0646\u0628\u0634 \u0641\u064A \u0627\u0644\u062F\u0641\u0627\u062A\u0631": "query",
  "\u062F\u0648\u0631\u0644\u064A \u0639\u0644\u0649": "query",
  "\u0627\u0644\u0639\u0644\u0627\u0645\u0627\u062A": "index",
  "\u0631\u0623\u0633 \u0627\u0644\u062E\u064A\u0637": "index",
  "\u0627\u0644\u0628\u0635\u0645\u0629": "primary_key",
  "\u0645\u0627\u0643\u064A\u0627\u062C \u0644\u0644\u0643\u0648\u062F": "refactoring",
  "\u062A\u0639\u062F\u064A\u0644 \u0648\u062A\u0633\u062A\u064A\u0641": "refactoring",
  "\u0627\u0644\u0633\u0627\u0633": "framework",
  "\u0627\u0644\u0631\u0643\u064A\u0632\u0629": "framework",
  "\u0633\u0628\u064A\u0644": "open_source",
  "\u0645\u062A\u0627\u062D \u0644\u0644\u062C\u0645\u064A\u0639": "open_source",
  "\u0641\u064A \u062C\u0647\u0627\u0632\u064A": "localhost",
  "\u0639\u0646\u062F\u064A \u0647\u0646\u0627": "localhost",
  "\u0641\u0648\u0642": "cloud",
  "\u0633\u064A\u0631\u0641\u0631\u0627\u062A \u0628\u0631\u0651\u0629": "cloud",
  "\u0631\u0642\u0645 \u0627\u0644\u0639\u0646\u0648\u0627\u0646": "ip_address",
  "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062C\u0647\u0627\u0632": "ip_address",
  "\u0627\u0644\u0645\u062F\u062E\u0644": "port",
  "\u0627\u0644\u0628\u0627\u0628": "port",
  "\u0648\u0633\u0639 \u0627\u0644\u062E\u0637": "bandwidth",
  "\u0633\u0639\u0629 \u0627\u0644\u0634\u0628\u0643\u0629": "bandwidth",
  "\u0641\u0631\u0639": "branch",
  "\u062A\u0641\u0631\u064A\u0639\u0629": "branch",
  "\u0627\u0633\u062D\u0628 \u0646\u0633\u062E\u0629": "clone",
  "\u0646\u0632\u0651\u0644\u0647 \u0639\u0646\u062F\u064A": "clone",
  "\u0639\u0644\u0649 \u062C\u0646\u0628": "staging_area",
  "\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u062A\u062C\u0647\u064A\u0632": "staging_area",
  "\u062A\u062F\u0627\u062E\u0644": "conflict",
  "\u062E\u0634\u062A \u0628\u0639\u0636\u0647\u0627": "conflict",
  "\u0627\u0631\u062C\u0639 \u0644\u0644\u062A\u0627\u0644\u064A": "rollback",
  "\u0631\u062F\u0651\u0647 \u0632\u064A \u0645\u0627 \u0643\u0627\u0646": "rollback",
  "\u064A\u0645\u0634\u064A \u0645\u0639 \u0643\u0644 \u0634\u0627\u0634\u0629": "responsive_design",
  "\u064A\u062A\u0634\u0643\u0644 \u062D\u0633\u0628 \u0627\u0644\u062C\u0647\u0627\u0632": "responsive_design",
  "\u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0645\u0639\u062A\u0645": "dark_mode",
  "\u0627\u0644\u062E\u0644\u0641\u064A\u0629 \u0627\u0644\u0643\u062D\u0644\u0629": "dark_mode",
  "\u0627\u0644\u0643\u0628\u0633\u0629": "button",
  "\u0627\u0644\u0642\u0631\u0635\u0629": "button",
  "\u0627\u0644\u062D\u0627\u0634\u064A\u0629": "padding",
  "\u0627\u0644\u0641\u0631\u0627\u063A \u0627\u0644\u062F\u0627\u062E\u0644\u064A": "padding",
  "\u0627\u0644\u0628\u0639\u062F": "margin",
  "\u0627\u0644\u0641\u0631\u0627\u063A \u0627\u0644\u062E\u0627\u0631\u062C\u064A": "margin",
  "\u062A\u0646\u0627\u062F\u064A \u0631\u0648\u062D\u0647\u0627": "recursion",
  "\u062A\u0643\u0631\u0627\u0631 \u0630\u0627\u062A\u064A": "recursion",
  "\u0635\u062D \u0648\u0625\u0644\u0627 \u062E\u0637\u0623": "boolean",
  "\u0625\u064A \u0648\u0625\u0644\u0627 \u0644\u0627": "boolean",
  "\u062A\u062A\u0628\u0639 \u0627\u0644\u062C\u0631\u0629": "bug_tracking",
  "\u062A\u0635\u0641\u064A\u0629 \u0627\u0644\u0634\u0648\u0627\u0626\u0628": "linting",
  "\u0635\u0644\u0627\u062D\u064A\u062A\u0647\u0627 \u062A\u0645\u062A": "deprecation",
  "\u0627\u0644\u062E\u062F\u0645\u0629 \u0627\u0644\u062D\u064A\u0629": "production",
  "\u0631\u0642\u0639\u0629 \u0633\u0631\u064A\u0639\u0629": "hotfix",
  "\u062A\u062D\u0645\u064A\u0644 \u0632\u0627\u064A\u062F": "overloading",
  "\u062A\u0645\u062B\u064A\u0644 \u0648\u062A\u062C\u0631\u064A\u0628": "mocking",
  "\u0636\u0628\u0637 \u0627\u0644\u062D\u0627\u0644": "state_management",
  "\u0639\u0627\u0633 \u0639\u0644\u0649 \u0627\u0644\u062D\u0631\u0643\u0629": "event_listener",
  "\u0627\u0644\u062D\u0650\u0645\u0652\u0644": "payload",
  "\u062A\u0648\u062C\u064A\u0647 \u0627\u0644\u0633\u0643\u0629": "routing",
  "\u0627\u0644\u062C\u0644\u0633\u0629": "session",
  "\u0627\u0644\u0641\u062A\u0627\u0641\u064A\u062A": "cookies",
  "\u0627\u0644\u0645\u062E\u0628\u0623 \u0627\u0644\u0645\u0624\u0642\u062A": "cache",
  "\u0645\u0648\u0632\u0639 \u0627\u0644\u062C\u0647\u062F": "load_balancer",
  "\u0627\u0644\u0648\u0633\u064A\u0637": "proxy",
  "\u062D\u064A\u0637 \u0627\u0644\u0635\u062F": "firewall",
  "\u0627\u0644\u062A\u062B\u0628\u062A \u0645\u0646 \u0627\u0644\u0647\u0648\u064A\u0629": "authentication",
  "\u0625\u0630\u0646 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629": "authorization",
  "\u062E\u0628\u0637 \u0639\u0645\u064A\u0627\u0646\u064A": "brute_force",
  "\u0627\u0635\u0637\u064A\u0627\u062F \u0627\u0644\u0635\u064A\u062F": "phishing",
  "\u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0642\u0641\u0644": "encryption_key",
  "\u0641\u062A\u062D \u0627\u0644\u0631\u0645\u0648\u0632": "decryption",
  "\u062A\u0646\u0638\u064A\u0641 \u0627\u0644\u0645\u062F\u062E\u0644\u0627\u062A": "sanitization",
  "\u0632\u0631\u0642 \u0643\u0648\u062F": "injection",
  "\u0627\u0644\u0645\u062A\u062C\u0631 \u0648\u0627\u0644\u0648\u0633\u0637": "environment",
  "\u062C\u0647\u0651\u0632 \u0644\u0644\u062E\u062F\u0645\u0629": "build",
  "\u0631\u062D\u064A\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A": "migration",
  "\u062A\u0639\u0628\u0626\u0629 \u0645\u0628\u062F\u0626\u064A\u0629": "seed",
  "\u0644\u0642\u0637\u0629 \u0627\u0644\u0628\u062F\u0627\u064A\u0629": "trigger",
  "\u0632\u062D\u0645\u0629 \u0641\u064A \u0648\u0642\u062A \u0648\u0627\u062D\u062F": "concurrency",
  "\u0639\u0631\u0642 \u0627\u0644\u062E\u062F\u0645\u0629": "thread",
  "\u0627\u0644\u062A\u0633\u0643\u064A\u0631\u0629 \u0627\u0644\u0645\u064A\u062A\u0629": "deadlock",
  "\u0633\u0628\u0627\u0642 \u0627\u0644\u062E\u0637\u0648\u0627\u062A": "race_condition",
  "\u0627\u0644\u0637\u0627\u0628\u0648\u0631": "queue",
  "\u0627\u0644\u0645\u0643\u062F\u0633": "stack",
  "\u0627\u0644\u0643\u0648\u0645\u0629": "heap",
  "\u0627\u0644\u0645\u0624\u0634\u0631": "pointer",
  "\u0631\u0642\u0645 \u0627\u0644\u062E\u0627\u0646\u0629": "array_index",
  "\u0633\u0644\u0633\u0644\u0629 \u0627\u0644\u062D\u0631\u0648\u0641": "string",
  "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0635\u062D\u064A\u062D": "integer",
  "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0645\u0643\u0633\u0648\u0631": "float",
  "\u0645\u0624\u0634\u0631 \u0627\u0644\u0641\u0631\u0627\u063A": "null_pointer",
  "\u0627\u0644\u0645\u062A\u0631\u062C\u0645": "compiler",
  "\u0627\u0644\u0645\u0641\u0633\u0631 \u0627\u0644\u0641\u0648\u0631\u064A": "interpreter",
  "\u062B\u0646\u0627\u0626\u064A \u0627\u0644\u0623\u0631\u0642\u0627\u0645": "binary",
  "\u0646\u0638\u0627\u0645 \u0627\u0644\u0633\u062A\u0629 \u0639\u0634\u0631": "hexadecimal",
  "\u0645\u0648\u0639\u062F \u0648\u062A\u0648\u0642\u064A\u062A": "cron_job",
  "\u0625\u0634\u0639\u0627\u0631 \u0641\u0648\u0631\u064A": "webhook",
  "\u0642\u062F\u0631\u0629 \u0627\u0644\u062A\u0648\u0633\u0639": "scalability",
  "\u0627\u0644\u062A\u0639\u0637\u064A\u0644": "latency",
  "\u0627\u0644\u0625\u0646\u062A\u0627\u062C\u064A\u0629": "throughput",
  "\u0648\u0642\u062A \u0627\u0644\u0646\u0634\u0627\u0637": "uptime",
  "\u0648\u0642\u062A \u0627\u0644\u0637\u064A\u062D\u0629": "downtime",
  "\u0645\u0633\u062C\u0644 \u0627\u0644\u0623\u062D\u062F\u0627\u062B": "logs",
  "\u062A\u062A\u0628\u0639 \u0639\u0646 \u0628\u0639\u062F": "telemetry",
  "\u0645\u0631\u0627\u0642\u0628\u0629 \u0627\u0644\u0648\u0636\u0639": "monitoring",
  "\u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645": "dashboard",
  "\u0627\u0644\u0625\u0636\u0627\u0641\u0629": "plugin",
  "\u0627\u0644\u062A\u0648\u0633\u0639\u0629": "extension",
  "\u0627\u0644\u0645\u0643\u062A\u0628\u0629": "library",
  "\u0627\u0644\u0645\u0639\u062A\u0645\u062F \u0639\u0644\u064A\u0647": "dependency",
  "\u0627\u0644\u0635\u0631\u0629": "package",
  "\u0627\u0644\u0645\u0633\u062A\u0648\u062F\u0639": "repository",
  "\u062A\u0641\u0631\u064A\u0639 \u0627\u0644\u0645\u0634\u0631\u0648\u0639": "fork",
  "\u0637\u0644\u0628 \u062F\u0645\u062C": "pull_request",
  "\u0641\u062D\u0635 \u0627\u0644\u0634\u0641\u0631\u0629": "code_review",
  "\u062A\u062C\u0645\u064A\u0639 \u0645\u0633\u062A\u0645\u0631": "continuous_integration",
  "\u062A\u062C\u0647\u064A\u0632 \u0645\u0633\u062A\u0645\u0631": "continuous_deployment",
  "\u0646\u0633\u062E\u0629 \u062A\u062C\u0631\u064A\u0628\u064A\u0629": "beta_version",
  "\u0643\u0648\u062F \u0642\u062F\u064A\u0645": "legacy_code",
  "\u0643\u0648\u062F \u0645\u062E\u0628\u0644": "spaghetti_code",
  "\u0633\u0644\u0641 \u062A\u0642\u0646\u064A": "technical_debt",
  "\u0628\u0631\u0645": "parameter",
  "\u0645\u0639\u0627\u0645\u0644": "parameter",
  "\u064A\u062E\u0636 \u0641\u064A \u0627\u0644\u0644\u0628\u0646": "spinner_loader",
  "\u0627\u0644\u0643\u0645\u0628\u064A\u0648\u062A\u0631 \u062C\u0645\u0651\u062F": "freeze_not_responding",
  "\u0627\u0644\u062F\u0648\u0627\u0631\u0629 \u0627\u0644\u0639\u062C\u0644\u0629 \u062A\u0628\u0631\u0645": "spinner_loader",
  "\u0643\u0628\u0634 \u062D\u0635\u0644": "freeze_not_responding",
  "\u0627\u0644\u0643\u0645\u0628\u064A\u0648\u062A\u0631 \u062C\u0645\u062F": "freeze_not_responding",
  "\u062F\u0644\u064A\u0644 \u0627\u0644\u0639\u0646\u0627\u0648\u064A\u0646": "dns",
  "\u0634\u0631\u064A\u0637 \u0627\u0644\u0627\u0645\u0631": "script",
  "\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u064A\u0637": "script",
  "\u062A\u0648\u0627": "now",
  "hal wa9t": "now",
  "\u0627\u0644\u0622\u0646": "now",
  "\u0647\u0644\u0628\u0627": "very",
  "halba": "very",
  "\u0648\u0627\u062C\u062F": "very",
  "wajed": "very",
  "wajd": "very",
  "\u0639\u0631\u0645": "very",
  "\u0634\u0646\u0648": "what",
  "\u0634\u0646": "what",
  "shni": "what",
  "shnu": "what",
  "\u0634\u0646 \u0627\u0644\u062C\u0648": "what",
  "shn al jaw": "what",
  "shn jw": "what",
  "\u0645\u0627\u0630\u0627": "what",
  "bahi": "good",
  "\u0642\u0646\u064A\u0646": "good",
  "\u0642\u0646\u064A\u0646\u0629": "good",
  "gnen": "good",
  "9nen": "good",
  "\u0644\u0648\u0632": "good",
  "\u062A\u0645\u0627\u0645 \u0628\u062C\u0648\u062F\u0629": "good",
  "talab": "require",
  "\u062C\u064A\u0628": "require",
  "\u0641\u0648\u062A\u0647": "skip",
  "\u0641\u0648\u062A": "skip",
  "fotha": "skip",
  "fota": "skip",
  "\u0641\u0648\u062A\u0647 \u0628\u0631\u0627\u0628\u0639\u0629": "skip",
  "fotha bra4a": "skip",
  "\u062E\u0637 \u0639\u0644\u064A\u0647": "skip",
  "\u0635\u0642\u0639 \u0639\u0644\u064A\u0643": "hard",
  "sa9a3 3lik": "hard",
  "sa9a3": "hard",
  "\u0635\u0642\u0639": "hard",
  "\u062D\u0627\u062C\u0629 \u0635\u0642\u0639": "hard",
  "\u062F\u0632\u0644\u064A \u0637\u0644\u0628": "request",
  "\u0631\u062F": "response"
};
var mr_latn_vocab = {
  "\u0623\u0647\u0644\u0627": "hello",
  "\u0647\u0644\u0627": "hi",
  "\u0633\u0644\u0627\u0645": "salam",
  "\u0628\u0627\u064A": "bye",
  "\u0645\u064A\u0631\u0633\u064A": "thanks",
  "\u0648\u0627\u062E\u0627": "ok",
  "\u0623\u064A\u0647": "yes",
  "\u0646\u0648": "no",
  "\u0628\u0644\u064A\u0632": "please",
  "\u0643\u0648\u062F": "code",
  "\u0628\u063A": "bug",
  "\u062F\u064A\u0628\u0627\u063A\u064A": "debug",
  "\u0635\u0644\u062D": "fix",
  "\u0643\u0648\u0645\u064A\u062A": "commit",
  "\u0628\u0648\u0634": "push",
  "\u0628\u0648\u0644": "pull",
  "\u0645\u064A\u0631\u062C": "merge",
  "\u0628\u0648\u0644 \u0631\u064A\u0643\u0648\u064A\u0633\u062A": "pull_request",
  "\u062F\u064A\u0628\u0644\u0648\u064A": "deploy",
  "\u0633\u064A\u0631\u0641\u0631": "server",
  "\u0643\u0644\u064A\u0627\u0646": "client",
  "\u0641\u0631\u0648\u0646\u062A": "frontend",
  "\u0628\u0627\u0643": "backend",
  "\u0641\u0648\u0644\u0633\u062A\u0627\u0643": "fullstack",
  "\u0623\u0628\u064A": "api",
  "\u062F\u0627\u062A\u0627 \u0628\u064A\u0632": "database",
  "\u0641\u0631\u064A\u0645\u0648\u0631\u0643": "framework",
  "\u0644\u064A\u0628\u0631\u0627\u0631\u064A": "library",
  "\u0641\u0627\u0631\u064A\u0627\u0628\u0644": "variable",
  "\u0644\u0648\u0628": "loop",
  "\u0623\u0631\u064A": "array",
  "\u0623\u0648\u0628\u062C\u064A": "object",
  "\u0623\u0646 \u0628\u064A \u0623\u0645": "npm",
  "\u063A\u064A\u062A": "git",
  "\u063A\u064A\u062A \u0647\u0627\u0628": "github",
  "\u0641\u064A \u0623\u0633 \u0643\u0648\u062F": "vscode",
  "\u0625\u064A\u0631\u0648\u0631": "error",
  "\u0643\u0631\u0627\u0634\u0627": "crash",
  "\u0643\u0648\u0645\u0628\u0627\u064A\u0644": "compile",
  "\u0628\u064A\u0644\u062F": "build",
  "\u0631\u0646\u0651\u064A": "run",
  "\u062A\u064A\u0633\u062A": "test",
  "\u0644\u0648\u0643\u0627\u0644 \u0647\u0648\u0633\u062A": "localhost",
  "\u062F\u0648\u0645\u064A\u0646": "domain",
  "\u0625\u0628\u064A\u0631\u062C\u0645\u0648": "hosting",
  "\u0643\u0648\u0646\u064A\u0643\u0633\u064A\u0648\u0646": "internet",
  "\u0648\u064A\u0641\u064A": "wifi",
  "\u062F\u0627\u062A\u0627": "data",
  "\u0623\u0648\u0646\u0644\u0627\u064A\u0646": "online",
  "\u0623\u0648\u0641\u0644\u0627\u064A\u0646": "offline",
  "\u0633\u064A\u062A": "website",
  "\u0623\u0628\u0644\u064A\u0643\u0627\u0633\u064A\u0648\u0646": "app",
  "\u0623\u0628": "application",
  "\u062A\u064A\u0644\u064A\u0634\u0627\u0631\u062C\u064A": "download",
  "\u0623\u0628\u0644\u0648\u062F\u064A": "upload",
  "\u0644\u064A\u0646": "link",
  "\u0625\u064A\u0645\u064A\u0644": "email",
  "\u0645\u0648\u062F \u0628\u0627\u0633": "password",
  "\u064A\u0648\u0632\u0631\u0646\u064A\u0645": "username",
  "\u0644\u0648\u063A\u064A\u0646": "login",
  "\u062F\u064A\u0643\u0648\u0646\u064A\u0643\u062A\u064A": "logout",
  "\u0633\u062C\u0644": "signup",
  "\u0643\u0648\u0646\u062A": "account",
  "\u0628\u0631\u0648\u0641\u064A\u0644": "profile",
  "\u0628\u064A\u0648": "bio",
  "\u0641\u0648\u0644\u0648\u0631": "follower",
  "\u0641\u0648\u0644\u0648\u0646\u063A": "following",
  "\u0641\u0648\u0644\u0648\u064A": "follow",
  "\u0623\u0646\u0641\u0648\u0644\u0648\u064A": "unfollow",
  "\u0644\u0627\u064A\u0643": "like",
  "\u062F\u064A\u0633\u0644\u0627\u064A\u0643": "dislike",
  "\u0628\u0627\u0631\u0637\u0627\u062C\u064A": "share",
  "\u0643\u0648\u0645\u0648\u0646\u062A\u064A\u0631": "comment",
  "\u0628\u0648\u0633\u062A": "post",
  "\u0633\u062A\u0648\u0631\u064A": "story",
  "\u0631\u064A\u0644": "reel",
  "\u0641\u064A\u062F": "feed",
  "\u0647\u0627\u0634\u062A\u0627\u063A": "hashtag",
  "\u0637\u0627\u063A\u064A": "tag",
  "\u0645\u0627\u0646\u0633\u064A\u0648\u0646\u064A": "mention",
  "\u062F\u064A \u0623\u0645": "dm",
  "\u0625\u0646\u0628\u0648\u0643\u0633": "inbox",
  "\u0646\u0648\u062A\u064A\u0641\u064A\u0643\u0627\u0633\u064A\u0648\u0646": "notification",
  "\u0646\u0648\u062A\u064A\u0641": "notification_plural",
  "\u0641\u064A\u0631\u0627\u0644": "viral",
  "\u062A\u0648\u0646\u062F\u0648\u0646\u0633": "trending",
  "\u0625\u0643\u0633\u0628\u0644\u0648\u0631": "explore",
  "\u0623\u0644\u063A\u0648\u0631\u064A\u062A\u0645": "algorithm",
  "\u0633\u064A\u0644\u0641\u064A": "selfie",
  "\u0641\u064A\u0644\u062A\u0631": "filter",
  "\u0643\u0627\u0628\u0634\u0646": "caption",
  "\u0644\u0627\u064A\u0641": "live",
  "\u0633\u062A\u0631\u064A\u0645": "stream",
  "\u0633\u0627\u0628\u0633\u0643\u0631\u0627\u064A\u0628": "subscribe",
  "\u0633\u0627\u0628\u0633": "subscribers",
  "\u0641\u064A\u0648": "view",
  "\u0641\u064A\u0648\u0632": "views",
  "\u0643\u0644\u064A\u0643\u064A": "click",
  "\u0644\u064A\u0646 \u0641\u0627\u0644\u0628\u064A\u0648": "link_in_bio",
  "\u0633\u0644\u0627\u064A": "slay",
  "\u0641\u0627\u064A\u0628": "vibe",
  "\u0641\u0627\u064A\u0628\u0633": "vibes",
  "\u0643\u0631\u0646\u062C": "cringe",
  "\u0643\u0631\u0646\u062C\u064A": "cringe_person",
  "\u0641\u0644\u064A\u0643\u0633\u064A": "flex",
  "\u0641\u0627\u064A\u0631": "fire",
  "\u0644\u064A\u062A": "lit",
  "\u0645\u064A\u062A \u0628\u0627\u0644\u0636\u062D\u0643": "dead",
  "\u0644\u0648\u0644": "lol",
  "\u0644\u0645\u0627\u0648": "lmao",
  "\u0636\u062D\u0643": "rofl",
  "\u0628\u0631\u0648": "bruh",
  "\u062E\u0648\u064A": "bro",
  "\u062E\u062A\u064A": "sis",
  "\u0628\u064A\u0633\u062A\u064A": "bestie",
  "\u063A\u0648\u0633\u062A\u064A\u0646\u063A": "ghosting",
  "\u062A\u0648\u0643\u0633\u064A\u0643": "toxic",
  "\u0645\u0648\u062F": "mood",
  "\u0645\u0648\u062F\u064A \u0623\u0648\u0641": "low_battery_social",
  "\u0643\u0630\u0628": "cap",
  "\u0646\u0648 \u0643\u0627\u0628 - \u0635\u062D": "no_cap",
  "\u0628\u064A\u062A - \u0648\u0627\u062E\u0627": "bet",
  "\u0641\u0648\u0631 \u0631\u064A\u0644 - \u0628\u0627\u0644\u0635\u062D": "fr",
  "\u0635\u062D \u0635\u062D": "fr_fr",
  "\u063A\u0648\u062A - \u0623\u0633\u0637\u0648\u0631\u0629": "goat",
  "\u0631\u064A\u0632 - \u0643\u0627\u0631\u064A\u0632\u0645\u0627": "rizz",
  "\u062F\u064A\u0644\u0648\u0644\u0648 - \u062A\u062D\u0644\u0645": "delulu",
  "\u0628\u064A\u0632\u062F": "based",
  "\u062F\u0628\u0644\u064A\u0648 - \u0641\u0648\u0632": "w",
  "\u0625\u0644 - \u062E\u0633\u0627\u0631\u0629": "l",
  "\u0633\u0648\u0633 - \u0645\u0634\u0628\u0648\u0647": "sus",
  "\u064A\u064A\u062A - \u0627\u0631\u0645\u064A": "yeet",
  "\u0634\u064A\u0634": "sheesh",
  "\u0628\u064A\u0631\u064A\u0648\u062F - \u0646\u0642\u0637\u0629": "period",
  "\u064A\u0636\u0631\u0628 - \u0632\u064A\u0646 \u062D\u062A": "slaps",
  "\u062F\u0631\u064A\u0628 - \u0633\u062A\u0627\u064A\u0644": "drip",
  "\u0641\u064A\u062A - \u0644\u0628\u0633\u0629": "fit",
  "\u0623\u0633\u062A\u064A\u062A\u064A\u0643": "aesthetic",
  "\u0645\u064A\u0646 \u0643\u0627\u0631\u0627\u0643\u062A\u064A\u0631": "main_character",
  "\u0628\u0648\u0641": "pov",
  "\u0641\u0648\u0631 \u064A\u0648 \u0628\u064A\u062C": "fyp",
  "\u0633\u0643\u064A\u0628\u064A\u062F\u064A": "skibidi",
  "\u0633\u064A\u063A\u0645\u0627": "sigma",
  "\u0623\u0648\u0647\u0627\u064A\u0648 - \u063A\u0631\u064A\u0628": "ohio",
  "\u063A\u064A\u0627\u062A": "gyatt",
  "\u0641\u0627\u0646\u0648\u0645 \u062A\u0627\u0643\u0633": "fanum_tax",
  "\u0634\u0627\u062A": "chat",
  "\u063A\u0631\u0648\u0628": "group_chat",
  "\u0633\u0628\u0627\u0645": "spam",
  "\u0633\u0643\u0627\u0645": "scam",
  "\u0641\u0627\u064A\u0643": "fake",
  "\u0631\u064A\u0644 - \u062D\u0642\u064A\u0642\u064A": "real",
  "\u0645\u064A\u062F - \u0639\u0627\u062F\u064A": "mid",
  "\u0644\u0648\u0643\u064A": "lowkey",
  "\u0647\u0627\u064A\u0643\u064A": "highkey",
  "\u0625\u0644\u064A \u064A\u0639\u0631\u0641 \u064A\u0639\u0631\u0641": "iykyk",
  "\u0645\u0627 \u064A\u0647\u0645\u0646\u064A": "idc",
  "\u0645\u0627 \u0646\u0639\u0631\u0641": "idk",
  "\u0628\u0635\u0631\u0627\u062D\u0629": "tbh",
  "\u0645\u0627 \u0646\u0643\u0630\u0628 \u0639\u0644\u064A\u0643": "ngl",
  "\u0631\u0627\u062C\u0639": "brb",
  "\u0623\u0641\u0643\u0627": "afk",
  "\u0641\u0627\u0644\u0648\u0627\u0642\u0639": "irl",
  "\u062F\u064A \u0623\u0645 \u0645\u064A": "dm_me",
  "\u0637\u064A\u062D \u0627\u0644\u0644\u064A\u0646": "link_drop",
  "\u0631\u0627\u0633\u064A\u0648": "ratio",
  "\u0643\u0627\u0646\u0633\u0644": "canceled",
  "\u0628\u0627\u0646": "banned",
  "\u0634\u0627\u062F\u0648 \u0628\u0627\u0646": "shadowban",
  "\u0631\u062C\u0639": "unbanned",
  "\u0645\u064A\u0632\u0627\u062C\u0648\u0631": "update",
  "\u0623\u0628\u063A\u0631\u064A\u062F": "upgrade",
  "\u0641\u064A\u062A\u0634\u0648\u0631": "feature",
  "\u0641\u064A\u0643\u0633 \u0628\u063A": "bug_fix",
  "\u062D\u0633\u0627\u0646\u064A\u0629 - \u0644\u063A\u0629 \u0627\u0644\u0634\u0628\u0627\u0628 \u0648 \u0627\u0644\u062A\u0642\u0646\u064A\u0629": "nativeName"
};
var shi_latn_vocab = {
  "salam": "\u0633\u0644\u0627\u0645",
  "azul": "\u0623\u0647\u0644\u0627\u064B",
  "tamazight": "\u0623\u0645\u0627\u0632\u064A\u063A\u064A\u0629",
  "amarg": "\u0634\u0648\u0642",
  "tifawin": "\u0636\u0648\u0621",
  "aman": "\u0645\u0627\u0621",
  "aghbalu": "\u062E\u0628\u0632"
};
var tn_latn_vocab = {
  "salam": "\u0633\u0644\u0627\u0645",
  "ahla": "\u0623\u0647\u0644\u0627\u064B",
  "barcha": "\u0643\u062B\u064A\u0631",
  "chwaya": "\u0642\u0644\u064A\u0644",
  "behi": "\u062C\u064A\u062F",
  "5ayb": "\u0633\u064A\u0621",
  "khayb": "\u0633\u064A\u0621",
  "chbeb": "\u062C\u0645\u064A\u0644",
  "mleyah": "\u0645\u0644\u064A\u062D",
  "mlih": "\u0645\u0644\u064A\u062D",
  "ya3tik": "\u064A\u0639\u0637\u064A\u0643",
  "y3tik": "\u064A\u0639\u0637\u064A\u0643",
  "saha": "\u0635\u062D\u0629",
  "sa7a": "\u0623\u0647\u0644\u0627\u064B",
  "labes": "\u0644\u0627\u0628\u0627\u0633",
  "lbs": "\u0644\u0627\u0628\u0627\u0633",
  "salm": "\u0633\u0644\u0627\u0645",
  "slm": "\u0633\u0644\u0627\u0645",
  "chwy": "\u0642\u0644\u064A\u0644",
  "bhi": "\u062C\u064A\u062F",
  "khayeb": "\u0633\u064A\u0621",
  "5yb": "\u0633\u064A\u0621",
  "5eyb": "\u0633\u064A\u0621",
  "brcha": "\u0643\u062B\u064A\u0631",
  "mli7": "\u0645\u0644\u064A\u062D"
};
var allVocabularies = {
  "dz-latn": dz_latn_vocab,
  "kab-latn": kab_latn_vocab,
  "kab-tifinagh": kab_tifinagh_vocab,
  "ly-latn": ly_latn_vocab,
  "mr-latn": mr_latn_vocab,
  "shi-latn": shi_latn_vocab,
  "tn-latn": tn_latn_vocab
};

// apps/web-lab/main.ts
var editor = document.getElementById("editor");
var output = document.getElementById("output");
var targetLang = document.getElementById("target-lang");
var modeSelect = document.getElementById("mode-select");
var dialectChips = document.querySelectorAll(".flag-btn");
var workspace = document.getElementById("workspace");
var dictPane = document.getElementById("dict-pane");
var dictPopup = document.getElementById("dict-popup");
var notesEditor = document.getElementById("notes-editor");
var noteSelector = document.getElementById("note-selector");
var notesPane = document.getElementById("notes-pane");
var lineNumbers = document.getElementById("line-numbers");
var currentDialect = "tn-latn";
var isLayoutRow = false;
var soundEnabled = localStorage.getItem("baydaSound") !== "false";
var audioCtx = null;
function playSound(type) {
  if (!soundEnabled) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  if (type === "click") {
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } else if (type === "success") {
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } else if (type === "error") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  }
}
document.addEventListener("click", (e) => {
  const target = e.target;
  if (target.tagName === "BUTTON" || target.closest("button")) playSound("click");
});
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === "success" ? "\u2705" : "\u274C"}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("hiding");
    toast.addEventListener("animationend", () => toast.remove());
  }, 3e3);
}
window.openSettings = () => {
  document.getElementById("settings-modal")?.classList.add("active");
  updateSoundUI();
};
window.closeSettings = () => {
  document.getElementById("settings-modal")?.classList.remove("active");
};
window.changeFontSize = (val) => {
  document.documentElement.style.setProperty("--font-base", val + "px");
  localStorage.setItem("baydaFontSize", val);
};
function updateSoundUI() {
  const soundBtn = document.getElementById("toggle-sound-setting");
  if (soundBtn) soundBtn.textContent = soundEnabled ? "\u{1F50A} \u0645\u0641\u0639\u0644" : "\u{1F507} \u0645\u0639\u0637\u0644";
}
window.toggleSoundFromSettings = () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem("baydaSound", String(soundEnabled));
  updateSoundUI();
};
window.clearAllData = () => {
  if (confirm("\u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F \u0645\u0646 \u0645\u0633\u062D \u0643\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A\u061F")) {
    localStorage.clear();
    location.reload();
  }
};
var themes = ["light", "dark", "comfort"];
var themeIcons = { light: "\u2600\uFE0F", dark: "\u{1F319}", comfort: "\u{1F441}\uFE0F" };
var currentThemeIndex = 0;
window.cycleTheme = () => {
  currentThemeIndex = (currentThemeIndex + 1) % themes.length;
  const newTheme = themes[currentThemeIndex];
  document.body.setAttribute("data-theme", newTheme);
  document.getElementById("theme-toggle-btn").innerText = themeIcons[newTheme];
  saveState();
};
window.toggleLayout = () => {
  isLayoutRow = !isLayoutRow;
  if (isLayoutRow) {
    workspace.classList.remove("layout-col");
    workspace.classList.add("layout-row");
  } else {
    workspace.classList.remove("layout-row");
    workspace.classList.add("layout-col");
  }
};
window.toggleDictionary = () => {
  const mode = document.body.getAttribute("data-mode");
  const btn = document.getElementById("side-toggle-btn");
  if (mode === "pro") {
    if (notesPane) {
      if (notesPane.classList.contains("hidden")) {
        notesPane.classList.remove("hidden");
        if (btn) btn.textContent = "\u{1F4DD}";
      } else {
        notesPane.classList.add("hidden");
        if (btn) btn.textContent = "\u{1F441}\uFE0F";
      }
    }
  } else {
    if (dictPane) {
      if (dictPane.classList.contains("hidden")) {
        dictPane.classList.remove("hidden");
        if (btn) btn.textContent = "\u{1F4D6}";
      } else {
        dictPane.classList.add("hidden");
        if (btn) btn.textContent = "\u{1F441}\uFE0F";
      }
    }
  }
};
window.togglePane = (paneId, btn) => {
  const pane = document.getElementById(paneId);
  if (!pane) return;
  if (pane.classList.contains("pane-minimized")) {
    pane.classList.remove("pane-minimized");
    btn.textContent = "-";
  } else {
    pane.classList.add("pane-minimized");
    btn.textContent = "+";
  }
};
window.closeDictPopup = () => {
  dictPopup.classList.remove("active");
};
var kidThemeIndex = 0;
var kidThemes = ["candy", "jungle", "ocean"];
window.changeKidTheme = () => {
  kidThemeIndex = (kidThemeIndex + 1) % kidThemes.length;
  document.body.setAttribute("data-kid-theme", kidThemes[kidThemeIndex]);
};
window.readOutput = () => {
  const text = output.textContent || "";
  if (!text || text === "// \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0647\u0646\u0627...") return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ar-SA";
  utterance.rate = 0.9;
  utterance.pitch = 1.2;
  window.speechSynthesis.speak(utterance);
};
window.magicCode = () => {
  const magics = ['ktab("You are a superstar! \u2B50")\nidha (haqq) {\n    ktab("Keep coding! \u{1F680}")\n}', 'ktab("I love pizza! \u{1F355}")', 'goul("Hello World! \u{1F30D}")', 'kteb("Bahja! \u{1F389}")'];
  editor.value = magics[Math.floor(Math.random() * magics.length)];
  saveState();
  updateLineNumbers();
};
function saveState() {
  const state = { code: editor.value, mode: document.body.getAttribute("data-mode"), theme: document.body.getAttribute("data-theme"), dialect: currentDialect };
  localStorage.setItem("baydaLabState", JSON.stringify(state));
}
async function loadState() {
  const savedFontSize = localStorage.getItem("baydaFontSize");
  if (savedFontSize) {
    document.documentElement.style.setProperty("--font-base", savedFontSize + "px");
    const slider = document.getElementById("font-size-slider");
    if (slider) slider.value = savedFontSize;
  }
  const saved = localStorage.getItem("baydaLabState");
  if (saved) {
    try {
      const state = JSON.parse(saved);
      if (state.theme) {
        document.body.setAttribute("data-theme", state.theme);
        currentThemeIndex = themes.indexOf(state.theme);
        if (currentThemeIndex === -1) currentThemeIndex = 0;
        document.getElementById("theme-toggle-btn").innerText = themeIcons[themes[currentThemeIndex]];
      }
      if (state.mode) {
        document.body.setAttribute("data-mode", state.mode);
        modeSelect.value = state.mode;
        updateModeUI(state.mode);
      }
      if (state.dialect) await changeDialect(state.dialect);
      if (state.code) {
        editor.value = state.code;
        updateLineNumbers();
      }
    } catch (e) {
      console.error(e);
    }
  } else {
    await changeDialect("tn-latn");
    document.getElementById("consent-modal").classList.add("active");
  }
}
var notes = JSON.parse(localStorage.getItem("baydaNotesList") || "[]");
var currentNoteId = null;
function saveNotesToStorage() {
  localStorage.setItem("baydaNotesList", JSON.stringify(notes));
}
function renderNoteSelector() {
  noteSelector.innerHTML = "";
  notes.forEach((note, index) => {
    const opt = document.createElement("option");
    opt.value = note.id;
    opt.textContent = note.title || `\u0645\u0644\u0627\u062D\u0638\u0629 ${index + 1}`;
    noteSelector.appendChild(opt);
  });
  if (currentNoteId) noteSelector.value = currentNoteId;
}
window.createNewNote = () => {
  const newNote = { id: Date.now().toString(), title: "\u0645\u0644\u0627\u062D\u0638\u0629 \u062C\u062F\u064A\u062F\u0629", content: "" };
  notes.unshift(newNote);
  currentNoteId = newNote.id;
  saveNotesToStorage();
  renderNoteSelector();
  loadSelectedNote();
};
window.deleteCurrentNote = () => {
  if (!currentNoteId) return;
  if (confirm("\u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F \u0645\u0646 \u062D\u0630\u0641 \u0647\u0630\u0647 \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0629\u061F")) {
    notes = notes.filter((n) => n.id !== currentNoteId);
    currentNoteId = notes.length > 0 ? notes[0].id : null;
    saveNotesToStorage();
    renderNoteSelector();
    loadSelectedNote();
  }
};
window.loadSelectedNote = () => {
  currentNoteId = noteSelector.value;
  const note = notes.find((n) => n.id === currentNoteId);
  notesEditor.innerHTML = note ? note.content : "";
};
notesEditor?.addEventListener("input", () => {
  const note = notes.find((n) => n.id === currentNoteId);
  if (note) {
    note.content = notesEditor.innerHTML;
    const textContent = notesEditor.innerText.trim();
    note.title = textContent.substring(0, 15) + (textContent.length > 15 ? "..." : "") || "\u0645\u0644\u0627\u062D\u0638\u0629 \u0641\u0627\u0631\u063A\u0629";
    saveNotesToStorage();
    const opt = noteSelector.querySelector(`option[value="${note.id}"]`);
    if (opt) opt.textContent = note.title;
  }
});
window.formatDoc = (cmd, value = void 0) => {
  document.execCommand(cmd, false, value);
  notesEditor.focus();
};
window.insertSym = (sym) => {
  if (!notesEditor) return;
  document.execCommand("insertText", false, sym);
  notesEditor.focus();
  playSound("click");
};
if (notes.length === 0) {
  window.createNewNote();
} else {
  currentNoteId = notes[0].id;
  renderNoteSelector();
  loadSelectedNote();
}
var greetings = { "tn-latn": 'goul("Aslema")\nidha (s7i7) {\n    goul("Marhba bik")\n}', "dz-latn": 'ktab("Salam")\nila (sah) {\n    ktab("Marhba")\n}', "ly-latn": 'kteb("Salam")\nkan (sahih) {\n    kteb("Marhba")\n}', "mr-latn": 'ktab("Salam")\nidha (haqq) {\n    ktab("Marhba")\n}', "kab-latn": 'aru("Azul")\nma (tidett) {\n    aru("Ansuf")\n}', "shi-latn": 'skr("Azul")\nma (tidtt) {\n    skr("Marhba")\n}' };
window.acceptConsent = () => {
  document.getElementById("consent-modal").classList.remove("active");
  changeDialect("tn-latn");
  saveState();
};
window.declineConsent = () => {
  document.getElementById("consent-modal").classList.remove("active");
  changeDialect("tn-latn");
  saveState();
};
async function changeDialect(dialectId) {
  currentDialect = dialectId;
  dialectChips.forEach((chip) => {
    if (chip.getAttribute("data-dialect") === dialectId) chip.classList.add("active");
    else chip.classList.remove("active");
  });
  try {
    const keywordsMap = allKeywords[dialectId] || {};
    const vocabMap = allVocabularies[dialectId] || {};
    updateDictionary(vocabMap);
    editor.value = greetings[dialectId] || greetings["tn-latn"];
    window.currentKeywordsMap = keywordsMap;
    updateLineNumbers();
  } catch (error) {
    console.error("Error loading dialect:", error);
  }
}
function updateDictionary(vocab) {
  const chipsContainer = document.getElementById("dict-chips");
  if (!chipsContainer) return;
  chipsContainer.innerHTML = "";
  Object.keys(vocab).slice(0, 15).forEach((word) => {
    const chip = document.createElement("span");
    chip.className = "dict-chip";
    chip.textContent = word;
    chip.onclick = () => {
      document.getElementById("dw-word").textContent = word;
      document.getElementById("dw-ar").textContent = "\u0627\u0644\u0645\u0639\u0646\u0649: " + vocab[word];
      dictPopup.classList.add("active");
    };
    chipsContainer.appendChild(chip);
  });
}
dialectChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const dialect = chip.getAttribute("data-dialect");
    if (dialect) {
      changeDialect(dialect);
      saveState();
    }
  });
});
function updateModeUI(mode) {
  const standardThemes = document.getElementById("standard-theme-controls");
  const kidThemesControls = document.getElementById("kid-theme-controls");
  const btn = document.getElementById("side-toggle-btn");
  if (mode === "kid") {
    standardThemes?.classList.add("hidden");
    kidThemesControls?.classList.remove("hidden");
    document.body.setAttribute("data-kid-theme", "candy");
  } else {
    kidThemesControls?.classList.add("hidden");
    standardThemes?.classList.remove("hidden");
    document.body.removeAttribute("data-kid-theme");
  }
  if (mode === "pro") {
    if (btn) btn.textContent = "\u{1F4DD}";
    dictPane?.classList.add("hidden");
    notesPane?.classList.remove("hidden");
  } else {
    if (btn) btn.textContent = "\u{1F4D6}";
    notesPane?.classList.add("hidden");
    dictPane?.classList.remove("hidden");
  }
}
modeSelect?.addEventListener("change", (e) => {
  const mode = e.target.value;
  document.body.setAttribute("data-mode", mode);
  updateModeUI(mode);
  saveState();
});
function updateLineNumbers() {
  const lines = editor.value.split("\n").length;
  if (lineNumbers) {
    lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join("<br>");
  }
}
editor.addEventListener("scroll", () => {
  if (lineNumbers) lineNumbers.scrollTop = editor.scrollTop;
});
window.switchTab = (tab) => {
  const viewLab = document.getElementById("view-lab");
  const viewLearn = document.getElementById("view-learn");
  const footerRun = document.getElementById("footer-run");
  const tabLabBtn = document.getElementById("tab-lab-btn");
  const tabLearnBtn = document.getElementById("tab-learn-btn");
  if (!viewLab || !viewLearn || !footerRun || !tabLabBtn || !tabLearnBtn) return;
  if (tab === "lab") {
    viewLab.style.display = "flex";
    viewLearn.style.display = "none";
    tabLabBtn.classList.add("active");
    tabLearnBtn.classList.remove("active");
    footerRun.style.display = "flex";
  } else {
    viewLab.style.display = "none";
    viewLearn.style.display = "flex";
    tabLabBtn.classList.remove("active");
    tabLearnBtn.classList.add("active");
    footerRun.style.display = "none";
  }
  playSound("click");
};
window.resetLesson = () => {
  const editor2 = document.getElementById("lesson-editor");
  if (editor2) editor2.value = "";
  const feedback = document.getElementById("lesson-feedback");
  if (feedback) feedback.className = "lesson-feedback hidden";
};
window.insertToLesson = (sym) => {
  const lessonEditor = document.getElementById("lesson-editor");
  if (!lessonEditor) return;
  const start = lessonEditor.selectionStart;
  const end = lessonEditor.selectionEnd;
  const text = lessonEditor.value;
  lessonEditor.value = text.substring(0, start) + sym + text.substring(end);
  lessonEditor.selectionStart = lessonEditor.selectionEnd = start + sym.length;
  lessonEditor.focus();
  playSound("click");
};
function containsString(node, target) {
  if (!node) return false;
  if (node.type === "StringLiteral" && node.value === target) return true;
  if (node.type === "String" && node.value === target) return true;
  if (node.type === "Program") {
    return node.body.some((child) => containsString(child, target));
  }
  if (node.type === "Call") {
    return node.args.some((child) => containsString(child, target));
  }
  if (node.type === "If") {
    return containsString(node.test, target) || node.then.some((child) => containsString(child, target)) || (node.else ? node.else.some((child) => containsString(child, target)) : false);
  }
  if (node.type === "BinaryExpression") {
    return containsString(node.left, target) || containsString(node.right, target);
  }
  return false;
}
window.checkLesson = () => {
  const lessonEditor = document.getElementById("lesson-editor");
  if (!lessonEditor) return;
  let rawCode = lessonEditor.value;
  rawCode = rawCode.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  const code = rawCode.trim();
  if (!code) {
    showToast("\u274C \u0627\u0644\u0631\u062C\u0627\u0621 \u0643\u062A\u0627\u0628\u0629 \u0643\u0648\u062F \u0623\u0648\u0644\u0627\u064B.", "error");
    playSound("error");
    return;
  }
  try {
    const keywordsMap = window.currentKeywordsMap || {};
    if (Object.keys(keywordsMap).length === 0) {
      showToast("\u274C \u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0644\u0647\u062C\u0629...", "error");
      return;
    }
    const { ast } = translate(code, { keywords: keywordsMap, target: "js" });
    if (containsString(ast, "salam")) {
      showToast("\u{1F389} \u0625\u062C\u0627\u0628\u0629 \u0635\u062D\u064A\u062D\u0629! \u0644\u0642\u062F \u062A\u0639\u0644\u0645\u062A \u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0628\u0646\u062C\u0627\u062D.", "success");
      playSound("success");
    } else {
      showToast("\u26A0\uFE0F \u0627\u0644\u0635\u064A\u0627\u063A\u0629 \u0635\u062D\u064A\u062D\u0629\u060C \u0644\u0643\u0646 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0637\u0628\u0639 \u0643\u0644\u0645\u0629 'salam' \u0628\u0627\u0644\u062A\u062D\u062F\u064A\u062F.", "error");
      playSound("error");
    }
  } catch (error) {
    showToast("\u274C \u062E\u0637\u0623 \u0628\u0631\u0645\u062C\u064A: " + error.message, "error");
    playSound("error");
  }
};
document.getElementById("run-btn")?.addEventListener("click", () => {
  const code = editor.value;
  output.innerHTML = "";
  try {
    const keywordsMap = window.currentKeywordsMap;
    if (!keywordsMap) return alert("\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0644\u0647\u062C\u0629...");
    const { code: result } = translate(code, { keywords: keywordsMap, target: targetLang.value === "js" ? "js" : "py" });
    output.textContent = result;
    output.style.color = "var(--primary)";
    playSound("success");
  } catch (error) {
    output.textContent = "Error: " + error.message;
    output.style.color = "#ef4444";
    playSound("error");
  }
});
if (editor) editor.addEventListener("input", () => {
  updateLineNumbers();
  saveState();
});
loadState();
