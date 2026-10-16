import type { Token } from "../core/lexer.js";
import type { Arg } from "../core/program.js";

const wordy = (t: Token) => t.type === "IDENT" || t.type === "KEYWORD" || t.type === "NUMBER";

export const quote = (s: string) => JSON.stringify(s);
export const LOG = new Set(["print", "log", "console.log"]);
export const jsWord = (t: { type: string; value: string }) => t.value;
export const arg = (a: Arg, word: (t: Token) => string): string =>
  a.type === "String" ? quote(a.value) : a.type === "Raw" ? renderTokens(a.tokens, word) : a.value;

export function renderTokens(tokens: Token[], word: (t: Token) => string): string {
  let out = "";
  let prev: Token | undefined;
  for (const t of tokens) {
    if (prev && wordy(prev) && wordy(t)) out += " ";
    out += t.type === "STRING" ? quote(t.value) : word(t);
    prev = t;
  }
  return out;
}
