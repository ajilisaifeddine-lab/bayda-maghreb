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
  welcome: "baydaWelcome",
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
  if (btn) btn.textContent = soundEnabled ? tx("tsSoundBtnOn", "🔊 مفعل") : tx("tsSoundBtnOff", "🔇 معطل");
}

function toggleSoundFromSettings() {
  soundEnabled = !soundEnabled;
  localStorage.setItem(LS.sound, String(soundEnabled));
  updateSoundButton();
  beep(soundEnabled ? "ok" : "close");
  toast(soundEnabled ? tx("tsSoundOn", "المؤثرات الصوتية مفعلة") : tx("tsSoundOff", "المؤثرات الصوتية معطلة"));
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
  toast(tx("tsKidTheme", "ثيم الطفل: {name} 🎨").replace("{name}", name));
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

/* نافذة الترحيب */
function closeWelcome() {
  try { localStorage.setItem(LS.welcome, "seen"); } catch (e) {}
  closeModal("welcome-modal");
  if (typeof window.blEnter === "function") window.blEnter();
}

function openSettings() {
  var slider = el("font-size-slider");
  if (slider) slider.value = localStorage.getItem(LS.fontSize) || "16";
  updateSoundButton();
  openModal("settings-modal");
}

var settingsClosing = false;
function closeSettings() {
  var m = el("settings-modal");
  if (!m || !m.classList.contains("active") || settingsClosing) return;
  settingsClosing = true;
  var box = m.querySelector(".st-modal");
  m.classList.add("st-closing");
  setTimeout(function () {
    m.classList.remove("active", "st-closing");
    if (box) { box.style.translate = ""; box.style.transition = ""; }
    settingsClosing = false;
    beep("close");
  }, 260);
}

/* سحب ورقة الإعدادات من الرأس إلى الأسفل للإغلاق */
(function initSettingsSwipe() {
  var head = document.querySelector("#settings-modal .st-head");
  var box = document.querySelector("#settings-modal .st-modal");
  if (!head || !box) return;
  var y0 = null;
  head.addEventListener("pointerdown", function (e) {
    if (e.target.closest && e.target.closest(".close-btn")) return;
    y0 = e.clientY; box.style.transition = "none";
    try { head.setPointerCapture(e.pointerId); } catch (err) {}
  });
  head.addEventListener("pointermove", function (e) {
    if (y0 === null) return;
    box.style.translate = "0 " + Math.max(0, e.clientY - y0) + "px";
  });
  function end(e) {
    if (y0 === null) return;
    var dy = e.clientY - y0; y0 = null;
    if (dy > 90) { box.style.transition = "translate .26s cubic-bezier(.4, 0, 1, 1)"; box.style.translate = "0 105%"; closeSettings(); }
    else { box.style.transition = "translate .25s cubic-bezier(.2, .8, .2, 1)"; box.style.translate = ""; setTimeout(function () { box.style.transition = ""; }, 260); }
  }
  head.addEventListener("pointerup", end);
  head.addEventListener("pointercancel", end);
})();

function closeDictCard() { closeModal("dict-dock"); if (typeof window.dcRestoreRoom === "function") window.dcRestoreRoom(); }

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



/* إغلاق النوافذ بالنقر على الخلفية أو زر Escape */
document.addEventListener("click", function (e) {
  if (e.target && e.target.classList && e.target.classList.contains("modal-overlay") && e.target.id !== "welcome-modal") {
    if (e.target.id === "settings-modal") closeSettings(); else e.target.classList.remove("active");
  }
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    var open = document.querySelectorAll(".modal-overlay.active");
    for (var i = 0; i < open.length; i++) { if (open[i].id === "settings-modal") closeSettings(); else if (open[i].id !== "welcome-modal") open[i].classList.remove("active"); }
  }
});

/* ============================================================
   5) التنبيهات (toasts)
   ============================================================ */
var TOAST_KEY = {
  "جارٍ تنزيل الحزمة...": "enDlProgress",
  "✅ تم تنزيل الحزمة وحفظها على جهازك": "enDlOk",
  "⚠️ تم التنزيل لهذه الجلسة فقط: تعذّر الحفظ على جهازك": "enDlSession",
  "❌ تعذّر التنزيل": "enDlFail",
  "انتهت مهلة الاتصال": "enTimeout",
  "تعذّر الاتصال": "enNoConn",
  "المصدر يجب أن يكون نصاً.": "enSrcText",
  "المدخلات مطلوبة (TranslateInput).": "enInput",
  "معرّف غير صالح": "enBadId",
  "رقم إصدار غير صالح": "enBadVer",
  "اسم غير صالح": "enBadName",
  "الحزمة ليست كائناً": "enPackNotObj",
  "تعذّر فحص الحزمة": "enPackCheck"
};
/* ترجمة إشعارات المحرك المعروفة؛ غير المعروف يبقى كما جاء */
function toastText(m) {
  if (typeof m !== "string") return m;
  var hit = /^(❌ |⚠️ |✅ )?فشل التنزيل \(رمز (\d+)\)$/.exec(m);
  if (hit) return (hit[1] || "") + tx("enHttp", "فشل التنزيل (رمز {c})").replace("{c}", hit[2]);
  if (TOAST_KEY[m]) return tx(TOAST_KEY[m], m);
  var p = /^(❌ |⚠️ |✅ )(.+)$/.exec(m);
  if (p && TOAST_KEY[p[2]]) return p[1] + tx(TOAST_KEY[p[2]], p[2]);
  return m;
}

function toast(message, ms) {
  var container = el("toast-container");
  if (!container) return;
  message = toastText(message);

  /* إشعار واحد ظاهر في كل لحظة: الجديد يحلّ محلّ القديم، والمطابق يجدّد عمره */
  var live = container.querySelector(".toast:not(.hiding)");
  if (live && live.textContent === String(message)) {
    clearTimeout(live._t);
    live._t = setTimeout(function () { dismissToast(live); }, ms || 2200);
    return;
  }
  if (live) dismissToast(live, true);

  var node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  container.appendChild(node);
  node._t = setTimeout(function () { dismissToast(node); }, ms || 2200);
}

function dismissToast(node, now) {
  if (!node || node.classList.contains("hiding")) return;
  clearTimeout(node._t);
  if (now) { if (node.parentNode) node.parentNode.removeChild(node); return; }
  node.classList.add("hiding");
  setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 300);
}

/* ============================================================
   6) التبويبات والتخطيط
   ============================================================ */
