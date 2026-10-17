import { Token } from "./lexer";

export function normalize(tokens: Token[], keywords: Set<string> = new Set()): Token[] {
  const out: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === "IDENT") {
      const n = tokens[i + 1];
      const pair = n && n.type === "IDENT" ? t.value + " " + n.value : "";
      if (pair === "idha ken") {
        out.push({ ...t, type: "KEYWORD", value: "else if" });
        i++;
      } else if (["idha", "ken", "sinon", "wella", "goul", "ktab"].includes(t.value)) {
        out.push({ 
          ...t, 
          type: "KEYWORD", 
          value: t.value === "goul" || t.value === "ktab" ? "log" : // تغيير print إلى log
                 t.value === "sinon" || t.value === "wella" ? "else" : 
                 t.value === "idha" ? "if" : t.value 
        });
      } else {
        out.push(t);
      }
    } else {
      out.push(t);
    }
  }
  return out;
}
