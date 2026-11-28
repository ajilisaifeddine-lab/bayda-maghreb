import type { Arg, Call, Flow, Fn, For, If, Program, Return, Stmt, Try, Var, While } from "./ast.js";
import type { Token } from "./types.js";

export function parseProgram(tokens: Token[]): Program {
  let i = 0;
  const fail = (t: Token) => { throw new Error(`Unexpected "${t.value}" at line ${t.line}, col ${t.col}`); };
  const isSym = (t: Token | undefined, v: string) => !!t && t.type === "SYMBOL" && t.value === v;
  const skip = () => { while (tokens[i] && tokens[i].type === "SYMBOL" && ["\n", ";", " "].includes(tokens[i].value)) i++; };
  const skipSpace = () => { while (tokens[i] && tokens[i].type === "SYMBOL" && (tokens[i].value === "\n" || tokens[i].value === " ")) i++; };

  const parseCall = (): Call => {
    const t = tokens[i];
    if (t.type !== "KEYWORD" && t.type !== "IDENT") fail(t);
    const open = tokens[i + 1];
    if (!open || open.type !== "SYMBOL" || open.value !== "(") fail(open || t);
    i += 2;
    const args: Arg[] = [];
    let cur: Token[] = [];
    let depth = 0;
    const flush = () => {
      if (!cur.length) return;
      const one = cur.length === 1 ? cur[0] : null;
      if (one && one.type === "STRING") args.push({ type: "String", value: one.value });
      else if (one && one.type === "NUMBER") args.push({ type: "Number", value: one.value });
      else args.push({ type: "Raw", tokens: cur });
      cur = [];
    };
    while (true) {
      const a = tokens[i];
      if (!a || a.type === "EOF") fail(a || tokens[i - 1]);
      if (a.type === "SYMBOL" && (a.value === "\n" || a.value === " ")) { i++; continue; }
      if (isSym(a, ")") && depth === 0) break;
      if (isSym(a, ",") && depth === 0) { flush(); i++; continue; }
      if (isSym(a, "(") || isSym(a, "[") || isSym(a, "{")) depth++;
      else if (isSym(a, ")") || isSym(a, "]") || isSym(a, "}")) depth--;
      cur.push(a);
      i++;
    }
    flush();
    i++;
    return { type: "Call", name: t.value, args };
  };

  const closeOf = (list: Token[]) => {
    let d = 0;
    for (let k = 0; k < list.length; k++) {
      if (isSym(list[k], "(")) d++;
      else if (isSym(list[k], ")")) { d--; if (d === 0) return k; }
    }
    return -1;
  };
  const stripParens = (list: Token[]): Token[] => {
    while (list.length > 1 && isSym(list[0], "(") && closeOf(list) === list.length - 1) return list.slice(1, -1);
    return list;
  };
  const parseBlock = (): Stmt[] => {
    if (!isSym(tokens[i], "{")) fail(tokens[i] || tokens[i - 1]);
    i++;
    const out: Stmt[] = [];
    while (true) {
      skip();
      const t = tokens[i];
      if (!t || t.type === "EOF") fail(t || tokens[i - 1]);
      if (isSym(t, "}")) { i++; return out; }
      out.push(parseStmt());
    }
  };
  const parseIf = (): If => {
    i++;
    const test: Token[] = [];
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
    let other: Stmt[] | null = null;
    if (nx && nx.type === "KEYWORD" && (nx.value === "else if" || nx.value === "else_if")) { i = j; other = [parseIf()]; }
    else if (nx && nx.type === "KEYWORD" && nx.value === "else") { i = j + 1; other = parseBlock(); }
    return { type: "If", test: { type: "Raw", tokens: stripParens(test) }, then, else: other };
  };
  const parseWhile = (): While => {
    i++;
    const test: Token[] = [];
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
    const body = parseBlock();
    return { type: "While", test: { type: "Raw", tokens: stripParens(test) }, body };
  };
  const collectExpr = (startLine: number): Token[] => {
    const expr: Token[] = [];
    let depth = 0;
    let line = startLine;
    while (tokens[i] && tokens[i].type !== "EOF") {
      const t = tokens[i];
      if (depth === 0 && (t.line > line || isSym(t, ";") || isSym(t, "}"))) break;
      if (isSym(t, "(") || isSym(t, "[") || isSym(t, "{")) depth++;
      else if (isSym(t, ")") || isSym(t, "]") || isSym(t, "}")) { if (depth === 0) fail(t); depth--; }
      line = t.line;
      expr.push(t);
      i++;
    }
    return expr;
  };
  const parseVar = (declare: boolean): Var => {
    if (declare) i++;
    const nameTok = tokens[i];
    if (!nameTok || nameTok.type !== "IDENT") fail(nameTok || tokens[i - 1]);
    const eq = tokens[i + 1];
    if (!isSym(eq, "=") || isSym(tokens[i + 2], "=")) fail(eq || nameTok);
    i += 2;
    const expr = collectExpr(eq.line);
    if (!expr.length) fail(tokens[i] || tokens[i - 1]);
    return { type: "Var", declare, name: nameTok.value, value: { type: "Raw", tokens: expr } };
  };
  const parseFor = (): For => {
    i++;
    const header: Token[] = [];
    let depth = 0;
    while (tokens[i] && tokens[i].type !== "EOF") {
      const t = tokens[i];
      if (isSym(t, "(")) depth++;
      else if (isSym(t, ")")) depth--;
      else if (isSym(t, "{") && depth === 0) break;
      header.push(t);
      i++;
    }
    const h = stripParens(header);
    if (h.length < 3 || h[0].type !== "IDENT" || !(isSym(h[1], ":") || (h[1].type === "KEYWORD" && h[1].value === "in"))) {
      fail(h[0] || tokens[i] || tokens[i - 1]);
    }
    const rhs = h.slice(2);
    let dotAt = -1;
    for (let k = 0; k + 1 < rhs.length; k++) {
      if (isSym(rhs[k], ".") && isSym(rhs[k + 1], ".")) { dotAt = k; break; }
    }
    const body = parseBlock();
    if (dotAt !== -1) {
      const startTokens = rhs.slice(0, dotAt);
      const endTokens = rhs.slice(dotAt + 2);
      if (!startTokens.length || !endTokens.length) fail(rhs[dotAt] || tokens[i - 1]);
      return { type: "For", variable: h[0].value, start: { type: "Raw", tokens: startTokens }, end: { type: "Raw", tokens: endTokens }, iterable: null, body };
    }
    return { type: "For", variable: h[0].value, start: null, end: null, iterable: { type: "Raw", tokens: rhs }, body };
  };
  const parseFn = (): Fn => {
    i++;
    const nameTok = tokens[i];
    if (!nameTok || nameTok.type !== "IDENT") fail(nameTok || tokens[i - 1]);
    i++;
    if (!isSym(tokens[i], "(")) fail(tokens[i] || nameTok);
    i++;
    const params: string[] = [];
    while (true) {
      skipSpace();
      const p = tokens[i];
      if (!p || p.type === "EOF") fail(p || tokens[i - 1]);
      if (isSym(p, ")")) { i++; break; }
      if (p.type !== "IDENT") fail(p);
      params.push(p.value);
      i++;
      skipSpace();
      if (isSym(tokens[i], ",")) { i++; continue; }
      if (!isSym(tokens[i], ")")) fail(tokens[i] || p);
    }
    const body = parseBlock();
    return { type: "Fn", name: nameTok.value, params, body };
  };
  const parseReturn = (): Return => {
    const retTok = tokens[i];
    i++;
    const expr = collectExpr(retTok.line);
    return { type: "Return", value: expr.length ? { type: "Raw", tokens: expr } : null };
  };
  const parseTry = (): Try => {
    i++;
    const body = parseBlock();
    skipSpace();
    const ct = tokens[i];
    if (!ct || ct.type !== "KEYWORD" || ct.value !== "catch") fail(ct || tokens[i - 1]);
    i++;
    let param: string | null = null;
    if (isSym(tokens[i], "(")) {
      i++;
      const p = tokens[i];
      if (!p || p.type !== "IDENT") fail(p || tokens[i - 1]);
      param = p.value;
      i++;
      if (!isSym(tokens[i], ")")) fail(tokens[i] || p);
      i++;
    }
    const handler = parseBlock();
    return { type: "Try", body, param, handler };
  };
  const parseFlow = (): Flow => {
    const t = tokens[i];
    i++;
    return { type: "Flow", kind: t.value as "break" | "continue" };
  };
  const parseStmt = (): Stmt => {
    const t = tokens[i];
    if (t.type === "KEYWORD" && t.value === "if") return parseIf();
    if (t.type === "KEYWORD" && t.value === "while") return parseWhile();
    if (t.type === "KEYWORD" && t.value === "for") return parseFor();
    if (t.type === "KEYWORD" && t.value === "function") return parseFn();
    if (t.type === "KEYWORD" && t.value === "return") return parseReturn();
    if (t.type === "KEYWORD" && t.value === "try") return parseTry();
    if (t.type === "KEYWORD" && (t.value === "break" || t.value === "continue")) return parseFlow();
    if (t.type === "KEYWORD" && (t.value === "let" || t.value === "const" || t.value === "var")) return parseVar(true);
    if (t.type === "IDENT" && isSym(tokens[i + 1], "=") && !isSym(tokens[i + 2], "=")) return parseVar(false);
    return parseCall();
  };
  const body: Stmt[] = [];
  while (true) {
    skip();
    if (i >= tokens.length || tokens[i].type === "EOF") break;
    body.push(parseStmt());
  }
  return { type: "Program", body };
}