function isLearnTab(){var v=el("view-learn");return !!(v&&v.style.display!=="none");}
function switchTab(name){
  var lab=el("view-lab"),learn=el("view-learn"),labBtn=el("tab-lab-btn"),learnBtn=el("tab-learn-btn"),footer=el("footer-run");
  var isLab=name==="lab";
  if(lab)lab.style.display=isLab?"flex":"none";
  if(learn)learn.style.display=isLab?"none":"flex";
  if(footer)footer.style.display=isLab?"flex":"none";
  if(labBtn)labBtn.classList.toggle("active",isLab);
  if(learnBtn)learnBtn.classList.toggle("active",!isLab);
  hideDlFloat();
  var ctx=el("flags-ctx");if(ctx){var cKey=isLab?"flagsCtxLab":"flagsCtxLearn";ctx.setAttribute("data-i18n-key",cKey);ctx.textContent=tx(cKey,isLab?"🧪 حزم اللهجات":"📚 حزم الدروس");ctx.classList.toggle("is-learn",!isLab);}
  if(typeof window.baydaRefreshFlags==="function")window.baydaRefreshFlags(name);
  else restoreInstalledPacks(name);
  if(!isLab){
    renderLesson();
  }
  document.dispatchEvent(new CustomEvent("bayda:tab_changed",{detail:{tab:name}}));
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

function isDrawerMode() {
  return document.body.getAttribute("data-mode") !== "kid" &&
    !!window.matchMedia && window.matchMedia("(max-width: 768px)").matches;
}
function setDrawer(open) {
  var pane = el("dict-pane");
  if (!pane) return;
  if (open) pane.setAttribute("data-drawer", "open");
  else pane.removeAttribute("data-drawer");
}
/* هاتف (غير الطفل): القاموس درج سفلي؛ غير ذلك: إخفاء/إظهار اللوحة */
function toggleDictionary() {
  var pane = el("dict-pane");
  if (!pane) return;
  if (isDrawerMode()) {
    pane.classList.remove("hidden");
    setDrawer(pane.getAttribute("data-drawer") !== "open");
  } else {
    pane.classList.toggle("hidden");
  }
  beep("tap");
}
/* سحب رأس القاموس إلى الأسفل يغلق الدرج */
(function () {
  var pane = el("dict-pane");
  var head = pane && pane.querySelector(".pane-header");
  if (!head) return;
  var y0 = null;
  head.addEventListener("pointerdown", function (e) { y0 = e.clientY; });
  head.addEventListener("pointerup", function (e) {
    if (y0 !== null && isDrawerMode() && e.clientY - y0 > 50) setDrawer(false);
    y0 = null;
  });
  head.addEventListener("pointercancel", function () { y0 = null; });
})();

/* ============================================================
   7) اختيار اللهجة من الأعلام
   ============================================================ */
/* برق مخبري من الشعار نحو العلم المضغوط (واجهة فقط) */
function flagBolt(flag) {
  try {
    if (!flag) return;
    if (document.body.getAttribute("data-reduce-motion") === "on") return;
    var hdr = document.querySelector("header");
    var logo = document.getElementById("main-logo");
    if (!hdr || !logo) return;
    var h = hdr.getBoundingClientRect(), a = logo.getBoundingClientRect(), b = flag.getBoundingClientRect();
    if (!a.width || !b.width) return;
    var x1 = a.left + a.width / 2 - h.left, y1 = a.top + a.height / 2 - h.top;
    var x2 = b.left + b.width / 2 - h.left, y2 = b.top + b.height / 2 - h.top;
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
    if (!isFinite(len) || len < 8) return;

    function jag(ax, ay, bx, by, amp, depth) {
      var pts = [[ax, ay], [bx, by]];
      for (var d = 0; d < depth; d++) {
        var out = [pts[0]];
        for (var i = 0; i < pts.length - 1; i++) {
          var p = pts[i], q = pts[i + 1];
          var ex = q[0] - p[0], ey = q[1] - p[1], l = Math.sqrt(ex * ex + ey * ey) || 1;
          var off = (Math.random() - 0.5) * amp * l;
          out.push([(p[0] + q[0]) / 2 - ey / l * off, (p[1] + q[1]) / 2 + ex / l * off], q);
        }
        pts = out;
      }
      return pts;
    }
    function toD(pts) {
      return "M" + pts.map(function (q) { return q[0].toFixed(1) + " " + q[1].toFixed(1); }).join(" L");
    }

    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "bl-bolt");
    svg.setAttribute("aria-hidden", "true");
    var segs = [];
    function addSeg(pts, w) {
      var seg = { pts: pts, els: [] };
      [["bl-bolt-halo", w * 5], ["bl-bolt-glow", w * 2.6], ["bl-bolt-core", w]].forEach(function (c) {
        var el = document.createElementNS(NS, "path");
        el.setAttribute("class", c[0]);
        el.setAttribute("stroke-width", c[1].toFixed(2));
        el.setAttribute("pathLength", "1");
        el.setAttribute("d", toD(pts));
        svg.appendChild(el);
        seg.els.push(el);
      });
      segs.push(seg);
    }
    function spark(x, y, r) {
      var c = document.createElementNS(NS, "circle");
      c.setAttribute("class", "bl-bolt-spark");
      c.setAttribute("cx", x.toFixed(1));
      c.setAttribute("cy", y.toFixed(1));
      c.setAttribute("r", r);
      svg.appendChild(c);
    }

    var main = jag(x1, y1, x2, y2, 0.5, 5);
    addSeg(main, 2.4);
    var base = Math.atan2(dy, dx), count = 0;
    for (var i = 4; i < main.length - 4 && count < 5; i++) {
      if (Math.random() < 0.14) {
        var p = main[i];
        var ang = base + (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.5);
        var bl = len * (0.1 + Math.random() * 0.18);
        addSeg(jag(p[0], p[1], p[0] + Math.cos(ang) * bl, p[1] + Math.sin(ang) * bl, 0.55, 3), 1.2);
        count++;
        i += 3;
      }
    }
    spark(x1, y1, 14);
    spark(x2, y2, 18);

    var old = hdr.querySelector(".bl-bolt");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    hdr.appendChild(svg);

    function jitter() {
      segs.forEach(function (seg) {
        var d = toD(seg.pts.map(function (q) {
          return [q[0] + (Math.random() - 0.5) * 4, q[1] + (Math.random() - 0.5) * 4];
        }));
        seg.els.forEach(function (el) { el.setAttribute("d", d); });
      });
    }
    setTimeout(jitter, 70);
    setTimeout(function () { svg.style.opacity = "0.2"; }, 130);
    setTimeout(function () { svg.style.opacity = "1"; jitter(); }, 185);
    setTimeout(function () { svg.style.transition = "opacity .25s ease-out"; svg.style.opacity = "0"; }, 330);
    setTimeout(function () { if (svg.parentNode) svg.parentNode.removeChild(svg); }, 650);

    if (flag.animate) {
      flag.animate(
        [{ filter: "brightness(2.2) drop-shadow(0 0 10px #fff)" }, { filter: "none" }],
        { duration: 450, easing: "ease-out" }
      );
    }
  } catch (err) { console.error("flagBolt:", err); }
}

