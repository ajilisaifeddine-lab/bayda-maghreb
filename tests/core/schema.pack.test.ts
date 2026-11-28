import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { validateDialectPack, PACK_LIMITS } from "../../core/pack";

const manifest = { id: "xx-latn", version: "1.0.0", name: "Test" };
const pack = (kw: object = { ekteb: "print" }, vo: object = { salam: "سلام" }) => ({ manifest, keywords: kw, vocabulary: vo });
const bad = (p: unknown) => expect(validateDialectPack(p).ok).toBe(false);

describe("schema — فحص حزمة لهجة مُنزَّلة", () => {
  it("يقبل حزمة سليمة", () => {
    expect(validateDialectPack(pack()).ok).toBe(true);
  });

  it("يقبل العربيزي والفاصلة العليا والشرطة السفلية و ' - '", () => {
    const r = validateDialectPack(pack({ "3'oul": "print", "5amsa": "print" }, { "نو كاب - صح": "array_list", "O5roj": "أخرج" }));
    expect(r.ok).toBe(true);
  });

  it("يرفض __proto__ و constructor و prototype", () => {
    for (const k of ["__proto__", "constructor", "prototype"]) {
      bad(pack(JSON.parse(`{"${k}":"print"}`)));
      bad(pack({}, JSON.parse(`{"${k}":"x"}`)));
    }
  });

  it("يرفض الوسوم والروابط والرموز الخطرة", () => {
    for (const s of ["<script>", "a<b", "http://x.com", "a/b", "a.b", "a:b", "a;b", "a`b", "a(b)", "a$b", "a\\b", "a=b", "a\"b"]) {
      bad(pack({}, { [s]: "x" }));
      bad(pack({}, { word: s }));
    }
  });

  it("يرفض أحرف الاتجاه والتحكم والمسافات المخفية", () => {
    for (const s of ["a\u202Eb", "a\u200Bb", "a\u2066b", "a\u0000b", "a\nb"]) {
      bad(pack({}, { [s]: "x" }));
    }
  });

  it("يرفض النص الطويل والحزمة الكبيرة والتشكيل المتراكم", () => {
    bad(pack({}, { ["a".repeat(PACK_LIMITS.keyMax + 1)]: "x" }));
    bad(pack({}, { word: "a".repeat(PACK_LIMITS.valueMax + 1) }));
    const many: Record<string, string> = {};
    for (let i = 0; i <= PACK_LIMITS.keywordsMax; i++) many["k" + i] = "print";
    bad(pack(many));
    bad(pack({}, { ["ك" + "\u064B\u064C\u064D\u064E"]: "x" }));
  });

  it("يرفض مفهوماً غير صالح وجزءاً ناقصاً ومدخلاً غير كائن", () => {
    bad(pack({ ekteb: "Print()" }));
    bad(pack({ ekteb: 5 }));
    bad({ manifest, keywords: {} });
    bad(null);
    bad("x");
    bad([]);
    bad({ manifest: { ...manifest, version: "latest" }, keywords: {}, vocabulary: {} });
  });

  it("لا يُرجع نص المدخل في رسالة الخطأ", () => {
    const r = validateDialectPack(pack({}, { "<script>alert(1)</script>": "x" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).not.toContain("script");
  });

  it("كل حزم المستودع الحالية تجتاز الفحص", () => {
    const root = path.join(process.cwd(), "packages");
    const dirs = fs.readdirSync(root).filter((d) => fs.statSync(path.join(root, d)).isDirectory() && fs.existsSync(path.join(root, d, "manifest.json")));
    expect(dirs.length).toBeGreaterThan(0);
    for (const d of dirs) {
      const read = (f: string) => JSON.parse(fs.readFileSync(path.join(root, d, f), "utf8"));
      const r = validateDialectPack({ manifest: read("manifest.json"), keywords: read("keywords.json"), vocabulary: read("vocabulary.json") });
      expect(r.ok, d + ": " + (r.ok ? "" : r.error)).toBe(true);
    }
  });
});

describe("pack — تشديدات إضافية", () => {
  it("الناتج نظيف: بلا نموذج أولي وبلا مفاتيح manifest غير معروفة", () => {
    const r = validateDialectPack({
      manifest: { ...manifest, extra: { deep: "x" } },
      keywords: { ekteb: "print" },
      vocabulary: { salam: "سلام" },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.getPrototypeOf(r.data.keywords)).toBeNull();
      expect(Object.getPrototypeOf(r.data.vocabulary)).toBeNull();
      expect("extra" in r.data.manifest).toBe(false);
    }
  });

  it("اسم الحزمة لا يقبل أحرف التحكم أو الاتجاه", () => {
    for (const n of ["a\u202Eb", "a\u0000b", "a\u200Bb"]) {
      bad({ manifest: { ...manifest, name: n }, keywords: {}, vocabulary: {} });
    }
  });

  it("يرفض معرّف لهجة فيه مسار أو فراغ", () => {
    for (const id of ["../x", "a/b", "-a", ""]) {
      bad({ manifest: { ...manifest, id }, keywords: {}, vocabulary: {} });
    }
  });
});
