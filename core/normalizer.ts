import { Token } from "./lexer.js";

const keywords: Record<string, string> = {
  "achou": "WHAT",
  "ach": "WHAT",
  "bayda": "SHOW",
  "wrin": "WHERE",
  "kifach": "HOW",
  "kif": "HOW",
  "fin": "WHERE",
  "achno": "WHAT",
};

export function normalize(tokens: Token[]): Token[] {
  const out: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === "IDENT") {
      const n = tokens[i + 1];
      const pair = n && n.type === "IDENT"? t.value + " " + n.value : "";
      if (pair && Object.prototype.hasOwnProperty.call(keywords, pair)) {
        out.push({...t, type: "KEYWORD", value: keywords[pair] });
        i++;
      } else if (Object.prototype.hasOwnProperty.call(keywords, t.value)) {
        out.push({...t, type: "KEYWORD", value: keywords[t.value] });
      } else out.push(t);
    } else {
      out.push(t);
    }
  }
  return out;
}
