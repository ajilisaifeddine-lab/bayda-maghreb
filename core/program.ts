import { Token } from "./lexer.js";
export type Arg = { type: "String" | "Number" | "Ident"; value: string };
export type Call = { type: "Call"; name: string; args: Arg[] };
export type Expr = { type: "Raw"; tokens: Token[] };
export type If = { type: "If"; test: Expr; then: Stmt[]; else: Stmt[] | null };
export type Stmt = Call | If;
export type Program = { type: "Program"; body: Stmt[] };

export function parseProgram(tokens: Token[]): Program {
  let i = 0;
  const fail = (t: Token) => { throw new Error(`Unexpected "${t.value}" at line ${t.line}, col ${t.col}`); };
  const isSym = (t: Token | undefined, v: string) => !!t && t.type === "SYMBOL" && t.value === v;
  const skip = () => { while (tokens[i] && (tokens[i].type === "NEWLINE" || isSym(tokens[i], ":"))) i++; };

  const parseCall = (): Call => {
    const t = tokens[i];
    if (t.type !== "KEYWORD" && t.type !== "IDENT") fail(t);
    const open = tokens[i + 1];
    if (!open || open.type !== "SYMBOL" || open.value !== "(") fail(open || t);
    i += 2;
    const args: Arg[] = [];
    while (tokens[i] && !(tokens[i].type === "SYMBOL" && tokens[i].value === ")")) {
      const a = tokens[i];
      if (a.type === "SYMBOL" && a.value === ",") { i++; continue; }
      if (a.type === "STRING") args.push({ type: "String", value: a.value });
      else if (a.type === "NUMBER") args.push({ type: "Number", value: a.value });
      else if (a.type === "IDENT") args.push({ type: "Ident", value: a.value });
      else fail(a);
      i++;
    }
    if (!tokens[i]) fail(tokens[i - 1]);
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
    while (list.length > 1 && isSym(list[0], "(") && closeOf(list) === list.length - 1) list = list.slice(1, -1);
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
    while (tokens[j] && tokens[j].type === "NEWLINE") j++;
    const nx = tokens[j];
    let other: Stmt[] | null = null;
    if (nx && nx.type === "KEYWORD" && nx.value === "else if") { i = j; other = [parseIf()]; }
    else if (nx && nx.type === "KEYWORD" && nx.value === "else") { i = j + 1; other = parseBlock(); }
    return { type: "If", test: { type: "Raw", tokens: stripParens(test) }, then, else: other };
  };

  const parseStmt = (): Stmt => {
    const t = tokens[i];
    if (t.type === "KEYWORD" && t.value === "if") return parseIf();
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
