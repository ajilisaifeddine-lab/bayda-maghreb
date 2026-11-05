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
var DL_NAMES = {
  "tn-latn": "تونسية (لاتيني)",
  "tn-arab": "تونسية (عربي)",
  "dz-latn": "جزائرية (لاتيني)",
  "dz-arab": "جزائرية (عربي)",
  "ma-latn": "مغربية (لاتيني)",
  "ma-arab": "مغربية (عربي)",
  "ly-latn": "ليبية (لاتيني)",
  "ly-arab": "ليبية (عربي)",
  "mr-latn": "حسانية (لاتيني)",
  "mr-arab": "حسانية (عربي)",
  "kab-latn": "قبائلية (لاتيني)",
  "kab-tifinagh": "قبائلية (تيفيناغ)",
  "shi-latn": "شلحية (لاتيني)"
};
var DL_GROUPS = {
  "tn": [{ id: "tn-arab", label: "تنزيل بالحرف العربي" }, { id: "tn-latn", label: "تنزيل بالحرف اللاتيني" }],
  "dz": [{ id: "dz-arab", label: "تنزيل بالحرف العربي" }, { id: "dz-latn", label: "تنزيل بالحرف اللاتيني" }],
  "ma": [{ id: "ma-arab", label: "تنزيل بالحرف العربي" }, { id: "ma-latn", label: "تنزيل بالحرف اللاتيني" }],
  "ly": [{ id: "ly-arab", label: "تنزيل بالحرف العربي" }, { id: "ly-latn", label: "تنزيل بالحرف اللاتيني" }],
  "mr": [{ id: "mr-arab", label: "تنزيل بالحرف العربي" }, { id: "mr-latn", label: "تنزيل بالحرف اللاتيني" }],
  "kab": [{ id: "kab-latn", label: "تنزيل بالحرف اللاتيني" }, { id: "kab-tifinagh", label: "تنزيل بحرف التيفيناغ" }],
  "shi": [{ id: "shi-latn", label: "تنزيل بالحرف اللاتيني" }]
};
var COUNTRY_NAMES = {
  "tn": "اللهجة التونسية",
  "dz": "اللهجة الجزائرية",
  "ma": "الدارجة المغربية",
  "ly": "اللهجة الليبية",
  "mr": "اللهجة الموريتانية (الحسانية)",
  "kab": "اللهجة القبائلية",
  "shi": "اللهجة الشلحية"
};
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
  return Object.prototype.hasOwnProperty.call(DL_NAMES, id) ? DL_NAMES[id] : "هذه اللهجة";
}
function askDlConfirm(id) {
  try {
    var old = document.querySelector(".dl-confirm-wrap");
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var prefix = id.split("-")[0];
    var countryLabel = COUNTRY_NAMES[prefix] || dlLabel(id);
    var variants = DL_GROUPS[prefix] || [{ id: id, label: "تنزيل الحزمة" }];
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
    title.textContent = "تنزيل حزمة " + countryLabel;
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
        if (typeof window.baydaDownloadDialect !== "function") {
          toast(window.BaydaI18n ? window.BaydaI18n.t("toastNotConnected") : "التنزيل غير متصل بالنواة بعد");
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
          await window.baydaDownloadDialect(v.id);

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
          msg.textContent = t("toastDlSuccess", "تم التنزيل والحفظ بنجاح! 🎉");

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
    no.textContent = "إلغاء";
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
    b.setAttribute("aria-label", "تنزيل حزمة " + dlLabel(id));
    b.style.setProperty("width", size + "px");
    b.style.setProperty("height", size + "px");
    b.style.setProperty("left", (r.left + r.width / 2 - size / 2 - h.left) + "px");
    b.style.setProperty("top", (r.top + r.height / 2 - size / 2 - h.top) + "px");
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      hideDlFloat();
      askDlConfirm(id);
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
  } catch (err) { console.error("applyDialect:", err); }
}

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
  currentDialect = btn.getAttribute("data-dialect") || currentDialect;

  var all = document.querySelectorAll(".flag-btn");
  for (var i = 0; i < all.length; i++) all[i].classList.remove("active");
  btn.classList.add("active");
  flagBolt(btn);
  showDlFloat(btn);
  applyDialect(currentDialect);
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
  /* القاموس: درج يبدأ مغلقاً على الهاتف (غير الطفل)، ولا درج في غيره */
  var dp = el("dict-pane");
  if (dp) {
    dp.removeAttribute("data-drawer");
    if (isDrawerMode()) dp.classList.remove("hidden");
  }
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
   14) ما كان يفعله المحرك — مربوط الآن
   ============================================================ */
function runCode() {
  var out = el("output");
  var ed = el("editor");
  if (!out || !ed) return;
  var E = window.BaydaEngine;
  if (!E) {
    out.textContent = "❌ المحرك غير محمّل.";
    toast("❌ المحرك غير محمّل");
    beep("err");
    return;
  }
  var sel = el("target-lang");
  var r = E.runCode(ed.value, sel ? sel.value : "js");
  if (r.ok) {
    out.textContent = r.code || "";
    toast("✅ تم التحويل بنجاح.");
    beep("ok");
  } else {
    out.textContent = "❌ خطأ: " + r.error;
    toast("❌ " + r.error);
    beep("err");
  }
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
  var box = el("lesson-editor");
  var E = window.BaydaEngine;
  var r = E && box ? E.checkLesson(box.value) : { status: "error", message: "المحرك غير محمّل." };
  if (fb) {
    fb.textContent = r.message;
    fb.classList.remove("hidden");
  }
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
