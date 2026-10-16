/**
 * Bayda Maghreb - المحول / Transliterator
 * القاموس + التحويل / Dictionary + Conversion
 * franco -> latin / arabic / tifinagh
 */

export interface TransliterationMap {
  franco: string; // فرانكو / franco
  latin: string; // لاتيني / latin
  tifinagh: string; // تيفيناغ
  arabic: string; // عربي / arabic
}

// قبايلي / Kabyle
export const kabyleMap: TransliterationMap[] = [
  { franco: "achou", latin: "acu", tifinagh: "ⴰⵛⵓ", arabic: "واشو" },
  { franco: "oulach", latin: "ulac", tifinagh: "ⵓⵍⴰⵛ", arabic: "ماكاينش" },
  { franco: "3lach", latin: "ac", tifinagh: "ⴰⵛ", arabic: "علاش" },
  { franco: "kifach", latin: "amek", tifinagh: "ⴰⵎⴻⴽ", arabic: "كيفاش" },
  { franco: "wina", latin: "anssa", tifinagh: "ⴰⵏⵙⴰ", arabic: "وين" },
  { franco: "yella", latin: "yella", tifinagh: "ⵢⴻⵍⵍⴰ", arabic: "كاين" },
];

// حساني / Hassani
export const hassaniMap: TransliterationMap[] = [
  { franco: "7ag", latin: "ḥag", tifinagh: "ⵃⴰⴳ", arabic: "حق" },
  { franco: "3andak", latin: "ʿandak", tifinagh: "ⵄⴰⵏⴷⴰⴽ", arabic: "عندك" },
  { franco: "yak", latin: "yak", tifinagh: "ⵢⴰⴽ", arabic: "ياك" },
];

const allMaps = [...kabyleMap,...hassaniMap]; // كل الخرائط / all maps

// كشف نوع الخط / Detect script
export function detectScript(text: string): string {
  const lower = text.toLowerCase().trim();
  if (allMaps.some(m => m.franco === lower)) {
    if (/[0-9]/.test(lower) || ["achou","oulach","kifach","wina"].includes(lower))
      return "franco"; // فرانكو / franco
  }
  if (/[0-9]/.test(text)) return "franco";
  if (/[\u2D30-\u2D7F]/.test(text)) return "tifinagh"; // تيفيناغ
  if (/[\u0600-\u06FF]/.test(text)) return "arabic"; // عربي
  return "latin"; // لاتيني
}

// تحويل مباشر / Direct transliteration
export function transliterate(text: string, from: string, to: string): string {
  const lower = text.toLowerCase().trim();
  let found = allMaps.find((m: any) => m[from] === lower);
  if (found) {
    found = allMaps.find((m: any) => Object.values(m).some((v: any) => v.toLowerCase() === lower));
  }
  if (!found) return text; // ارجاع الاصل اذا لم يوجد / return original
  return (found as any)[to];
}

// اقتراح شامل / Full suggestion
export function suggestTransliteration(input: string) {
  const from = detectScript(input); // كشف المصدر / detect source
  const found = allMaps.find((m: any) => Object.values(m).some((v: any) => v.toLowerCase() === input.toLowerCase().trim()));
  if (!found) {
    return { input, detected: from, found: false }; // غير موجود / not found
  }
  return {
    input, // الادخال / input
    detected: from, // مكتشف / detected
    suggestions: {
      franco: found.franco, // فرانكو
      latin: found.latin, // لاتيني
      tifinagh: found.tifinagh, // تيفيناغ
      arabic: found.arabic, // عربي
    },
    message: "محمي بملاحظة لغوية - requiresConsent",
    requiresConsent: true
  };
}
