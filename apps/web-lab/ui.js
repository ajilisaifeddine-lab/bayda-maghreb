/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 ajilisaifeddine-lab
 * This file is part of Bayda Lab. See LICENSE for the full terms.
 */
/* ============================================================
   ui.js — طبقة الواجهة فقط (بديل main.js)
   المشروع: bayda-maghreb/apps/web-lab
   الوظائف: الثيم، حجم الخط، المؤثرات السمعية، النوافذ، التبويبات،
            التخطيط، القاموس، الملاحظات، التنبيهات، النسخ والتنزيل.
   ما لا يشمله: محرك تنفيذ الكود، اللهجات، المفردات، الدروس.
   ============================================================ */

"use strict";

/* ---------- مفاتيح التخزين (مطابقة لما كان في main.js) ---------- */
var LS = {
  sound: "baydaSound",
  fontSize: "baydaFontSize",
  state: "baydaLabState",
  notes: "baydaNotesList",
  consent: "baydaConsent"
};

/* ---------- عناصر مشتركة ---------- */
var el = function (id) { return document.getElementById(id); };

/* ============================================================
   1) المؤثرات السمعية — مولَّدة برمجيًا عبر AudioContext
   ============================================================ */
var audioCtx = null;
var soundEnabled = localStorage.getItem(LS.sound) !== "false";

function ensureAudio() {
  if (!audioCtx) {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

/**
 * نغمة قصيرة. النوع: "tap" | "ok" | "err" | "open" | "close"
 */
function beep(kind) {
  if (!soundEnabled) return;
  var ctx = ensureAudio();
  if (!ctx) return;

  var presets = {
    tap:   { f: 520,  t: 0.05, type: "sine",     gain: 0.05 },
    ok:    { f: 880,  t: 0.09, type: "triangle", gain: 0.06 },
    err:   { f: 180,  t: 0.14, type: "sawtooth", gain: 0.05 },
    open:  { f: 660,  t: 0.07, type: "sine",     gain: 0.05 },
    close: { f: 320,  t: 0.07, type: "sine",     gain: 0.04 }
  };
  var p = presets[kind] || presets.tap;

  try {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = p.type;
    osc.frequency.value = p.f;
    gain.gain.setValueAtTime(p.gain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + p.t);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + p.t);
  } catch (e) {
    /* المتصفح قد يمنع الصوت قبل تفاعل المستخدم — نتجاهل بهدوء */
  }
}

function updateSoundButton() {
  var btn = el("toggle-sound-setting");
  if (btn) btn.textContent = soundEnabled ? "🔊 مفعل" : "🔇 معطل";
}

function toggleSoundFromSettings() {
  soundEnabled = !soundEnabled;
  localStorage.setItem(LS.sound, String(soundEnabled));
  updateSoundButton();
  beep(soundEnabled ? "ok" : "close");
  toast(soundEnabled ? "المؤثرات الصوتية مفعلة" : "المؤثرات الصوتية معطلة");
}

/* ============================================================
   2) الثيمات
   ============================================================ */
var themes = ["light", "dark", "comfort"];
var themeIcons = { light: "☀️", dark: "🌙", comfort: "👁️" };
var currentThemeIndex = 0;

function applyTheme(name) {
  var idx = themes.indexOf(name);
  if (idx === -1) idx = 0;
  currentThemeIndex = idx;
  document.body.setAttribute("data-theme", themes[idx]);
  var btn = el("theme-toggle-btn");
  if (btn) btn.textContent = themeIcons[themes[idx]];
  saveState();
}

function cycleTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % themes.length;
  applyTheme(themes[currentThemeIndex]);
  beep("tap");
}

/* ثيمات وضع الطفل: تُعرَّف في style.css عبر data-kid-theme */
var kidThemes = ["candy", "jungle", "ocean"];
var kidThemeIndex = 0;

function changeKidTheme() {
  kidThemeIndex = (kidThemeIndex + 1) % kidThemes.length;
  var name = kidThemes[kidThemeIndex];
  document.body.setAttribute("data-kid-theme", name);
  document.documentElement.style.removeProperty("--primary");
  beep("tap");
  toast("ثيم الطفل: " + name + " 🎨");
}

/* ============================================================
   3) حجم الخط
   ============================================================ */
function changeFontSize(val) {
  var size = parseInt(val, 10);
  if (isNaN(size)) return;
  size = Math.min(24, Math.max(12, size));
  document.documentElement.style.setProperty("--font-base", size + "px");
  localStorage.setItem(LS.fontSize, String(size));
  var slider = el("font-size-slider");
  if (slider && slider.value !== String(size)) slider.value = String(size);
}

