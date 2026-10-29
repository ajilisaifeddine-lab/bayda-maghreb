// أمثلة مدمجة دائماً في المختبر (تعمل بلا اتصال) — للعرض والتجربة فقط.
// مصدرها packages/ ويفحصها tests/lab-examples.test.ts: أي انحراف عن الحزم الأصلية يفشل الاختبار.
// الحزم الكاملة تُنزَّل من النواة بطلب المستخدم ولا تُدمج هنا.

export interface DialectExample {
  sample: string;
  keywords: Record<string, string>;
  vocabulary: Record<string, string>;
}

export const examples: Record<string, DialectExample> = {
  "dz-latn": {
    "sample": "ktab(\"Salam\")\nila (sah) {\n    ktab(\"Marhba\")\n}",
    "keywords": {
      "ktab": "print",
      "ila": "if",
      "sah": "true"
    },
    "vocabulary": {
      "خلاص": "end",
      "كمل": "end",
      "و": "and",
      "ولا": "or",
      "ماشي": "not",
      "جيب": "input",
      "دخل": "input",
      "أقرا": "input"
    }
  },
  "kab-latn": {
    "sample": "aru(\"Azul\")\nma (tidett) {\n    aru(\"Ansuf\")\n}",
    "keywords": {
      "aru": "print",
      "ma": "if",
      "tidett": "true"
    },
    "vocabulary": {
      "neɣ": "or",
      "amar": "and",
      "ur": "not",
      "ulac": "empty",
      "semsawi": "equal",
      "ameqqran": "greater",
      "ameẓyan": "less",
      "yella": "exists"
    }
  },
  "kab-tifinagh": {
    "sample": "ⴽⵜⴰⴱ(\"ⴰⵣⵓⵍ\")\nⵎⴰ (ⵀⴰⵇⵇ) {\n    ⴽⵜⴰⴱ(\"ⴰⵏⵙⵓⴼ\")\n}",
    "keywords": {
      "ⴽⵜⴰⴱ": "print",
      "ⵎⴰ": "if",
      "ⵀⴰⵇⵇ": "true"
    },
    "vocabulary": {
      "ⴰⵣⵓⵍ": "أهلاً",
      "ⵜⴰⵎⴰⵣⵉⵖⵜ": "أمازيغية",
      "ⴰⵎⴰⵏ": "ماء",
      "ⴰⵖⵔⵓⵎ": "خبز",
      "ⵜⴰⴼⴰⵜ": "ضوء"
    }
  },
  "ly-latn": {
    "sample": "kteb(\"Salam\")\nkan (sahih) {\n    kteb(\"Marhba\")\n}",
    "keywords": {
      "kteb": "print",
      "kan": "if",
      "sahih": "true"
    },
    "vocabulary": {
      "و": "and",
      "ولا": "or",
      "مش": "not",
      "موش": "not",
      "أو": "or",
      "لكل": "foreach",
      "لكل واحد": "foreach",
      "حاجة وتخلاص": "variable"
    }
  },
  "mr-latn": {
    "sample": "ktab(\"Salam\")\nidha (haqq) {\n    ktab(\"Marhba\")\n}",
    "keywords": {
      "ktab": "print",
      "idha": "if",
      "haqq": "true"
    },
    "vocabulary": {
      "أهلا": "hello",
      "هلا": "hi",
      "سلام": "salam",
      "باي": "bye",
      "ميرسي": "thanks",
      "واخا": "ok",
      "أيه": "yes",
      "نو": "no"
    }
  },
  "shi-latn": {
    "sample": "skr(\"Azul\")\nma (tidtt) {\n    skr(\"Marhba\")\n}",
    "keywords": {
      "skr": "print",
      "ma": "if",
      "tidtt": "true"
    },
    "vocabulary": {
      "salam": "سلام",
      "azul": "أهلاً",
      "tamazight": "أمازيغية",
      "amarg": "شوق",
      "tifawin": "ضوء",
      "aman": "ماء",
      "aghbalu": "خبز"
    }
  },
  "tn-latn": {
    "sample": "goul(\"Aslema\")\nidha (s7i7) {\n    goul(\"Marhba bik\")\n}",
    "keywords": {
      "goul": "print",
      "idha": "if",
      "s7i7": "true"
    },
    "vocabulary": {
      "salam": "سلام",
      "ahla": "أهلاً",
      "barcha": "كثير",
      "chwaya": "قليل",
      "behi": "جيد",
      "5ayb": "سيء",
      "khayb": "سيء",
      "chbeb": "جميل"
    }
  }
};
