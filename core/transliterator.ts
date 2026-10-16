export interface TransliterationMap {
  franco: string;
  latin: string;
  tifinagh: string;
  arabic: string;
}

export const kabyleMap: TransliterationMap[] = [
  { franco: "achou", latin: "acu", tifinagh: "ⴰⵛⵓ", arabic: "أشو" },
  { franco: "oulach", latin: "ulac", tifinagh: "ⵓⵍⴰⵛ", arabic: "أولاش" },
  { franco: "3lach", latin: "ac", tifinagh: "ⴰⵛ", arabic: "علاش" },
  { franco: "kifach", latin: "amek", tifinagh: "ⴰⵎⴻⴽ", arabic: "كيفاش" },
  { franco: "wina", latin: "anssa", tifinagh: "ⴰⵏⵙⴰ", arabic: "وينا" },
  { franco: "yella", latin: "yella", tifinagh: "ⵢⴻⵍⵍⴰ", arabic: "يلا" },
];

export const hassaniMap: TransliterationMap[] = [
  { franco: "7ag", latin: "hag", tifinagh: "ⵃⴰⵇ", arabic: "حق" },
  { franco: "3andak", latin: "3andak", tifinagh: "ⵄⴰⵏⴷⴰⴽ", arabic: "عندك" },
  { franco: "yak", latin: "yak", tifinagh: "ⵢⴰⴽ", arabic: "ياك" },
];

const allMaps = [...kabyleMap,...hassaniMap];

export function detectScript(text: string): string {
  const lower = text.toLowerCase().trim();
  if (allMaps.some(m => m.franco === lower)) {
    if (/[0-9]/.test(lower) || ["achou","oulach","kifach","wina"].includes(lower)) return "franco";
  }
  if (/[0-9]/.test(text)) return "franco";
  if (/[\u2D30-\u2D7F]/.test(text)) return "tifinagh";
  if (/[\u0600-\u06FF]/.test(text)) return "arabic";
  return "latin";
}

export function transliterate(text: string, from: string, to: string): string {
  const lower = text.toLowerCase().trim();
  let found = allMaps.find((m: any) => m[from] === lower);
  if (!found) {
    found = allMaps.find((m: any) => Object.values(m).some((v: any) => v.toLowerCase() === lower));
  }
  if (!found) return text;
  return (found as any)[to];
}

export function suggestTransliteration(input: string) {
  const from = detectScript(input);
  const found = allMaps.find((m: any) => Object.values(m).some((v: any) => v.toLowerCase() === input.toLowerCase().trim()));
  if (!found) {
    return { input, detected: from, found: false };
  }
  return {
    input,
    detected: from,
    suggestions: {
      franco: found.franco,
      latin: found.latin,
      tifinagh: found.tifinagh,
      arabic: found.arabic,
    },
    message: "يقترح فقط - يتطلب موافقة المستخدم",
    requiresConsent: true
  };
}
