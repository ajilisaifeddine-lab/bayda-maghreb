import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { loadDialect } from "../../core/loader";
import { translate } from "../../core/translate";
import { translateDialect } from "../../core/translate-node";
import { lex } from "../../core/lexer";
import { normalize } from "../../core/normalizer";

const packagesDir = path.resolve(__dirname, "../../packages");
const dirs = fs.readdirSync(packagesDir).filter((f) => fs.statSync(path.join(packagesDir, f)).isDirectory());

describe("translate() — المسار الكامل لكل اللهجات", () => {
  describe.each(dirs)("dialect %s", (dir) => {
    it("print → console.log (js) و print (py)", () => {
      const pkg = loadDialect(dir, { consent: true })!;
      expect(pkg).not.toBeNull();

      // اختر أول كلمة تعني "print"
      const printWord = Object.keys(pkg.keywords).find((k) => pkg.keywords[k] === "print");
      expect(printWord, `no print word in ${dir}`).toBeTruthy();

      const src = `${printWord}("salam")`;

      const js = translate(src, { keywords: pkg.keywords, id: pkg.id, target: "js" });
      expect(js.code).toContain("console.log");
      expect(js.code).toContain('"salam"');

      const py = translate(src, { keywords: pkg.keywords, id: pkg.id, target: "py" });
      expect(py.code).toContain("print");
      expect(py.code).toContain('"salam"');
    });
  });
});

describe("translateDialect() — عبر loader من القرص", () => {
  it("Tunisian: if/else → JS", () => {
    const { code } = translateDialect('idha (s7i7) { goul("a") } wella { goul("b") }', {
      dialect: "tn-latn",
      target: "js",
    });
    expect(code).toContain("if (true)");
    expect(code).toContain('console.log("a");');
    expect(code).toContain("else {");
    expect(code).toContain('console.log("b");');
  });

  it("Algerian: if → Python", () => {
    const { code } = translateDialect('ila (sah) { kteb("a") }', { dialect: "dz-latn", target: "py" });
    expect(code).toContain("if True:");
    expect(code).toContain('print("a")');
  });

  it("Kabyle Tifinagh: print", () => {
    const pkg = loadDialect("kab-tifinagh", { consent: true })!;
    const printWord = Object.keys(pkg.keywords).find((k) => pkg.keywords[k] === "print")!;
    const { code } = translateDialect(`${printWord}("azul")`, { dialect: "kab-tifinagh", target: "js" });
    expect(code).toContain("console.log");
    expect(code).toContain('"azul"');
  });

  it("يرمي على لهجة غير معروفة", () => {
    expect(() => translateDialect('goul("a")', { dialect: "xx-xx" })).toThrow();
  });

  it("يرمي عند غياب الموافقة (requiresConsent)", () => {
    expect(() => translateDialect('goul("a")', { dialect: "tn-latn", consent: false })).toThrow(/CONSENT/);
  });
});

describe("translate() — العبارات المركّبة", () => {
  it("idha ken → else if (نفس السطر)", () => {
    const kw = { idha: "if", ken: "if", "idha ken": "else if", goul: "print", s7i7: "true" };
    const { code } = translate('idha (s7i7) { goul("a") } idha ken (s7i7) { goul("b") }', {
      keywords: kw,
      target: "js",
    });
    expect(code).toContain("if (true)");
    expect(code).toContain("else if (true)");
  });

  it("لا يطابق العبارة عبر الأسطر", () => {
    const kw = { idha: "if", "idha ken": "else if", goul: "print" };
    const tokens = normalize(lex("idha\nken", new Set()), kw);
    // "idha" تصبح if، و"ken" تبقى as-is (لا مطابقة عبر الأسطر)
    const values = tokens.map((t) => t.value);
    expect(values).toContain("if");
    expect(values).toContain("ken");
  });
});

describe("translate() — while", () => {
  it("Tunisian while عبر خريطة مخصّصة", () => {
    const kw = { twala: "while", goul: "print", s7i7: "true" };
    const { code } = translate('twala (s7i7) { goul("a") }', { keywords: kw, target: "js" });
    expect(code).toContain("while (true)");
    expect(code).toContain('console.log("a");');
  });
});
