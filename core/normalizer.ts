import { Token } from "./lexer.js";
export function normalize(tokens: Token[], keywords: Record<string, string> = {}): Token[] {
  const out: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type !== "IDENT") { out.push(t); continue; }
    const n = tokens[i + 1];
    const pair = n && n.type === "IDENT" ? t.value + " " + n.value : "";
    if (pair && Object.hasOwn(keywords, pair)) {
      out.push({ ...t, type: "KEYWORD", value: keywords[pair] });
      i++;
    } else if (Object.hasOwn(keywords, t.value)) {
      out.push({ ...t, type: "KEYWORD", value: keywords[t.value] });
    } else out.push(t);
  }
  return out;
}