/* زر تنزيل عائم فوق العلم + نافذة تأكيد (واجهة فقط) */
var dlFloatTimer = null;
function hideDlFloat() {
  clearTimeout(dlFloatTimer);
  var b = document.querySelector(".dl-float");
  if (b && b.parentNode) b.parentNode.removeChild(b);
}
var DL_IDS = ["tn-latn", "tn-arab", "dz-latn", "dz-arab", "ma-latn", "ma-arab", "ly-latn", "ly-arab", "mr-latn", "mr-arab", "kab-latn", "kab-tifinagh", "shi-latn"];
var DL_VARIANTS = {
  "tn": ["arab", "latn"], "dz": ["arab", "latn"], "ma": ["arab", "latn"], "ly": ["arab", "latn"], "mr": ["arab", "latn"],
  "kab": ["latn", "tifinagh"], "shi": ["latn"]
};
var VAR_KEY = { arab: ["dlVarArab", "تنزيل بالحرف العربي"], latn: ["dlVarLatn", "تنزيل بالحرف اللاتيني"], tifinagh: ["dlVarTif", "تنزيل بحرف التيفيناغ"] };
function dlGroup(prefix) {
  var v = DL_VARIANTS[prefix];
  if (!v) return null;
  return v.map(function (s) { return { id: prefix + "-" + s, label: tx(VAR_KEY[s][0], VAR_KEY[s][1]) }; });
}
function countryName(p) { return tx("dlCountry_" + p, p); }
var COUNTRY_FLAGS = {
  "tn": "assets/tn.png",
  "dz": "assets/dz.png",
  "ma": "assets/ma.png",
  "ly": "assets/ly.png",
  "mr": "assets/mr.png",
  "kab": "assets/kabyle.png",
  "shi": "assets/amazigh.png"
};
function dlLabel(id) {
  if (DL_IDS.indexOf(id) === -1) return tx("dlThisDialect", "هذه اللهجة");
  var p = String(id).split("-");
  return tx("dlName_" + p[0], p[0]) + " (" + tx("dlScript_" + p[1], p[1]) + ")";
}

