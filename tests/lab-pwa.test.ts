import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const LAB = path.resolve("apps/web-lab");

describe("جاهزية الـ PWA والعمل دون إنترنت", () => {
  it("يتحقق من اكتمال manifest.json ووجود كل الأيقونات على القرص", () => {
    const man = JSON.parse(fs.readFileSync(path.join(LAB, "manifest.json"), "utf8"));
    expect(man.id).toBeTruthy();
    expect(man.short_name.length).toBeLessThanOrEqual(12);
    expect(man.display).toBe("standalone");
    const has192 = man.icons.some((i: any) => i.sizes === "192x192" && i.purpose === "any");
    const has512 = man.icons.some((i: any) => i.sizes === "512x512" && i.purpose === "any");
    const hasMask = man.icons.some((i: any) => i.sizes === "512x512" && i.purpose === "maskable");
    expect(has192 && has512 && hasMask).toBe(true);
    for (const ic of man.icons) {
      expect(fs.existsSync(path.join(LAB, ic.src)), ic.src).toBe(true);
    }
    expect(fs.existsSync(path.join(LAB, "assets/apple-touch-icon.png"))).toBe(true);
  });

  it("يتحقق من تطابق ملفات service-worker.js وربط index.html وتقييد شريط الأخطاء", () => {
    const sw = fs.readFileSync(path.join(LAB, "service-worker.js"), "utf8");
    const m = sw.match(/ASSETS\s*=\s*(\[[^\]]+\])/);
    expect(m).toBeTruthy();
    const assets: string[] = JSON.parse(m![1]);
    expect(assets.length).toBeGreaterThan(20);
    for (const a of assets) {
      const rel = a === "./" ? "index.html" : a.slice(2);
      expect(fs.existsSync(path.join(LAB, rel)), rel).toBe(true);
    }
    const html = fs.readFileSync(path.join(LAB, "index.html"), "utf8");
    expect(html).toContain("rel=\"manifest\"");
    expect(html).toContain("apple-touch-icon.png");
    expect(html).toContain("serviceWorker.register");
    expect(html).toContain("location.hostname");
  });
});
