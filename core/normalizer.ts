import { Token } from "./lexer.js";

/**
 * خريطة كلمات اللهجة: كلمة اللهجة → المفهوم القياسي (concept).
 * مثال: { "goul": "print", "idha": "if", "idha ken": "else if" }
 */
export type KeywordMap = Record<string, string>;

/** يقبل إمّا خريطة (word→concept) أو مجموعة كلمات (توافقية للخلف). */
export type NormalizerInput = KeywordMap | Set<string>;

function toMap(keywords: NormalizerInput | undefined): KeywordMap {
  if (!keywords) return {};
  if (keywords instanceof Set) {
    const m: KeywordMap = {};
    for (const k of keywords) m[k] = k;
    return m;
  }
  return keywords;
}

/**
 * يحوّل رموز اللهجة إلى رموز مفاهيمية قياسية.
 *
 * - يعمل مع أي لهجة اعتماداً على خريطتها (لا قائمة صلبة).
 * - يدعم العبارات المركّبة (`idha ken` → `else if`) ويطابق الأطول أولاً.
 * - لا يطابق عبر الأسطر (يشترط نفس السطر للعبارة المركّبة).
 * - يترك النصوص والأرقام والرموز كما هي.
 */
export function normalize(tokens: Token[], keywords: NormalizerInput = {}): Token[] {
  const map = toMap(keywords);

  // مفاتيح العبارات المركّبة، مرتّبة تنازلياً حسب عدد الكلمات (الأطول أولاً)
  const phraseKeys = Object.keys(map)
    .filter((k) => /\s/.test(k))
    .sort((a, b) => b.trim().split(/\s+/).length - a.trim().split(/\s+/).length);

  const out: Token[] = [];
  let i = 0;

  while (i < tokens.length) {
    const t = tokens[i];

    // النصوص والأرقام والرموز تُمرَّر كما هي
    if (t.type === "STRING" || t.type === "NUMBER" || t.type === "SYMBOL" || t.type === "EOF") {
      out.push(t);
      i++;
      continue;
    }

    // 1) محاولة مطابقة عبارة مركّبة (على نفس السطر)
    let matched = false;
    for (const phrase of phraseKeys) {
      const words = phrase.trim().split(/\s+/);
      if (i + words.length > tokens.length) continue;

      let ok = true;
      for (let k = 0; k < words.length; k++) {
        const tk = tokens[i + k];
        if (
          !tk ||
          (tk.type !== "IDENT" && tk.type !== "KEYWORD") ||
          tk.value !== words[k] ||
          tk.line !== t.line
        ) {
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

    // 2) مطابقة كلمة واحدة
    if ((t.type === "IDENT" || t.type === "KEYWORD") && Object.prototype.hasOwnProperty.call(map, t.value)) {
      out.push({ ...t, type: "KEYWORD", value: map[t.value] });
    } else {
      out.push(t);
    }
    i++;
  }

  return out;
}
