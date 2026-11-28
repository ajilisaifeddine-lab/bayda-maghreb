import { describe, it, expect } from "vitest";
import { buildSync } from "esbuild";

function bundle(local: boolean): string {
  const r = buildSync({
    entryPoints: ["apps/web-lab/app.ts"],
    bundle: true,
    minify: true,
    format: "iife",
    target: "es2019",
    platform: "browser",
    define: { __LOCAL_SOURCES__: local ? "true" : "false" },
    write: false,
    logLevel: "silent",
  });
  return r.outputFiles[0].text;
}

describe("بناء المختبر", () => {
  it("البناء العادي: مصدر GitHub وjsDelivr فقط، بلا مصدر محلي", () => {
    const out = bundle(false);
    expect(out).toContain("raw.githubusercontent.com");
    expect(out).toContain("cdn.jsdelivr.net");
    expect(out).not.toContain('"/packages/catalog.json"');
  });

  it("البناء المحلي (للاختبار فقط) يوجّه إلى ملفات المستودع", () => {
    const out = bundle(true);
    expect(out).toContain('"/packages/catalog.json"');
    expect(out).not.toContain("raw.githubusercontent.com");
  });

  it("الحزمة تعرّف نقطة الربط ولا تحتوي eval ولا new Function", () => {
    const out = bundle(false);
    expect(out).toContain("baydaDownloadDialect");
    expect(out).not.toMatch(/\beval\s*\(/);
    expect(out).not.toContain("new Function");
  });
});
