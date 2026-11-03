// أمثلة مدمجة دائماً في المختبر (تعمل بلا اتصال) — للعرض والتجربة فقط.
// مُولَّد بـ scripts/build-dialects.cjs (npm run dialects) من packages/ — لا تعدّله يدوياً.
// الحزم الكاملة تُنزَّل من النواة بطلب المستخدم ولا تُدمج هنا.

export interface DialectExample {
  sample: string;
  keywords: Record<string, string>;
  vocabulary: Record<string, string>;
}

export const examples: Record<string, DialectExample> = {
  "dz-arab": {
    "sample": "كتب(\"سلام\")\nايلا (صح) {\n    كتب(\"مرحبا\")\n}",
    "keywords": {
      "كتب": "print",
      "ايلا": "if",
      "صح": "true"
    },
    "vocabulary": {
      "واش": "ماذا",
      "علاش": "لماذا",
      "بزاف": "كثير",
      "شوية": "قليل",
      "مليح": "جيد",
      "دروك": "الآن",
      "وين": "أين",
      "كاين": "موجود"
    }
  },
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
  "ly-arab": {
    "sample": "كتب(\"سلام\")\nكان (صحيح) {\n    كتب(\"مرحبا\")\n}",
    "keywords": {
      "كتب": "print",
      "كان": "if",
      "صحيح": "true"
    },
    "vocabulary": {
      "شنو": "ماذا",
      "علاش": "لماذا",
      "هلبا": "كثير",
      "شوية": "قليل",
      "باهي": "جيد",
      "توا": "الآن",
      "وين": "أين",
      "كيف": "كيف"
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
  "ma-arab": {
    "sample": "قول(\"سلام\")\nإلى (بصح) {\n    قول(\"مرحبا بكم\")\n}",
    "keywords": {
      "قول": "print",
      "إلى": "if",
      "بصح": "true"
    },
    "vocabulary": {
      "دابا": "الآن",
      "بزاف": "كثير",
      "شوية": "قليل",
      "مزيان": "جيد",
      "واخا": "موافق",
      "فين": "أين",
      "شنو": "ماذا",
      "علاش": "لماذا"
    }
  },
  "ma-latn": {
    "sample": "goul(\"Salam\")\nila (s7i7) {\n    goul(\"Marhba\")\n}",
    "keywords": {
      "goul": "print",
      "ila": "if",
      "s7i7": "true"
    },
    "vocabulary": {
      "daba": "الآن",
      "bzaf": "كثير",
      "chwiya": "قليل",
      "mezyan": "جيد",
      "wakha": "موافق",
      "fin": "أين",
      "chno": "ماذا",
      "3lach": "لماذا"
    }
  },
  "mr-arab": {
    "sample": "كتب(\"سلام\")\nإذا (حق) {\n    كتب(\"مرحبا\")\n}",
    "keywords": {
      "كتب": "print",
      "إذا": "if",
      "حق": "true"
    },
    "vocabulary": {
      "اشحال": "كم",
      "ياسر": "كثير",
      "شوي": "قليل",
      "زين": "جميل",
      "ذرك": "الآن",
      "وين": "أين",
      "كيفاش": "كيف",
      "لاه": "لماذا"
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
  "tn-arab": {
    "sample": "قول(\"عسلامة\")\nإذا (صحيح) {\n    قول(\"مرحبا بيكم\")\n}",
    "keywords": {
      "قول": "print",
      "إذا": "if",
      "صحيح": "true"
    },
    "vocabulary": {
      "سلام": "سلام",
      "أهلا": "أهلا",
      "برشا": "كثير",
      "شوية": "قليل",
      "باهي": "جيد",
      "خايب": "سيء",
      "لاباس": "بخير",
      "يعطيك": "يعطيك"
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
