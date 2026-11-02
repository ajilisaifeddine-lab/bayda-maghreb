// ربط المختبر بالنواة: يجمع المحرك والمنزِّل والتخزين المحلي. هو الملف الوحيد الذي يلمس الصفحة.
// نقطة الدخول لحزمة البناء (engine.bundle.js)، وتُحمَّل قبل ui.js.
import { BaydaEngine } from "./engine.js";
import { downloadDialect } from "./downloader.js";
import { PackStore, createIndexedDbBackend } from "./store.js";
import { Notebook, createNotebookApi, browserStorage, type NotebookApi } from "./notebook-store.js";

declare global {
  interface Window {
    baydaDownloadDialect?: (id: string) => Promise<void>;
    toast?: (message: string, ms?: number) => void;
    applyDialect?: (id: string) => void;
    currentDialect?: string;
    BaydaNotebook?: NotebookApi;
  }
}

const DIALECT_ID = /^[a-z0-9][a-z0-9-]*$/i;
const store = new PackStore(createIndexedDbBackend());
const busy = new Set<string>();

function notify(message: string): void {
  try {
    if (typeof window.toast === "function") window.toast(message, 3200);
  } catch {
    /* لا شيء */
  }
}

/** علامة has-pack على أعلام اللهجات التي لها حزمة منزَّلة (للتنسيق لاحقاً). */
function markFlags(): void {
  document.querySelectorAll<HTMLElement>(".flag-btn[data-dialect]").forEach((b) => {
    const id = b.getAttribute("data-dialect") || "";
    b.classList.toggle("has-pack", DIALECT_ID.test(id) && BaydaEngine.hasPack(id));
  });
}

/** يعيد تفعيل اللهجة الحالية في الواجهة (القاموس والمحرر) بعد تغيّر مصدرها. */
function reapply(only?: string): void {
  const cur = window.currentDialect;
  if (typeof cur !== "string" || (only !== undefined && cur !== only)) return;
  if (typeof window.applyDialect === "function") window.applyDialect(cur);
}

/** تنزيل لهجة بعد تأكيد المستخدم: تنزيل ← فحص ← حفظ على الجهاز ← تفعيل ← إشعار. */
async function download(id: string): Promise<void> {
  if (typeof id !== "string" || !DIALECT_ID.test(id) || busy.has(id)) return;
  busy.add(id);
  try {
    notify("جارٍ تنزيل الحزمة...");
    const r = await downloadDialect(id);
    if (!r.ok) {
      notify("❌ " + r.error);
      return;
    }
    const saved = await store.save(id, r.pack, r.release, r.version);
    if (!saved.ok) {
      notify("❌ " + saved.error);
      return;
    }
    const inst = BaydaEngine.installPack(r.pack);
    if (!inst.ok) {
      notify("❌ " + inst.error);
      return;
    }
    markFlags();
    reapply(id);
    notify(saved.persistent ? "✅ تم تنزيل الحزمة وحفظها على جهازك" : "⚠️ تم التنزيل لهذه الجلسة فقط: تعذّر الحفظ على جهازك");
  } catch {
    notify("❌ تعذّر التنزيل");
  } finally {
    busy.delete(id);
  }
}

/** عند فتح الصفحة: تحميل الحزم المخزَّنة (تُفحص كلها من جديد) وتفعيلها. */
async function restore(): Promise<void> {
  try {
    const all = await store.loadAll();
    for (const s of all) BaydaEngine.installPack(s.pack);
    markFlags();
    if (all.length > 0) reapply();
  } catch (e) {
    console.error("restore:", e);
  }
}

try {
  Object.defineProperty(window, "baydaDownloadDialect", { value: download, writable: false, configurable: false });
} catch {
  /* معرَّف مسبقاً */
}

try {
  Object.defineProperty(window, "BaydaNotebook", {
    value: createNotebookApi(new Notebook(browserStorage())),
    writable: false,
    configurable: false,
  });
} catch {
  /* معرَّف مسبقاً */
}

function start(): void {
  void restore();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
