import { Token } from "./lexer.js";
export type Arg = { type: "String" | "Number" | "Ident"; value: string };
export type Call = { type: "Call"; name: string; args: Arg[] };
export type Program = { type: "Program"; body: Call[] };

export function parseProgram(tokens: Token[]): Program {
  const body: Call[] = [];
  let i = 0;
  const fail = (t: Token) => { throw new Error(`Unexpected "${t.value}" at line ${t.line}, col ${t.col}`); };
  while (i < tokens.length && tokens[i].type !== "EOF") {
    const t = tokens[i];
    if (t.type === "NEWLINE" || (t.type === "SYMBOL" && t.value === ";")) { i++; continue; }
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
    body.push({ type: "Call", name: t.value, args });
  }
  return { type: "Program", body };
}