/* ============================================================
   4) النوافذ (modals)
   ============================================================ */
function openModal(id) {
  var m = el(id);
  if (!m) return;
  m.classList.add("active");
  beep("open");
}

function closeModal(id) {
  var m = el(id);
  if (!m) return;
  m.classList.remove("active");
  beep("close");
}

function openSettings() {
  var slider = el("font-size-slider");
  if (slider) slider.value = localStorage.getItem(LS.fontSize) || "16";
  updateSoundButton();
  openModal("settings-modal");
}

function closeSettings() { closeModal("settings-modal"); }

function closeDictPopup() { closeModal("dict-popup"); }

/* نافذة تأكيد عامة */
var confirmCallback = null;

function askConfirm(message, onYes) {
  var msg = el("confirm-message");
  if (msg) msg.textContent = message;
  confirmCallback = onYes || null;
  openModal("confirm-modal");
}

function confirmYes() {
  var cb = confirmCallback;
  confirmCallback = null;
  closeModal("confirm-modal");
  if (typeof cb === "function") cb();
}

function confirmNo() {
  confirmCallback = null;
  closeModal("confirm-modal");
}

/* الموافقة على اكتشاف اللهجة */
function acceptConsent() {
  localStorage.setItem(LS.consent, "accepted");
  closeModal("consent-modal");
  toast("شكرًا لك 🌿");
}

function declineConsent() {
  localStorage.setItem(LS.consent, "declined");
  closeModal("consent-modal");
  toast("اختر لهجتك يدويًا من الأعلام");
}

/* إغلاق النوافذ بالنقر على الخلفية أو زر Escape */
document.addEventListener("click", function (e) {
  if (e.target && e.target.classList && e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("active");
  }
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    var open = document.querySelectorAll(".modal-overlay.active");
    for (var i = 0; i < open.length; i++) open[i].classList.remove("active");
  }
});

/* ============================================================
   5) التنبيهات (toasts)
   ============================================================ */
function toast(message, ms) {
  var container = el("toast-container");
  if (!container) return;

  var node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  container.appendChild(node);

  setTimeout(function () {
    node.classList.add("hiding");
    setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 300);
  }, ms || 2200);
}

/* ============================================================
   6) التبويبات والتخطيط
   ============================================================ */
function switchTab(name) {
  var lab = el("view-lab");
  var learn = el("view-learn");
  var labBtn = el("tab-lab-btn");
  var learnBtn = el("tab-learn-btn");
  var footer = el("footer-run");

  var isLab = name === "lab";
  if (lab) lab.style.display = isLab ? "flex" : "none";
  if (learn) learn.style.display = isLab ? "none" : "flex";
  if (footer) footer.style.display = isLab ? "flex" : "none";
  if (labBtn) labBtn.classList.toggle("active", isLab);
  if (learnBtn) learnBtn.classList.toggle("active", !isLab);

  beep("tap");
  saveState();
}

function toggleLayout() {
  var panes = [el("view-lab")];
  panes.forEach(function (w) {
    if (!w) return;
    if (w.classList.contains("layout-col")) {
      w.classList.remove("layout-col");
      w.classList.add("layout-row");
    } else {
      w.classList.remove("layout-row");
      w.classList.add("layout-col");
    }
  });
  beep("tap");
}

function togglePane(paneId, btn) {
  var pane = el(paneId);
  if (!pane) return;
  var minimized = pane.classList.toggle("pane-minimized");
  if (btn) btn.textContent = minimized ? "+" : "-";
  beep("tap");
}

function toggleDictionary() {
  var pane = el("dict-pane");
  if (!pane) return;
  pane.classList.toggle("hidden");
  beep("tap");
}

/* ============================================================
   7) اختيار اللهجة من الأعلام
   ============================================================ */
var currentDialect = "dz-latn";

document.addEventListener("click", function (e) {
  var btn = e.target && e.target.closest ? e.target.closest(".flag-btn") : null;
  if (!btn) return;
  currentDialect = btn.getAttribute("data-dialect") || currentDialect;

  var all = document.querySelectorAll(".flag-btn");
  for (var i = 0; i < all.length; i++) all[i].classList.remove("active");
  btn.classList.add("active");

  beep("ok");
  saveState();
});

/* ============================================================
   8) الملاحظات (واجهة فقط، محفوظة في localStorage)
   ============================================================ */
var notes = [];
var currentNoteId = null;

function loadNotes() {
  try {
    notes = JSON.parse(localStorage.getItem(LS.notes) || "[]");
    if (!Array.isArray(notes)) notes = [];
  } catch (e) {
    notes = [];
  }
}