function saveInstalledPack(dialectId,kind){
  try{
    var key=kind==="lessons"?"bayda_installed_lesson_packs":"bayda_installed_packs";
    var raw=localStorage.getItem(key),list=raw?JSON.parse(raw):[];
    if(!Array.isArray(list))list=[];
    if(!list.includes(dialectId)){list.push(dialectId);localStorage.setItem(key,JSON.stringify(list));}
  }catch(e){}
}
function restoreInstalledPacks(tabName){
  try{
    var isLes=tabName?tabName==="learn":isLearnTab();
    var E=window.BaydaEngine;
    document.querySelectorAll(".flag-btn").forEach(function(b){b.classList.remove("has-pack");});
    var key=isLes?"bayda_installed_lesson_packs":"bayda_installed_packs";
    var raw=localStorage.getItem(key),list=raw?JSON.parse(raw):[];
    if(!Array.isArray(list))list=[];
    list.forEach(function(id){
      if(typeof id!=="string")return;
      if(E&&((isLes&&E.hasLessonsPack&&!E.hasLessonsPack(id))||(!isLes&&E.hasPack&&!E.hasPack(id))))return;
      var pfx=id.split("-")[0],flagBtn=document.querySelector(".flag-btn[data-dialect^='"+pfx+"']");
      if(flagBtn){flagBtn.classList.add("has-pack");var keep=flagBtn.classList.contains("active")&&currentDialect.split("-")[0]===pfx&&E&&((isLes&&E.hasLessonsPack&&E.hasLessonsPack(currentDialect))||(!isLes&&E.hasPack&&E.hasPack(currentDialect)));if(!keep){flagBtn.setAttribute("data-dialect",id);if(flagBtn.classList.contains("active")&&currentDialect!==id){currentDialect=id;applyDialect(id);}}}
    });
  }catch(e){}
}
function askDlConfirm(id,kind) {
  try {
    var old = document.querySelector(".dl-confirm-wrap");
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var dlKind = kind || (isLearnTab() ? "lessons" : "dialect");
    var isLes = dlKind === "lessons";
    var prefix = id.split("-")[0];
    var countryLabel = DL_VARIANTS[prefix] ? countryName(prefix) : dlLabel(id);
    var variants = dlGroup(prefix) || [{ id: id, label: tx("dlGetPackOnly", "تنزيل الحزمة") }];
    var flagSrc = COUNTRY_FLAGS[prefix] || "assets/logo.png";

    var wrap = document.createElement("div");
    wrap.className = "dl-confirm-wrap";

    var card = document.createElement("div");
    card.className = "dl-confirm";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.style.setProperty("padding", "clamp(16px, 4.5vw, 22px) clamp(12px, 3.8vw, 18px)");
    card.style.setProperty("border-radius", "24px");
    card.style.setProperty("position", "relative");
    card.style.setProperty("overflow", "hidden");
    card.style.setProperty("background-image", "url(" + flagSrc + ")");
    card.style.setProperty("background-size", "cover");
    card.style.setProperty("background-position", "center");
    card.style.setProperty("border", "2px solid rgba(255, 255, 255, 0.45)");
    card.style.setProperty("box-shadow", "0 20px 45px rgba(0, 0, 0, 0.55)");

    var overlay = document.createElement("div");
    overlay.style.setProperty("position", "absolute");
    overlay.style.setProperty("inset", "0");
    overlay.style.setProperty("background", "rgba(11, 27, 43, 0.68)");
    overlay.style.setProperty("-webkit-backdrop-filter", "blur(2px)");
    overlay.style.setProperty("backdrop-filter", "blur(2px)");
    overlay.style.setProperty("z-index", "1");
    card.appendChild(overlay);

    var content = document.createElement("div");
    content.style.setProperty("position", "relative");
    content.style.setProperty("z-index", "2");
    content.style.setProperty("color", "#fff");

    var title = document.createElement("p");
    title.className = "dl-confirm-title";
    title.style.setProperty("margin", "0 0 16px");
    /* font-size governed by responsive css */
    title.style.setProperty("font-weight", "800");
    title.style.setProperty("color", "#ffffff");
    title.style.setProperty("text-shadow", "0 2px 8px rgba(0, 0, 0, 0.8)");
    title.textContent = tx(isLes ? "dlGetLessonsPack" : "dlGetPack", isLes ? "تنزيل حزمة دروس {name}" : "تنزيل حزمة {name}").replace("{name}", countryLabel);
    content.appendChild(title);

    var list = document.createElement("div");
    list.style.setProperty("display", "flex");
    list.style.setProperty("flex-direction", "column");
    list.style.setProperty("gap", "12px");
    list.style.setProperty("margin-bottom", "18px");

    variants.forEach(function (v) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dl-variant-btn";
      btn.style.setProperty("width", "100%");
      /* min-height governed by responsive css */
      btn.style.setProperty("border-radius", "16px");
      btn.style.setProperty("cursor", "pointer");
      btn.style.setProperty("border", "2px solid rgba(255, 255, 255, 0.4)");
      btn.style.setProperty("background", "rgba(15, 76, 117, 0.82)");
      btn.style.setProperty("-webkit-backdrop-filter", "blur(4px)");
      btn.style.setProperty("backdrop-filter", "blur(4px)");
      btn.style.setProperty("color", "#ffffff");
      btn.style.setProperty("font", "inherit");
      /* font-size governed by responsive css */
      btn.style.setProperty("font-weight", "700");
      btn.style.setProperty("display", "flex");
      btn.style.setProperty("align-items", "center");
      btn.style.setProperty("justify-content", "center");
      btn.style.setProperty("padding", "0 18px");
      btn.style.setProperty("box-shadow", "0 4px 14px rgba(0, 0, 0, 0.3)");
      btn.textContent = v.label;

      btn.addEventListener("click", async function () {
        var t = function(k, d) { return window.BaydaI18n ? window.BaydaI18n.t(k) : d; };
        if (navigator && navigator.onLine === false) {
          toast("⚠️ " + t("toastOffline", "لا يوجد اتصال بالإنترنت، يرجى التحقق من الشبكة"));
          return;
        }
        var dlFn = isLes ? window.baydaDownloadLessons : window.baydaDownloadDialect;
        if (typeof dlFn !== "function") {
          toast(t("toastNotConnected", "التنزيل غير متصل بالنواة بعد"));
          close();
          return;
        }

        // 1. حالة التحميل (Loading State)
        btn.textContent = "";
        btn.disabled = true;
        btn.style.setProperty("cursor", "wait");
        btn.style.setProperty("background", "rgba(15, 76, 117, 0.95)");

        var t = function(k, d) { return window.BaydaI18n ? window.BaydaI18n.t(k) : d; };

        btn.textContent = "";
        btn.disabled = true;
        btn.style.setProperty("cursor", "wait");
        btn.style.setProperty("background", "rgba(15, 76, 117, 0.95)");

        var spin = document.createElement("span");
        spin.className = "dl-spin";
        var spinText = document.createElement("span");
        spinText.textContent = t("dlDownloading", "جارٍ التنزيل والتثبيت...");
        btn.appendChild(spin);
        btn.appendChild(spinText);

        list.querySelectorAll("button").forEach(function (b) {
          if (b !== btn) {
            b.style.setProperty("opacity", "0.35");
            b.style.setProperty("pointer-events", "none");
          }
        });
        no.style.setProperty("display", "none");

        try {
          await dlFn(v.id);

          btn.textContent = "";
          btn.className = "dl-variant-btn dl-success-anim";
          btn.style.setProperty("background", "#059669");
          btn.style.setProperty("border-color", "#34d399");

          var chk = document.createElement("span");
          chk.textContent = "✓ ";
          chk.style.setProperty("font-size", "1.3rem");
          chk.style.setProperty("font-weight", "900");
          chk.style.setProperty("margin-inline-end", "8px");

          var msg = document.createElement("span");
          msg.textContent = t(isLes ? "dlLessonsSuccess" : "toastDlSuccess", isLes ? "تم تنزيل حزمة الدروس! 📚" : "تم التنزيل والحفظ بنجاح! 🎉");

          btn.appendChild(chk);
          btn.appendChild(msg);

          title.textContent = "✅ " + t("dlComplete", "اكتمل التنزيل بنجاح");
          if (typeof beep === "function") beep("success");

          var prefix = v.id.split("-")[0];
          var flagBtn = document.querySelector(".flag-btn[data-dialect^='" + prefix + "']");
          if (flagBtn) {
            flagBtn.classList.add("has-pack");
            flagBtn.setAttribute("data-dialect", v.id);
          }
          saveInstalledPack(v.id, dlKind);
          if (v.id !== currentDialect) { currentDialect = v.id; applyDialect(v.id); saveState(); }
          else if (isLes) renderLesson();

          setTimeout(close, 1400);
        } catch (err) {
          console.error("dl error:", err);
          btn.disabled = false;
          btn.style.setProperty("cursor", "pointer");
          btn.style.setProperty("background", "#dc2626");
          btn.style.setProperty("border-color", "#f87171");
          btn.textContent = "🔄 " + t("dlRetry", "تعذّر التنزيل، انقر للمحاولة مجدداً");

          list.querySelectorAll("button").forEach(function (b) {
            b.style.removeProperty("opacity");
            b.style.removeProperty("pointer-events");
          });
          no.style.removeProperty("display");
        }
      });
      list.appendChild(btn);
    });
    content.appendChild(list);

    var row = document.createElement("div");
    row.className = "dl-confirm-actions";
    var no = document.createElement("button");
    no.type = "button";
    no.className = "dl-confirm-no";
    no.textContent = tx("dlCancel", "إلغاء");
    /* min-width governed by responsive css */
    no.style.setProperty("min-height", "42px");
    no.style.setProperty("border-radius", "22px");
    no.style.setProperty("cursor", "pointer");
    no.style.setProperty("border", "2px solid rgba(255, 255, 255, 0.35)");
    no.style.setProperty("background", "rgba(0, 0, 0, 0.35)");
    no.style.setProperty("color", "#ffffff");
    no.style.setProperty("font", "inherit");
    no.style.setProperty("font-weight", "bold");
    row.appendChild(no);
    content.appendChild(row);

    card.appendChild(content);
    wrap.appendChild(card);

    function onKey(e) { if (e.key === "Escape") close(); }
    function close() {
      document.removeEventListener("keydown", onKey);
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }
    no.addEventListener("click", close);
    wrap.addEventListener("click", function (e) { if (e.target === wrap) close(); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(wrap);
    no.focus();
  } catch (err) { console.error("askDlConfirm:", err); }
}
function showDlFloat(flag) {
  try {
    hideDlFloat();
    var id = flag && flag.getAttribute("data-dialect");
    if (!id || !/^[a-z0-9-]+$/i.test(id)) return;
    var hdr = document.querySelector("header");
    if (!hdr) return;
    var h = hdr.getBoundingClientRect(), r = flag.getBoundingClientRect();
    var size = flag.offsetWidth;
    if (!r.width || !size) return;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "dl-float";
    var arrow = document.createElement("span");
    arrow.className = "dl-arrow";
    arrow.setAttribute("aria-hidden", "true");
    b.appendChild(arrow);
    var fk = isLearnTab() ? "dlGetLessonsPack" : "dlGetPack";
    b.setAttribute("aria-label", tx(fk, isLearnTab() ? "تنزيل حزمة دروس {name}" : "تنزيل حزمة {name}").replace("{name}", dlLabel(id)));
    b.style.setProperty("width", size + "px");
    b.style.setProperty("height", size + "px");
    b.style.setProperty("left", (r.left + r.width / 2 - size / 2 - h.left) + "px");
    b.style.setProperty("top", (r.top + r.height / 2 - size / 2 - h.top) + "px");
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      hideDlFloat();
      askDlConfirm(id, isLearnTab() ? "lessons" : "dialect");
    });
    hdr.appendChild(b);
    dlFloatTimer = setTimeout(hideDlFloat, 4000);
  } catch (err) { console.error("showDlFloat:", err); }
}
document.addEventListener("click", function (e) {
  var t = e.target;
  if (t && t.closest && !t.closest(".dl-float") && !t.closest(".flag-btn")) hideDlFloat();
});

