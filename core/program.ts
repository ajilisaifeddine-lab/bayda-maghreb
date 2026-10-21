import { Token } from "./lexer";
export type Arg = { type: "String" | "Number" | "Ident"; value: string } | { type: "Raw"; tokens: Token[] };
export type Call = { type: "Call"; name: string; args: Arg[] };
export type Expr = { type: "Raw"; tokens: Token[] };
export type If = { type: "If"; test: Expr; then: Stmt[]; else: Stmt[] | null };
export type Stmt = Call | If;
export type Program = { type: "Program"; body: Stmt[] };
export function parseProgram(tokens: Token[]): Program {
 



 let i = 0;
  const fail = (t: Token) => { throw new Error(`Unexpected "${t.value}" at line ${t.line}, col ${t.col}`); };
  const isSym = (t: Token | undefined, v: string) => !!t && t.type === "SYMBOL" && t.value === v;
  const skip = () => { while (tokens[i] && (tokens[i].type === "SYMBOL" && ['\n', ';', ' '].includes(tokens[i].value))) i++; };
  




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
    else if (one && (one.type === "IDENT" || one.type === "KEYWORD")) {
      // مفاهيم منطقية قياسية (بعد التطبيع): true / false
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
    if (a.type === "SYMBOL" && a.value === "\n") { i++; continue; }
    if (a.type === "SYMBOL" && a.value === " ") { i++; continue; }
    
    if (isSym(a, ")") && depth === 0) break;
    if (isSym(a, ",") && depth === 0) { flush(); i++; continue; }

    if (isSym(a, "(")) depth++;
    else if (isSym(a, ")")) depth--;
    cur.push(a);
    i++;
  }
  flush();
  i++; // تخطي القوس المغلق
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
    if (nx && nx.type === "KEYWORD" && nx.value === "else if") { i = j; other = [parseIf()]; }
    else if (nx && nx.type === "KEYWORD" && nx.value === "else") { i = j + 1; other = parseBlock(); }
    return { type: "If", test: { type: "Raw", tokens: stripParens(test) }, then, else: other };
  };
const parseWhile = (): Stmt => {
  i++; // تخطي الكلمة المفتاحية while
  const test: Token[] = [];
  let depth = 0;
  
  // جمع شرط الحلقة بين الأقواس
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
  // إرجاع العقدة الجديدة (متوافقة مع التعديل السابق في ast.ts)
  
return { type: "While", test: { type: "Raw", tokens: stripParens(test) }, body } as any;
};
const parseStmt = (): Stmt => {
    const t = tokens[i];
    if (t.type === "KEYWORD" && t.value === "if") return parseIf();
  if (t.type === "KEYWORD" && t.value === "while") return parseWhile();
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