function persistNotes() {
  try {
    localStorage.setItem(LS.notes, JSON.stringify(notes));
  } catch (e) {
    toast("تعذّر حفظ الملاحظات");
  }
}

function renderNoteSelector() {
  var sel = el("note-selector");
  if (!sel) return;
  sel.innerHTML = "";
  notes.forEach(function (note) {
    var opt = document.createElement("option");
    opt.value = note.id;
    opt.textContent = note.title || "بدون عنوان";
    if (note.id === currentNoteId) opt.selected = true;
    sel.appendChild(opt);
  });
}

function renderCurrentNote() {
  var box = el("notes-editor");
  if (!box) return;
  var note = notes.find(function (n) { return n.id === currentNoteId; });
  box.innerHTML = note ? (note.html || note.content || "") : "";
}

function createNewNote() {
  var note = {
    id: "n" + Date.now(),
    title: "ملاحظة " + (notes.length + 1),
    html: "",
    content: ""
  };
  notes.push(note);
  currentNoteId = note.id;
  persistNotes();
  renderNoteSelector();
  renderCurrentNote();
  beep("ok");
  toast("ملاحظة جديدة");
}

function deleteCurrentNote() {
  if (!currentNoteId) return;
  askConfirm("هل تريد حذف هذه الملاحظة نهائيًا؟", function () {
    notes = notes.filter(function (n) { return n.id !== currentNoteId; });
    currentNoteId = notes.length ? notes[0].id : null;
    persistNotes();
    renderNoteSelector();
    renderCurrentNote();
    beep("err");
    toast("تم الحذف");
  });
}

function loadSelectedNote() {
  var sel = el("note-selector");
  if (!sel) return;
  currentNoteId = sel.value || null;
  renderCurrentNote();
}

function formatDoc(cmd) {
  var box = el("notes-editor");
  if (!box) return;
  box.focus();
  try {
    document.execCommand(cmd, false, null);
  } catch (e) {
    /* بعض المتصفحات تمنع execCommand — نتجاهل */
  }
  saveCurrentNoteContent();
}

function insertSym(sym) {
  var box = el("notes-editor");
  if (!box) return;
  box.focus();
  var done = false;
  try {
    done = document.execCommand("insertText", false, sym);
  } catch (e) {
    done = false;
  }
  if (!done) box.innerHTML += sym;
  saveCurrentNoteContent();
}

function saveCurrentNoteContent() {
  var box = el("notes-editor");
  if (!box || !currentNoteId) return;
  var note = notes.find(function (n) { return n.id === currentNoteId; });
  if (note) {
    note.html = box.innerHTML;
    note.content = box.innerHTML;
    persistNotes();
  }
}

/* ============================================================
   9) المخرجات: نسخ وتنزيل
   ============================================================ */
function copyOutput() {
  var out = el("output");
  if (!out) return;
  var text = out.textContent || "";

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      function () { beep("ok"); toast("تم النسخ 📋"); },
      function () { beep("err"); toast("تعذّر النسخ"); }
    );
  } else {
    var ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); toast("تم النسخ 📋"); }
    catch (e) { toast("تعذّر النسخ"); }
    document.body.removeChild(ta);
  }
}