var currentDialect = "dz-latn";

/* ===== ربط الواجهة بالمحرك (engine.bundle.js) =====
   لكل لهجة مصدر واحد فقط: الحزمة المنزَّلة المفحوصة إن وُجدت، وإلا المثال المدمج. */
var lastSample = "";
function applyDialect(id) {
  try {
    var E = window.BaydaEngine;
    if (!E || !id) return;
    window.currentVocab = E.setDialect(id).vocabulary;
    /* المحرر: يُملأ بمثال اللهجة إن كان فارغاً أو ما زال مثالاً لم يُعدَّل؛ كود المستخدم لا يُستبدل */
    var ed = el("editor");
    if (ed && (!ed.value.trim() || ed.value === lastSample)) {
      lastSample = E.sampleFor(id);
      ed.value = lastSample;
      updateLineNumbers();
    }
    if (typeof window.dcRenderChips === "function") window.dcRenderChips();
    var lfb = el("lesson-feedback"); if (lfb) lfb.classList.add("hidden");
    renderLesson();
    document.dispatchEvent(new CustomEvent("bayda:dialect_changed", { detail: { id: id } }));
  } catch (err) { console.error("applyDialect:", err); }
}

/* عنوان الدرس ووصفه: كلمة الطباعة من حزمة اللهجة الحالية في المحرك */
var activeLessonId=null,activeLessonMode="beginner",activeLessonHints=[],activeHintIdx=0,activeLessonTpl="";
function getSolvedMap(){try{return JSON.parse(localStorage.getItem("bayda_solved_lessons")||"{}")||{};}catch(e){return{};}}
function solvedKey(){return (currentDialect||"tn-latn")+":"+activeLessonMode;}
function isLessonSolved(id){var m=getSolvedMap()[solvedKey()];return Array.isArray(m)&&m.indexOf(id)>=0;}
function markLessonSolved(id){if(!id)return;var all=getSolvedMap(),k=solvedKey(),arr=Array.isArray(all[k])?all[k]:[];if(arr.indexOf(id)<0){arr.push(id);all[k]=arr;try{localStorage.setItem("bayda_solved_lessons",JSON.stringify(all));}catch(e){}}}
function renderLesson(){
  var t=el("lesson-title"),dsc=el("lesson-desc"),exp=el("lesson-explain"),hb=el("lesson-hint-box"),hbtn=el("lesson-hint-btn"),tbtn=el("lesson-target-btn"),tbox=el("lesson-target-box"),E=window.BaydaEngine;
  if(!t&&!dsc)return;
  var card=t?t.parentNode:null,bar=el("lesson-pack-bar"),prog=el("lesson-prog");
  if(!prog&&card){prog=document.createElement("div");prog.id="lesson-prog";prog.className="lesson-prog hidden";card.insertBefore(prog,bar||t);}
  if(!bar&&card){bar=document.createElement("div");bar.id="lesson-pack-bar";bar.style.cssText="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;align-items:center";card.insertBefore(bar,t);}
  var ms=el("mode-select"),lm=(ms&&ms.value==="pro")?"pro":"beginner";
  activeLessonMode=lm;
  var view=E&&E.getLessonsView?E.getLessonsView(lm):{installed:false,ready:[],locked:[]};
  if(bar)bar.textContent="";if(exp){exp.textContent="";exp.classList.add("hidden");}
  if(hb){hb.textContent="";hb.classList.add("hidden");}if(tbox){tbox.textContent="";tbox.classList.add("hidden");}
  activeHintIdx=0;activeLessonHints=[];activeLessonTpl="";
  if(view.installed&&view.ready.length){
    if(!view.ready.some(function(x){return x.id===activeLessonId;}))activeLessonId=view.ready[0].id;
    var cur=view.ready.find(function(x){return x.id===activeLessonId;})||view.ready[0];
    var doneCnt=view.ready.filter(function(x){return isLessonSolved(x.id);}).length;
    if(prog){prog.classList.remove("hidden");prog.innerHTML="<div class=\"lesson-prog-meta\"><span>"+tx("lrnProgress","التقدم")+": "+doneCnt+" / "+view.ready.length+"</span><span>"+Math.round(doneCnt/view.ready.length*100)+"%</span></div><div class=\"lesson-prog-track\"><div class=\"lesson-prog-fill\" style=\"width:"+Math.round(doneCnt/view.ready.length*100)+"%\"></div></div>";}
    if(bar){
      view.ready.forEach(function(l,i){
        var b=document.createElement("button");b.type="button";
        b.className=l.id===cur.id?"btn-primary":"btn-secondary";
        b.style.cssText="padding:5px 10px;font-size:.82rem";
        b.textContent=(isLessonSolved(l.id)?"✅ ":"")+(i+1)+". "+l.title;
        b.onclick=function(){activeLessonId=l.id;renderLesson();var fb=el("lesson-feedback");if(fb)fb.classList.add("hidden");};
        bar.appendChild(b);
      });
      if(view.locked.length){var lk=document.createElement("span");lk.style.cssText="font-size:.8rem;color:var(--text-muted)";lk.textContent=tx("lrnNeedDialectPack","🔒 يتطلب تنزيل حزمة اللهجة من المختبر")+" ("+view.locked.length+")";bar.appendChild(lk);}
    }
    if(t)t.textContent=(isLessonSolved(cur.id)?"✅ ":"")+cur.title;
    if(dsc)dsc.textContent=cur.goal;
    if(exp&&cur.explain&&cur.explain.length){
      cur.explain.forEach(function(line){var d=document.createElement("div");d.textContent="• "+(E.fillLessonCode?E.fillLessonCode(line).text||line:line);exp.appendChild(d);});
      exp.classList.remove("hidden");
    }
    activeLessonHints=(cur.hints||[]).map(function(h){return E.fillLessonCode?E.fillLessonCode(h).text||h:h;});
    if(cur.template&&E.fillLessonCode)activeLessonTpl=E.fillLessonCode(cur.template).text||"";
    if(hbtn){hbtn.classList.toggle("hidden",!activeLessonHints.length);hbtn.textContent=tx("lrnHintBtn","💡 تلميح")+" (0/"+activeLessonHints.length+")";}
    if(tbtn){tbtn.classList.toggle("hidden",lm!=="pro");}
    return;
  }
  activeLessonId=null;if(prog)prog.classList.add("hidden");if(hbtn)hbtn.classList.add("hidden");if(tbtn)tbtn.classList.add("hidden");
  if(bar){
    var note=document.createElement("button");note.type="button";note.className="lrn-pull-notice";
    note.textContent="\u261D\uFE0F "+tx("lrnPullTopNotice","اضغط مرتين على العلم في الأعلى لتنزيل دروس اللهجة");
    note.onclick=function(){var af=document.querySelector(".flag-btn.active");if(af){af.scrollIntoView({behavior:"smooth",block:"center"});flagBolt(af);showDlFloat(af);}};
    bar.appendChild(note);
  }
  var kw="print";try{var k=E&&E.getDialect?E.getDialect().keywords:null;if(k){var ws=Object.keys(k).filter(function(w){return k[w]==="print";});if(ws.length)kw=ws[0];}}catch(e){}
  if(t)t.textContent=tx("lrnTitle","المستوى 0: الطباعة ({kw})").replace(/\{kw\}/g,kw);
  if(dsc)dsc.textContent=tx("lrnDesc","استخدم الكلمة المفتاحية للطباعة لكتابة \"salam\" على الشاشة.");
}
document.addEventListener("bayda:uilang_changed",renderLesson);
document.addEventListener("bayda:lessons_updated",renderLesson);
document.addEventListener("DOMContentLoaded",function(){
  renderLesson();
  var ms=el("mode-select");
  if(ms)ms.addEventListener("change",function(){var lfb=el("lesson-feedback");if(lfb)lfb.classList.add("hidden");renderLesson();});
});

