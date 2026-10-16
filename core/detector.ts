/**
 * Bayda Maghreb - كاشف الفرانكو / Franco Detector
 * يكتشف هل النص مكتوب فرانكو-عربي / Detects Franco-Arabic
 */

export type ScriptType = 'franco' | 'arabic' | 'latin' | 'tifinagh' | 'mixed' | 'unknown';
// نوع الخط / Script Type

const FRANCO_INDICATORS = {
  numbers: /[0-9]/, // ارقام فرانكو 3,7,9 / franco numbers
  francoChars: /[a-zA-Z]/,
  arabicNumbers: /[3|7|9|5]/, // 3=ع, 7=ح, 9=ق, 5=خ
};

const ARABIC_REGEX = /[\u0600-\u06FF]/; // عربي / Arabic
const TIFINAGH_REGEX = /[\u2D30-\u2D7F]/; // تيفيناغ / Tifinagh
const LATIN_REGEX = /^[a-zA-Z\s.,!?'-]+$/; // لاتيني / Latin

/**
 * هل النص فرانكو؟ / Is text Franco?
 * مثال / Example: "achou", "7ag", "3andek", "kifach"
 */
export function isFranco(text: string): boolean {
  if (!text || text.trim().length < 2) return false;
  
  // اذا فيه عربي -> ليس فرانكو / If Arabic -> not franco
  if (ARABIC_REGEX.test(text)) return false;
  if (TIFINAGH_REGEX.test(text)) return false;

  const lower = text.toLowerCase();
  
  // انماط فرانكو كلاسيكية / Classic franco patterns
  const patterns = [
    /\b[a-z]+[0-9][a-z0-9]*\b/, // 7ag, 3andek, 9albi / حاق، عندك، قلبي
    /[0-9][a-z]+/, // 3afak / عافاك
    /\b(kif|ach|3la|m3a|7na|9al|ch|kh|gh)\w*\b/i, // كيف، اش، على
    /\b\w*(ou|aa|ii|ou)\b/i, // achou, laa / اشو، لا
  ];

  // يجب ان يحتوي لاتيني + يشبه لهجة / Must contain latin + dialect look
  if (!/[a-z]/i.test(text)) return false;

  return patterns.some(p => p.test(lower)) || 
         (/\d/.test(text) && /[a-z]/i.test(text));
}

/**
 * كشف نوع الخط / Detect script type
 */
export function detectScript(text: string): ScriptType {
  if (!text.trim()) return 'unknown'; // فارغ / empty
  
  const hasArabic = ARABIC_REGEX.test(text); // عربي موجود؟
  const hasTifinagh = TIFINAGH_REGEX.test(text); // تيفيناغ؟
  const hasFranco = isFranco(text); // فرانكو؟
  const hasLatin = /[a-zA-Z]/.test(text); // لاتيني؟

  if (hasArabic && hasLatin) return 'mixed'; // مختلط / mixed
  if (hasArabic) return 'arabic'; // عربي / arabic
  if (hasTifinagh) return 'tifinagh'; // تيفيناغ
  if (hasFranco) return 'franco'; // فرانكو
  if (hasLatin) return 'latin'; // لاتيني
  
  return 'unknown'; // مجهول / unknown
}

/**
 * تلميح اللهجة / Dialect hint
 */
export function detectDialectHint(text: string): string[] {
  const hints: string[] = [];
  const lower = text.toLowerCase();
  
  // مغاربي عام / general maghrebi
  if (/\b(ach|kifach|oulach|wach|bayda)\b/.test(lower)) hints.push('maghrebi');
  // قبايلي / kabyle
  if (/\b(azul|acu|ulac|dachu)\b/.test(lower)) hints.push('kabyle');
  // تونسي / tunisian
  if (/\b(yak|barsha|fama|tawa)\b/.test(lower)) hints.push('tunisian');
  // جزائري-مغربي / algerian-moroccan
  if (/\b(wash|3lach|bzaf|mzyan)\b/.test(lower)) hints.push('algerian-moroccan');
  
  return hints;
}