function downloadOutput() {
  var out = el("output");
  if (!out) return;
  var blob = new Blob([out.textContent || ""], { type: "text/plain;charset=utf-8" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "bayda-output.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  beep("ok");
  toast("تم التنزيل 💾");
}

/* ============================================================
   10) وضع الطفل: قراءة النتيجة صوتيًا
   ============================================================ */
function readOutput() {
  var out = el("output");
  if (!out) return;
  var text = (out.textContent || "").trim();
  if (!text) { toast("لا يوجد شيء لقراءته"); return; }
  if (!("speechSynthesis" in window)) { toast("القراءة غير مدعومة"); return; }

  var u = new SpeechSynthesisUtterance(text);
  u.lang = "ar";
  u.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
  beep("tap");
}

/* ============================================================
   11) مسح البيانات
   ============================================================ */
function clearAllData() {
  askConfirm("سيُمسح كل شيء: الإعدادات، الملاحظات، والحالة. هل أنت متأكد؟", function () {
    try {
      localStorage.removeItem(LS.sound);
      localStorage.removeItem(LS.fontSize);
      localStorage.removeItem(LS.state);
      localStorage.removeItem(LS.notes);
      localStorage.removeItem(LS.consent);
    } catch (e) { /* تجاهل */ }

    notes = [];
    currentNoteId = null;
    soundEnabled = true;
    document.documentElement.style.setProperty("--font-base", "16px");
    applyTheme("light");
    renderNoteSelector();
    renderCurrentNote();
    updateSoundButton();
    beep("ok");
    toast("تم مسح كل البيانات");
  });
}

/* ============================================================
   12) الحالة: حفظ واسترجاع
   ============================================================ */
function saveState() {
  try {
    var state = {
      mode: document.body.getAttribute("data-mode"),
      theme: document.body.getAttribute("data-theme"),
      dialect: currentDialect,
      tab: el("view-learn") && el("view-learn").style.display !== "none" ? "learn" : "lab"
    };
    localStorage.setItem(LS.state, JSON.stringify(state));
  } catch (e) { /* تجاهل */ }
}

function restoreState() {
  var raw = localStorage.getItem(LS.state);
  var state = null;
  try { state = raw ? JSON.parse(raw) : null; } catch (e) { state = null; }

  var fontSize = localStorage.getItem(LS.fontSize);
  if (fontSize) changeFontSize(fontSize);

  if (state) {
    if (state.theme) applyTheme(state.theme);
    if (state.mode) {
      document.body.setAttribute("data-mode", state.mode);
      var modeSelect = el("mode-select");
      if (modeSelect) modeSelect.value = state.mode;
      syncModeControls(state.mode);
    }
    if (state.dialect) {
      currentDialect = state.dialect;
      var flag = document.querySelector('.flag-btn[data-dialect="' + state.dialect + '"]');
      if (flag) flag.classList.add("active");
    }
    if (state.tab === "learn") switchTab("learn");
  } else {
    applyTheme(document.body.getAttribute("data-theme") || "light");
  }

  updateSoundButton();
}

/* ============================================================
   13) الوضع (طفل / مبتدئ / محترف)
   ============================================================ */
function syncModeControls(mode) {
  var standard = el("standard-theme-controls");
  var kid = el("kid-theme-controls");
  var isKid = mode === "kid";
  if (standard) standard.classList.toggle("hidden", isKid);
  if (kid) kid.classList.toggle("hidden", !isKid);
}

document.addEventListener("change", function (e) {
  if (!e.target || e.target.id !== "mode-select") return;
  var mode = e.target.value;
  document.body.setAttribute("data-mode", mode);
  syncModeControls(mode);
  beep("tap");
  saveState();
});

/* ============================================================
   14) ما كان يفعله المحرك — معزول الآن
   ============================================================ */
function runCode() {
  beep("err");
  var out = el("output");
  if (out) {
    out.textContent = "// محرك التنفيذ معزول في هذه النسخة.\n// الواجهة تعمل، والتشغيل سيُعاد ربطه لاحقًا.";
  }
  toast("محرك التنفيذ معزول — الواجهة فقط");
}

function magicCode() {
  beep("tap");
  toast("✨ الواجهة جاهزة، والمحرك سيُضاف لاحقًا");
}

function insertToLesson(sym) {
  var box = el("lesson-editor");
  if (!box) return;
  box.value += sym;
  box.focus();
  beep("tap");
}

function resetLesson() {
  var box = el("lesson-editor");
  if (box) box.value = "";
  var fb = el("lesson-feedback");
  if (fb) { fb.textContent = ""; fb.classList.add("hidden"); }
  beep("tap");
}

function checkLesson() {
  var fb = el("lesson-feedback");
  if (fb) {
    fb.textContent = "مصحّح الدروس معزول — الواجهة فقط.";
    fb.classList.remove("hidden");
  }
  beep("err");
}

/* ============================================================
   15) التهيئة
   ============================================================ */
function initUI() {
  loadNotes();
  if (notes.length) {
    currentNoteId = notes[0].id;
  }
  renderNoteSelector();
  renderCurrentNote();

  var box = el("notes-editor");
  if (box) box.addEventListener("input", saveCurrentNoteContent);

  var runBtn = el("run-btn");
  if (runBtn) runBtn.addEventListener("click", runCode);

  var yesBtn = el("confirm-yes-btn");
  if (yesBtn) yesBtn.addEventListener("click", confirmYes);
  var noBtn = el("confirm-no-btn");
  if (noBtn) noBtn.addEventListener("click", confirmNo);

  restoreState();

  /* نافذة الموافقة تظهر مرة واحدة فقط */
  if (!localStorage.getItem(LS.consent)) {
    setTimeout(function () { openModal("consent-modal"); }, 400);
  }

  /* نغمة خفيفة عند أي زر */
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t && t.closest && t.closest("button")) beep("tap");
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initUI);
} else {
  initUI();
}