/* أرقام الأسطر: تتبع المحرر (بلا innerHTML، وبحد لحماية الهاتف) */
function updateLineNumbers() {
  var ed = el("editor"), ln = el("line-numbers");
  if (!ed || !ln) return;
  var n = Math.min(ed.value.split("\n").length, 5000);
  ln.textContent = "";
  for (var i = 1; i <= n; i++) {
    if (i > 1) ln.appendChild(document.createElement("br"));
    ln.appendChild(document.createTextNode(String(i)));
  }
  ln.scrollTop = ed.scrollTop;
}

document.addEventListener("click", function (e) {
  var btn = e.target && e.target.closest ? e.target.closest(".flag-btn") : null;
  if (!btn) return;
  var wasActive = btn.classList.contains("active");
  currentDialect = btn.getAttribute("data-dialect") || currentDialect;
  var all = document.querySelectorAll(".flag-btn");
  for (var i = 0; i < all.length; i++) all[i].classList.remove("active");
  btn.classList.add("active");
  flagBolt(btn);
  applyDialect(currentDialect);
  if (isLearnTab()) renderLesson();
  if (wasActive) {
    hideDlFloat();
    askDlConfirm(currentDialect, isLearnTab() ? "lessons" : "dialect");
  } else {
    showDlFloat(btn);
  }
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
    toast(tx("tsNotesSaveFail", "تعذّر حفظ الملاحظات"));
  }
}

function renderNoteSelector() {
  var sel = el("note-selector");
  if (!sel) return;
  sel.innerHTML = "";
  notes.forEach(function (note) {
    var opt = document.createElement("option");
    opt.value = note.id;
    opt.textContent = note.title || tx("tsUntitled", "بدون عنوان");
    if (note.id === currentNoteId) opt.selected = true;
    sel.appendChild(opt);
  });
}

/* تنقية HTML الملاحظات بقائمة بيضاء: وسوم تنسيق بسيطة بلا أي خصائص، والباقي يُفكّ إلى نصه أو يُحذف.
   تُطبَّق عند العرض وعند الحفظ، فلا يُنفَّذ أي HTML قادم من التخزين أو اللصق. */
var NOTE_TAGS = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, BR: 1, DIV: 1, P: 1, UL: 1, OL: 1, LI: 1 };
var NOTE_DROP = { SCRIPT: 1, STYLE: 1, TEMPLATE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, NOSCRIPT: 1, SVG: 1, MATH: 1, TEXTAREA: 1, SELECT: 1, TITLE: 1 };
var NOTE_MAX_HTML = 200000;
var NOTE_MAX_DEPTH = 40;

function noteFragment(html) {
  var frag = document.createDocumentFragment();
  if (typeof html !== "string" || !html) return frag;
  if (html.length > NOTE_MAX_HTML) html = html.slice(0, NOTE_MAX_HTML);
  var doc;
  try {
    doc = new DOMParser().parseFromString(html, "text/html");
  } catch (e) {
    return frag;
  }
  var own = Object.prototype.hasOwnProperty;
  (function walk(src, dst, depth) {
    for (var n = src.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) {
        dst.appendChild(document.createTextNode(n.nodeValue));
      } else if (n.nodeType === 1) {
        var tag = String(n.nodeName).toUpperCase();
        if (own.call(NOTE_DROP, tag)) continue;
        if (depth >= NOTE_MAX_DEPTH) {
          dst.appendChild(document.createTextNode(n.textContent || ""));
          continue;
        }
        if (own.call(NOTE_TAGS, tag)) {
          var copy = document.createElement(tag.toLowerCase());
          dst.appendChild(copy);
          if (tag !== "BR") walk(n, copy, depth + 1);
        } else {
          walk(n, dst, depth + 1);
        }
      }
    }
  })(doc.body, frag, 0);
  return frag;
}

function cleanNoteHtml(html) {
  var tmp = document.createElement("div");
  tmp.appendChild(noteFragment(html));
  return tmp.innerHTML;
}

function renderCurrentNote() {
  var box = el("notes-editor");
  if (!box) return;
  var note = notes.find(function (n) { return n.id === currentNoteId; });
  box.textContent = "";
  if (note) box.appendChild(noteFragment(note.html || note.content || ""));
}

function createNewNote() {
  var note = {
    id: "n" + Date.now(),
    title: tx("tsNoteN", "ملاحظة {n}").replace("{n}", String(notes.length + 1)),
    html: "",
    content: ""
  };
  notes.push(note);
  currentNoteId = note.id;
  persistNotes();
  renderNoteSelector();
  renderCurrentNote();
  beep("ok");
  toast(tx("tsNewNote", "ملاحظة جديدة"));
}

function deleteCurrentNote() {
  if (!currentNoteId) return;
  askConfirm(tx("tsConfirmNote", "هل تريد حذف هذه الملاحظة نهائيًا؟"), function () {
    notes = notes.filter(function (n) { return n.id !== currentNoteId; });
    currentNoteId = notes.length ? notes[0].id : null;
    persistNotes();
    renderNoteSelector();
    renderCurrentNote();
    beep("err");
    toast(tx("tsDeleted", "تم الحذف"));
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
  if (!done) box.appendChild(document.createTextNode(String(sym)));
  saveCurrentNoteContent();
}

function saveCurrentNoteContent() {
  var box = el("notes-editor");
  if (!box || !currentNoteId) return;
  var note = notes.find(function (n) { return n.id === currentNoteId; });
  if (note) {
    var clean = cleanNoteHtml(box.innerHTML);
    note.html = clean;
    note.content = clean;
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
      function () { beep("ok"); toast(tx("tsCopied", "تم النسخ 📋")); },
      function () { beep("err"); toast(tx("tsCopyFail", "تعذّر النسخ")); }
    );
  } else {
    var ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); toast(tx("tsCopied", "تم النسخ 📋")); }
    catch (e) { toast(tx("tsCopyFail", "تعذّر النسخ")); }
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
  toast(tx("tsDownloaded", "تم التنزيل 💾"));
}

