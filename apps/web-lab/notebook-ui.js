/* واجهة «دفتري»: تبويب داخل لوحة القاموس (درج الهاتف).
   المنطق كله في window.BaydaNotebook (مفحوص ومجمَّد)؛ هنا عرض فقط: كل نص يُعرض بـ textContent ولا innerHTML. */
(function () {
  "use strict";
  var NB = window.BaydaNotebook;
  var $ = function (id) { return document.getElementById(id); };
  var tabs = $("nb-tabs"), tabDict = $("nb-tab-dict"), tabBook = $("nb-tab-book");
  var panel = $("nb-panel"), content = document.querySelector("#dict-pane .dict-content");
  var listEl = $("nb-list"), searchEl = $("nb-search"), dueBadge = $("nb-due"), startBtn = $("nb-start");
  if (!NB || !tabs || !tabDict || !tabBook || !panel || !content || !listEl || !searchEl || !dueBadge || !startBtn) return;
  tabs.hidden = false;

  var state = { tab: "dict", filter: "", query: "" };
  var rv = { ids: [], i: 0, knew: 0, again: 0 };
  var TYPE_KEY = { word: ["nbTypeWord", "كلمة"], code: ["nbTypeCode", "كود"], text: ["nbTypeText", "ملاحظة"] };

  function mk(tag, cls, text, auto) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    if (auto) n.setAttribute("dir", "auto");
    return n;
  }
  function on(id, ev, fn) { var n = $(id); if (n) n.addEventListener(ev, fn); }
  var ERR_KEY = {
    "سجل غير صالح": "nbeRecord",
    "نوع غير صالح": "nbeType",
    "لهجة غير صالحة": "nbeDialect",
    "النص طويل أو غير صالح": "nbeBody",
    "الكلمة والمعنى مطلوبان": "nbeWordMeaning",
    "العنوان مطلوب": "nbeTitle",
    "المحتوى مطلوب": "nbeContent",
    "هدف غير صالح": "nbeTarget",
    "صندوق غير صالح": "nbeBox",
    "تاريخ غير صالح": "nbeDate",
    "ملف غير صالح أو كبير جداً": "nbeFileBig",
    "ملف غير صالح": "nbeFile",
    "ليس ملف دفتر صالحاً": "nbeNotNb",
    "الملف أحدث من التطبيق، حدّث التطبيق": "nbeNewer",
    "الدفتر محفوظ بإصدار أحدث من التطبيق، حدّث التطبيق": "nbeLocked",
    "الدفتر بلغ الحجم الأقصى": "nbeMaxSize",
    "الدفتر ممتلئ": "nbeFull",
    "تعذّر الإنشاء، حاول مرة أخرى": "nbeCreate",
    "الكلمة محفوظة مسبقاً": "nbeDuplicate",
    "السجل غير موجود": "nbeNoEntry",
    "الكلمة غير موجودة": "nbeNoWord"
  };
  function errT(m) { return (typeof m === "string" && ERR_KEY[m]) ? tx(ERR_KEY[m], m) : m; }
  function say(msg) { if (typeof window.toast === "function") window.toast(msg, 3000); }
  function sound(k) { if (typeof window.beep === "function") window.beep(k); }
  function dialectName(id) {
    if (!id) return "";
    return typeof window.dlLabel === "function" ? window.dlLabel(id) : id;
  }

  function refreshDue() {
    var c = NB.counts();
    dueBadge.textContent = String(c.due);
    dueBadge.hidden = c.due === 0;
    startBtn.hidden = c.due === 0;
    var n = $("nb-start-n");
    if (n) n.textContent = String(c.due);
  }

  function openCode(e) {
    var ed = $("editor");
    if (!ed) return;
    ed.value = e.body;
    ed.dispatchEvent(new Event("input", { bubbles: true }));
    var sel = $("target-lang");
    if (sel && (e.target === "js" || e.target === "py")) sel.value = e.target;
    if (e.dialect && e.dialect !== window.currentDialect) say(tx("nbOtherDia", "هذا الكود بلهجة {name}، اختر علمها لتشغيله", { name: dialectName(e.dialect) }));
    else say(tx("nbOpened", "فُتح الكود في المحرر"));
    sound("tap");
    if (typeof window.setDrawer === "function") window.setDrawer(false);
  }

  function confirmRemove(e) {
    var go = function () {
      var r = NB.remove(e.id);
      if (!r.ok) { say("❌ " + errT(r.error)); return; }
      sound("err");
      render();
      refreshDue();
      say(tx("nbDeleted", "تم الحذف"));
    };
    if (typeof window.askConfirm === "function") window.askConfirm(tx("nbConfirmDel", "هل تريد حذف هذا السجل نهائياً؟"), go);
    else go();
  }

  function itemNode(e) {
    var box = mk("article", "nb-item nb-type-" + e.type);
    var head = mk("div", "nb-item-head");
    head.appendChild(mk("b", "nb-item-title", e.title, true));
    var tags = mk("span", "nb-tags");
    tags.appendChild(mk("span", "nb-tag", TYPE_KEY[e.type] ? tx(TYPE_KEY[e.type][0], TYPE_KEY[e.type][1]) : ""));
    if (e.dialect) tags.appendChild(mk("span", "nb-tag nb-tag-dia", dialectName(e.dialect)));
    if (e.type === "code" && e.target) tags.appendChild(mk("span", "nb-tag", e.target === "py" ? "Python" : "JavaScript"));
    if (e.type === "word") tags.appendChild(mk("span", "nb-tag", tx("nbBox", "صندوق {n}", { n: e.box })));
    head.appendChild(tags);
    box.appendChild(head);
    if (e.type === "word") box.appendChild(mk("p", "nb-item-sub", e.meaning, true));
    else if (e.type === "code") box.appendChild(mk("pre", "nb-code", e.body));
    else box.appendChild(mk("p", "nb-item-sub nb-body", e.body, true));
    var acts = mk("div", "nb-item-actions");
    if (e.type === "code") {
      var op = mk("button", "dc-act dc-tap", tx("nbOpenEd", "↗ افتح في المحرر"));
      op.type = "button";
      op.addEventListener("click", function () { openCode(e); });
      acts.appendChild(op);
    }
    var del = mk("button", "dc-act dc-tap nb-del", tx("nbDelete", "🗑️ حذف"));
    del.type = "button";
    del.addEventListener("click", function () { confirmRemove(e); });
    acts.appendChild(del);
    box.appendChild(acts);
    return box;
  }

  function render() {
    listEl.textContent = "";
    var f = { q: state.query };
    if (state.filter) f.type = state.filter;
    var items = NB.search(f);
    if (items.length === 0) {
      var hint = NB.counts().total === 0
        ? tx("nbEmptyList", "دفترك فارغ. اضغط 📌 في بطاقة أي كلمة، أو احفظ كود المحرر، أو اكتب ملاحظة.")
        : tx("nbNoMatch", "لا نتائج مطابقة.");
      listEl.appendChild(mk("p", "nb-empty", hint));
      return;
    }
    items.forEach(function (e) { listEl.appendChild(itemNode(e)); });
  }

  function afterAdd(r, okMsg) {
    if (!r.ok) { say("❌ " + errT(r.error)); sound("err"); return false; }
    say(r.persistent ? okMsg : tx("nbNotPersist", "⚠️ {msg} (لن تبقى بعد إغلاق الصفحة: تعذّر الحفظ على جهازك)", { msg: okMsg }));
    sound("ok");
    render();
    refreshDue();
    return true;
  }

  function pinWord() {
    var dc = window.DC;
    var words = dc && dc.currentWords;
    var w = words && dc.index >= 0 ? words[dc.index] : "";
    var vocab = window.currentVocab || {};
    var m = w && Object.prototype.hasOwnProperty.call(vocab, w) ? vocab[w] : "";
    if (!w || typeof m !== "string" || !m) { say(tx("nbNoWord", "لا توجد كلمة لحفظها")); return; }
    afterAdd(NB.add({ type: "word", dialect: window.currentDialect || "", word: w, meaning: m }), tx("nbWordSaved", "📌 حُفظت الكلمة في دفتري"));
  }

  function saveCode() {
    var ed = $("editor");
    var code = ed ? ed.value : "";
    if (!code.trim()) { say(tx("nbEditorEmpty", "المحرر فارغ")); return; }
    var first = code.split("\n").filter(function (l) { return l.trim(); })[0] || "";
    var title = first.trim().slice(0, 40) || tx("nbCodeFallback", "كود");
    var sel = $("target-lang");
    afterAdd(NB.add({ type: "code", dialect: window.currentDialect || "", title: title, body: code, target: sel ? sel.value : "" }), tx("nbCodeSaved", "🔖 حُفظ الكود في دفتري"));
  }

  function saveNote() {
    var t = $("nb-note-title"), b = $("nb-note-body");
    if (!t || !b) return;
    if (afterAdd(NB.add({ type: "text", title: t.value, body: b.value }), tx("nbNoteSaved", "📝 حُفظت الملاحظة"))) {
      t.value = "";
      b.value = "";
      var d = $("nb-note-form");
      if (d) d.open = false;
    }
  }

  function showTab(t) {
    var book = t === "book";
    state.tab = book ? "book" : "dict";
    tabDict.setAttribute("aria-selected", book ? "false" : "true");
    tabBook.setAttribute("aria-selected", book ? "true" : "false");
    tabDict.classList.toggle("active", !book);
    tabBook.classList.toggle("active", book);
    content.style.display = book ? "none" : "";
    panel.hidden = !book;
    if (book) { render(); refreshDue(); }
  }

  /* مراجعة متباعدة: عرفتها ترفع الكلمة صندوقاً، وأعدها ترجعها إلى الأول */
  function rvEntry() {
    var id = rv.ids[rv.i];
    return NB.entries().filter(function (e) { return e.id === id; })[0];
  }
  function rvShow() {
    var e = rvEntry();
    if (!e) { rvEnd(); return; }
    $("nb-rv-count").textContent = (rv.i + 1) + " / " + rv.ids.length;
    $("nb-rv-word").textContent = e.word;
    $("nb-rv-dia").textContent = dialectName(e.dialect);
    $("nb-rv-meaning").textContent = e.meaning;
    $("nb-rv-meaning").setAttribute("dir", "auto");
    $("nb-rv-meaning").hidden = true;
    $("nb-rv-btns").hidden = true;
    $("nb-rv-show").hidden = false;
    $("nb-rv-done").hidden = true;
    $("nb-rv-card").hidden = false;
  }
  function rvReveal() {
    $("nb-rv-meaning").hidden = false;
    $("nb-rv-btns").hidden = false;
    $("nb-rv-show").hidden = true;
  }
  function rvEnd() {
    $("nb-rv-card").hidden = true;
    $("nb-rv-count").textContent = "";
    var d = $("nb-rv-done");
    d.textContent = tx("nbReviewDone", "🎉 أنهيت مراجعة اليوم: عرفت {knew} وأعدت {again}", { knew: rv.knew, again: rv.again });
    d.hidden = false;
    refreshDue();
  }
  function rvAnswer(knew) {
    var e = rvEntry();
    if (!e) { rvEnd(); return; }
    var r = NB.review(e.id, knew);
    if (!r.ok) { say("❌ " + errT(r.error)); return; }
    if (knew) rv.knew++; else rv.again++;
    sound(knew ? "ok" : "tap");
    rv.i++;
    if (rv.i >= rv.ids.length) rvEnd(); else rvShow();
  }
  function startReview() {
    var due = NB.due();
    if (!due.length) { say(tx("nbNoDue", "لا توجد كلمات مستحقة اليوم")); return; }
    rv.ids = due.slice(0, 20).map(function (e) { return e.id; });
    rv.i = 0;
    rv.knew = 0;
    rv.again = 0;
    $("nb-main").hidden = true;
    $("nb-review").hidden = false;
    rvShow();
  }
  function exitReview() {
    $("nb-review").hidden = true;
    $("nb-main").hidden = false;
    render();
    refreshDue();
  }

  /* تصدير واستيراد الدفتر بملف تختاره أنت: لا شيء يخرج من جهازك ولا يعود إليه إلا بملف تحدده.
     الاستيراد يُفحص بالقائمة البيضاء نفسها (الحجم والبنية وكل سجل)، والمكرر يُتخطى. */
  var IMPORT_MAX = 1000000;
  function stamp() {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function exportBook() {
    try {
      if (NB.counts().total === 0) { say(tx("nbEmptyExport", "الدفتر فارغ: لا شيء للتصدير")); return; }
      var blob = new Blob([NB.exportText()], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "bayda-notebook-" + stamp() + ".json";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      say(tx("nbExported", "📤 تم تجهيز ملف دفترك"));
      sound("ok");
    } catch (err) {
      say(tx("nbExportFail", "❌ تعذّر التصدير"));
    }
  }
  function importBook(file) {
    if (!file) return;
    if (file.size > IMPORT_MAX) { say(tx("nbFileBig", "❌ الملف كبير جداً")); return; }
    if (!/\.json$/i.test(file.name || "")) { say(tx("nbNeedJson", "❌ اختر ملف دفتر بصيغة .json")); return; }
    var rd = new FileReader();
    rd.onerror = function () { say(tx("nbReadFail", "❌ تعذّرت قراءة الملف")); };
    rd.onload = function () {
      var r = NB.importText(typeof rd.result === "string" ? rd.result : "");
      if (!r.ok) { say("❌ " + errT(r.error)); sound("err"); return; }
      var skipped = r.dropped + r.skipped;
      var msg = skipped ? tx("nbImportedSkip", "📥 أُضيف {n} (تُخطّي {s})", { n: r.added, s: skipped }) : tx("nbImported", "📥 أُضيف {n}", { n: r.added });
      say(r.persistent ? msg : tx("nbImportNotPersist", "⚠️ {msg} — لن يُحفظ بعد إغلاق الصفحة", { msg: msg }));
      sound("ok");
      render();
      refreshDue();
    };
    rd.readAsText(file);
  }

  /* وضع الطفل: لا دفتر */
  function guardKid() {
    if (document.body.getAttribute("data-mode") === "kid" && state.tab === "book") showTab("dict");
  }

  on("nb-tab-dict", "click", function () { showTab("dict"); });
  on("nb-tab-book", "click", function () { showTab("book"); });
  on("nb-pin", "click", pinWord);
  on("nb-save-code", "click", saveCode);
  on("nb-note-save", "click", saveNote);
  on("nb-start", "click", startReview);
  on("nb-rv-show", "click", rvReveal);
  on("nb-rv-yes", "click", function () { rvAnswer(true); });
  on("nb-rv-no", "click", function () { rvAnswer(false); });
  on("nb-rv-exit", "click", exitReview);
  on("nb-export", "click", exportBook);
  on("nb-import", "click", function () { var f = $("nb-import-file"); if (f) f.click(); });
  var impFile = $("nb-import-file");
  if (impFile) {
    impFile.addEventListener("change", function () {
      var f = impFile.files && impFile.files[0];
      importBook(f);
      impFile.value = "";
    });
  }
  on("mode-select", "change", function () { setTimeout(guardKid, 60); });
  searchEl.addEventListener("input", function () { state.query = searchEl.value; render(); });
  var filters = $("nb-filters");
  if (filters) {
    filters.addEventListener("click", function (e) {
      var b = e.target && e.target.closest ? e.target.closest("button[data-f]") : null;
      if (!b) return;
      state.filter = b.getAttribute("data-f") || "";
      Array.prototype.forEach.call(filters.querySelectorAll("button"), function (x) { x.classList.toggle("active", x === b); });
      render();
    });
  }
  refreshDue();
})();
