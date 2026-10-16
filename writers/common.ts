import type { Token } from "../core/lexer.js";

const wordy = (t: Token) => t.type === "IDENT" || t.type === "KEYWORD" || t.type === "NUMBER";

export const quote = (s: string) => JSON.stringify(s);
export const LOG = new Set(["print", "log", "console.log"]);
export const arg = (a: { type: string; value: string }) => (a.type === "String" ? quote(a.value) : a.value);

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