/* ============================================================
   10) وضع الطفل: قراءة النتيجة صوتيًا
   ============================================================ */
window.baydaSpeak=function(text,opts){
  var t=(text||"").trim();if(!t)return false;
  var slow=!!(opts&&opts.slow),hasTif=/[\u2D30-\u2D7F]/.test(t),hasAr=/[\u0600-\u06FF]/.test(t);
  if(hasTif){beep("tap");toast("🔊 "+tx("uxTifinaghAudio","تيفيناغ: نُطق بتنبيه صوتي لغياب حزمة الصوت"),2400);return false;}
  if(!("speechSynthesis" in window)){beep("tap");toast(tx("uxNoSpeech","القراءة غير مدعومة"),2200);return false;}
  try{
    var ss=window.speechSynthesis,vs=ss.getVoices?ss.getVoices():[],d=(window.currentDialect||""),lang=hasAr||/-arab$/.test(d)?"ar-SA":(d==="kab-latn"||d==="shi-latn"||/-latn$/.test(d)?"fr-FR":"ar-SA");
    var pick=vs.find(function(v){return v.lang&&v.lang.toLowerCase().indexOf(lang.slice(0,2))===0;})||vs[0];
    var u=new SpeechSynthesisUtterance(t);if(pick)u.voice=pick;u.lang=pick?pick.lang:lang;u.rate=slow?0.62:0.92;
    u.onerror=function(){beep("tap");};ss.cancel();ss.speak(u);beep("tap");return true;
  }catch(e){beep("tap");return false;}
};
function readOutput(){var out=el("output"),t=out?(out.textContent||"").trim():"";if(!t){toast(tx("tsNothingRead","لا يوجد شيء لقراءته"));return;}window.baydaSpeak(t,{slow:false});}
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
    toast(tx("uxCleared", "تم مسح كل البيانات"));
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
  /* القاموس: درج يبدأ مغلقاً على الهاتف (غير الطفل)، ولا درج في غيره */
  var dp = el("dict-pane");
  if (dp) {
    dp.removeAttribute("data-drawer");
    if (isDrawerMode()) dp.classList.remove("hidden");
  }
}

document.addEventListener("change", function (e) {
  if (!e.target || e.target.id !== "mode-select") return;
  if (typeof window.ksGuardModeExit === "function" && !window.ksGuardModeExit(e.target)) return;
  var mode = e.target.value;
  document.body.setAttribute("data-mode", mode);
  syncModeControls(mode);
  beep("tap");
  saveState();
});

/* ============================================================
   14) ما كان يفعله المحرك — مربوط الآن
   ============================================================ */

function runCode() {
  var out = el("output");
  var ed = el("editor");
  if (!out || !ed) return;
  var E = window.BaydaEngine;
  if (!E) {
    out.textContent = "❌ " + tx("engineMissing", "المحرك غير محمّل.");
    toast("❌ " + tx("engineMissing", "المحرك غير محمّل."));
    beep("err");
    return;
  }
  var sel = el("target-lang");
  var r = E.runCode(ed.value, sel ? sel.value : "js");
  if (r.ok) {
    out.textContent = r.code || "";
    beep("ok");
  } else {
    out.textContent = "❌ " + tx("errPrefix", "خطأ") + ": " + r.error;
    toast("❌ " + tx("runFailed", "تعذّر التحويل، راجع المخرجات"));
    beep("err");
  }
}

function magicCode() {
  beep("tap");
  toast(tx("uxMagic", "✨ الواجهة جاهزة، والمحرك سيُضاف لاحقًا"));
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

var LESSON_KEY = {
  "الرجاء كتابة كود أولاً.": "lrnNeedCode",
  "الكود أطول من الحد المسموح.": "lrnTooLong",
  "اختر لهجة أولاً.": "lrnPickDialect",
  "🎉 إجابة صحيحة! لقد تعلمت الطباعة بنجاح.": "lrnOk",
  "⚠️ الصياغة صحيحة، لكن يجب أن تطبع كلمة 'salam' بالتحديد.": "lrnWrong",
  "المحرك غير محمّل.": "lrnEngine"
};
function lessonMsg(m) {
  if (typeof m !== "string") return m;
  var P = "❌ خطأ برمجي: ";
  if (m.indexOf(P) === 0) return tx("lrnErrPrefix", P) + m.slice(P.length);
  return LESSON_KEY[m] ? tx(LESSON_KEY[m], m) : m;
}

function showNextLessonHint(){var hb=el("lesson-hint-box"),hbtn=el("lesson-hint-btn");if(!hb||!activeLessonHints.length)return;if(activeHintIdx<activeLessonHints.length)activeHintIdx++;hb.textContent=activeLessonHints.slice(0,activeHintIdx).map(function(h,i){return (i+1)+". "+h;}).join("\n");hb.style.whiteSpace="pre-wrap";hb.classList.remove("hidden");if(hbtn)hbtn.textContent=tx("lrnHintBtn","💡 تلميح")+" ("+activeHintIdx+"/"+activeLessonHints.length+")";beep("tap");}
function toggleLessonTarget(){var tb=el("lesson-target-box"),box=el("lesson-editor"),tl=el("target-lang"),E=window.BaydaEngine;if(!tb||!E||!E.previewTarget)return;if(!tb.classList.contains("hidden")){tb.classList.add("hidden");return;}var src=(box&&box.value.trim())?box.value:activeLessonTpl;var res=E.previewTarget(src,tl?tl.value:"js");if(!res.ok){toast(tx("lrnNoTarget","اكتب كوداً للمعاينة"),2200);return;}tb.textContent=(tl?tl.value.toUpperCase():"JS")+":\n"+res.code;tb.classList.remove("hidden");beep("tap");}
function checkLesson() {
  var fb = el("lesson-feedback"), box = el("lesson-editor"), E = window.BaydaEngine;
  var r = E && box ? (activeLessonId && E.checkLessonEntry ? E.checkLessonEntry(activeLessonId, box.value, activeLessonMode) : E.checkLesson(box.value)) : { status: "error", message: "المحرك غير محمّل." };
  if (fb) {
    fb.textContent = lessonMsg(r.message);
    fb.classList.remove("hidden", "success", "error");
    fb.classList.add(r.status === "ok" ? "success" : "error");
  }
  if (r.status === "ok" && activeLessonId) { markLessonSolved(activeLessonId); renderLesson(); }
  beep(r.status === "ok" ? "ok" : "err");
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
  if (box) {
    /* اللصق نصاً عادياً فقط، ومنع إسقاط محتوى خارجي في المحرر */
    box.addEventListener("paste", function (e) {
      var cd = e.clipboardData;
      if (!cd) return;
      e.preventDefault();
      var t = cd.getData("text/plain") || "";
      var ok = false;
      try { ok = document.execCommand("insertText", false, t); } catch (err) { ok = false; }
      if (!ok) box.appendChild(document.createTextNode(t));
      saveCurrentNoteContent();
    });
    box.addEventListener("drop", function (e) { e.preventDefault(); });
  }

  var runBtn = el("run-btn");
  if (runBtn) runBtn.addEventListener("click", runCode);
  var edBox = el("editor");
  if (edBox) {
    edBox.addEventListener("input", updateLineNumbers);
    edBox.addEventListener("scroll", function () {
      var ln = el("line-numbers");
      if (ln) ln.scrollTop = edBox.scrollTop;
    });
  }
  updateLineNumbers();

  var yesBtn = el("confirm-yes-btn");
  if (yesBtn) yesBtn.addEventListener("click", confirmYes);
  var noBtn = el("confirm-no-btn");
  if (noBtn) noBtn.addEventListener("click", confirmNo);

  restoreState();
  applyDialect(currentDialect);

  /* نافذة الترحيب: بعد نافذة اللغة، ومرة واحدة فقط */
  function welcomePending() {
    try { return !localStorage.getItem(LS.welcome); } catch (e) { return false; }
  }
  function langSeen() {
    try { return localStorage.getItem("bayda_lang_seen") === "1"; } catch (e) { return true; }
  }
  if (welcomePending()) {
    var showWelcome = function () {
      setTimeout(function () { if (welcomePending()) openModal("welcome-modal"); }, 350);
    };
    if (langSeen()) showWelcome();
    else document.addEventListener("bayda:lpclosed", showWelcome, { once: true });
  } else if (!langSeen()) {
    document.addEventListener("bayda:lpclosed", function () { if (typeof window.blEnter === "function") window.blEnter(); }, { once: true });
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", restoreInstalledPacks);
} else {
  restoreInstalledPacks();
}

// نغمة ترحيبية خفيفة وذكية عند اكتمال حركة دخول الواجهة
function playEntranceChime() {
  if (typeof beep !== "function") return;
  if (document.body && document.body.getAttribute("data-reduce-motion") === "on") return;
  setTimeout(function () {
    try {
      beep("open");
    } catch (e) {}
  }, 520);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", playEntranceChime);
} else {
  playEntranceChime();
}


// ==========================================
// محرك الحفظ التلقائي للكود (Auto-Save 30s)
// ==========================================
(function initAutoSave() {
  var STORAGE_KEY = "bayda_editor_autosave";

  function getEditorEl() {
    return document.getElementById("editor");
  }

  // 1. مؤقت النسخ الاحتياطي الدوري كل 30 ثانية
  setInterval(function () {
    try {
      var ed = getEditorEl();
      if (!ed) return;
      var text = ed.value || "";
      if (text.trim().length > 0) {
        var now = new Date();
        var timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          code: text,
          timestamp: Date.now(),
          timeStr: timeStr
        }));
        var badge = document.getElementById("autosave-status");
        if (badge) {
          badge.textContent = tx("uxSavedAt", "💾 تم الحفظ {t}").replace("{t}", timeStr);
          badge.style.setProperty("color", "#10b981");
          setTimeout(function() {
            if (badge) badge.style.removeProperty("color");
          }, 1500);
        }
      }
    } catch (e) {
      console.warn("Auto-save failed:", e);
    }
  }, 30000);

  // 2. إشعار الاستعادة التفاعلي عند بدء التشغيل

  function promptRestoreIfAvailable() {
    try {
      if (typeof stGet === "function" && !stGet("restore")) return;
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data || !data.code || !data.code.trim()) return;

      var ed = getEditorEl();
      if (!ed) return;

      // إذا كان الكود الحالي هو نفس المحفوظ لا حاجة لإظهار التنبيه
      if (ed.value && ed.value.trim() === data.code.trim()) return;

      // شريط الاستعادة (الشكل في style.css)
      if (document.querySelector(".restore-bar")) return;
      var mk = function (tag, cls, txt) {
        var e = document.createElement(tag);
        e.className = cls;
        e.textContent = txt;
        return e;
      };
      var box = document.createElement("div");
      box.className = "restore-bar";
      box.setAttribute("role", "alertdialog");
      box.setAttribute("aria-label", tx("rbAria", "استعادة النسخة المحفوظة"));
      var ft = document.getElementById("footer-run");
      var fh = ft ? ft.getBoundingClientRect().height : 0;
      box.style.setProperty("--rb-bottom", Math.round(fh + 14) + "px");

      var msg = document.createElement("div");
      msg.className = "rb-msg";
      msg.appendChild(mk("span", "rb-ic", "📄"));
      msg.appendChild(mk("span", "rb-tx", tx("rbMsg", "وجدنا نسخة محفوظة من عملك السابق")));
      box.appendChild(msg);

      var timer;
      var closeBar = function () {
        clearTimeout(timer);
        if (!box.parentNode) return;
        box.classList.add("out");
        setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 260);
      };

      var actions = document.createElement("div");
      actions.className = "rb-actions";
      var btnRestore = mk("button", "rb-yes", tx("rbRestore", "استعادة"));
      btnRestore.type = "button";
      var btnDismiss = mk("button", "rb-no", tx("rbDismiss", "تجاهل"));
      btnDismiss.type = "button";

      btnRestore.addEventListener("click", function () {
        ed.value = data.code;
        if (typeof updateLineNumbers === "function") updateLineNumbers();
        else if (typeof updateEditorLines === "function") updateEditorLines();
        if (typeof toast === "function") toast(tx("rbDone", "تمت استعادة الكود بنجاح!"));
        closeBar();
      });
      btnDismiss.addEventListener("click", closeBar);

      actions.appendChild(btnRestore);
      actions.appendChild(btnDismiss);
      box.appendChild(actions);
      document.body.appendChild(box);
      timer = setTimeout(closeBar, 20000);
    } catch (e) {
      console.warn("Restore prompt check failed:", e);
    }
  }

  // ينتظر انتهاء شاشة البداية وحركة الدخول قبل أي ظهور
  function whenIntroDone(fn) {
    var d = document.documentElement, tries = 0;
    (function check() {
      if (!d.classList.contains("bl-wait") && !d.classList.contains("bl-intro")) { setTimeout(fn, 700); return; }
      if (++tries > 240) return;
      setTimeout(check, 500);
    })();
  }

  // 3. دالة مسح الحفظ التلقائي من الإعدادات
  window.clearAutoSave = function () {
    try {
      localStorage.removeItem(STORAGE_KEY);
      var badge = document.getElementById("autosave-status");
      if (badge) badge.textContent = "";
      if (typeof toast === "function") {
        toast(tx("uxBackupCleared", "🧹 تم مسح النسخة الاحتياطية للكود بنجاح"));
      }
    } catch (e) {
      console.warn("Could not clear auto-save:", e);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      whenIntroDone(promptRestoreIfAvailable);
    });
  } else {
    whenIntroDone(promptRestoreIfAvailable);
  }
})();
