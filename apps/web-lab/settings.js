/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 ajilisaifeddine-lab
 * This file is part of Bayda Lab. See LICENSE for the full terms.
 */
/* ============================================================
   settings.js — لوحة الإعدادات الموسّعة (Bayda Lab)
   يُحمَّل بعد ui.js. لا يعدّل ui.js، بل يضيف عليه.
   الأقسام: المحرر / التعلّم والصوت / إمكانية الوصول
   ============================================================ */

var ST_KEYS = {
  lang: "baydaLang",
  wrap: "baydaWrap",
  brackets: "baydaBrackets",
  tts: "baydaTTS",
  translate: "baydaTranslate",
  motion: "baydaReduceMotion",
  contrast: "baydaHighContrast",
  dyslexia: "baydaDyslexia",
  colorblind: "baydaColorBlind",
  visualcues: "baydaVisualCues",
  sound: "baydaSound"
};

var ST_DEFAULTS = {
  wrap: true,
  brackets: false,
  tts: false,
  translate: false,
  motion: true,
  contrast: false,
  dyslexia: false,
  colorblind: false,
  visualcues: false
};

var ST_PAIRS = { "(": ")", "[": "]", "{": "}", "\"": "\"", "'": "'" };


function stGet(k) {
  var v = localStorage.getItem(ST_KEYS[k]);
  if (v === null) return !!ST_DEFAULTS[k];
  return v === "true";
}

function stSet(k, v) {
  try { localStorage.setItem(ST_KEYS[k], String(v)); } catch (e) {}
}

function stPaintSwitch(k, v) {
  var b = document.getElementById("st-" + k);
  if (b) b.setAttribute("aria-checked", v ? "true" : "false");
}

/* ---------- التفاف النص ---------- */
function stApplyWrap(on) {
  var ed = document.getElementById("editor");
  if (!ed) return;
  ed.setAttribute("wrap", on ? "soft" : "off");
  ed.style.whiteSpace = on ? "pre-wrap" : "pre";
  ed.style.overflowX = on ? "hidden" : "auto";
}

/* ---------- إغلاق الأقواس تلقائيًا ---------- */
function stBracketHandler(e) {
  if (!(e.key in ST_PAIRS)) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  var el = e.target;
  var s = el.selectionStart;
  var en = el.selectionEnd;
  if (typeof s !== "number") return;
  e.preventDefault();
  var close = ST_PAIRS[e.key];
  if (s !== en) {
    var sel = el.value.slice(s, en);
    el.value = el.value.slice(0, s) + e.key + sel + close + el.value.slice(en);
    el.selectionStart = s + 1;
    el.selectionEnd = en + 1;
  } else {
    el.value = el.value.slice(0, s) + e.key + close + el.value.slice(en);
    el.selectionStart = el.selectionEnd = s + 1;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function stApplyBrackets(on) {
  var ed = document.getElementById("editor");
  if (!ed) return;
  if (ed.dataset.stBrackets === String(on)) return;
  ed.dataset.stBrackets = String(on);
  if (on) ed.addEventListener("keydown", stBracketHandler);
  else ed.removeEventListener("keydown", stBracketHandler);
}

/* ---------- القراءة الصوتية ---------- */
function stReadOutput() {
  var out = document.getElementById("output");
  if (!out) return;
  var text = (out.textContent || "").trim();
  if (!text) { toast(tx("stNoText", "لا يوجد نص للقراءة")); return; }
  if (!("speechSynthesis" in window)) { toast(tx("stNoSpeech", "المتصفح لا يدعم القراءة الصوتية")); return; }
  try {
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = "ar";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
    toast(tx("stReading", "🔊 يقرأ النتيجة"));
  } catch (e) {
    toast(tx("stSpeechFail", "تعذّرت القراءة الصوتية"));
  }
}

function stApplyTTS(on) {
  if (on) {
    window.readOutput = stReadOutput;
  } else {
    window.readOutput = function () {
      toast(tx("stSpeechOff", "القراءة الصوتية معطّلة — فعّلها من الإعدادات"));
    };
  }
}

/* ---------- إمكانية الوصول ---------- */
function stApplyA11y() {
  var motion = stGet("motion");
  var contrast = stGet("contrast");
  var dys = stGet("dyslexia");
  document.body.setAttribute("data-reduce-motion", motion ? "on" : "off");
  document.body.setAttribute("data-contrast", contrast ? "high" : "normal");
  document.body.setAttribute("data-dyslexia", dys ? "on" : "off");
  document.body.setAttribute("data-colorblind", stGet("colorblind") ? "on" : "off");
  document.body.setAttribute("data-visual-cues", stGet("visualcues") ? "on" : "off");
}

/* ---------- مزامنة كل شيء ---------- */
function stApplyAll() {
  stApplyA11y();
  stApplyWrap(stGet("wrap"));
  stApplyBrackets(stGet("brackets"));
  stApplyTTS(stGet("tts"));

  stPaintSwitch("wrap", stGet("wrap"));
  stPaintSwitch("brackets", stGet("brackets"));
  stPaintSwitch("tts", stGet("tts"));
  stPaintSwitch("translate", stGet("translate"));
  stPaintSwitch("motion", stGet("motion"));
  stPaintSwitch("contrast", stGet("contrast"));
  stPaintSwitch("dyslexia", stGet("dyslexia"));
  stPaintSwitch("colorblind", stGet("colorblind"));
  stPaintSwitch("visualcues", stGet("visualcues"));
  stPaintSwitch("sound", typeof soundEnabled === "boolean" ? soundEnabled : true);

  var lang = localStorage.getItem(ST_KEYS.lang) || "js";
  var ls = document.getElementById("st-lang");
  if (ls) ls.value = lang;
  var tl = document.getElementById("target-lang");
  if (tl) tl.value = lang;

  var fs = document.getElementById("st-font");
  if (fs) {
    var cur = localStorage.getItem("baydaFontSize") || "16";
    fs.value = cur;
    if (fs.value !== cur) fs.value = "16";
  }
}

/* ---------- المفاتيح ---------- */
function stToggle(k, btn) {
  var v = !stGet(k);
  stSet(k, v);
  if (btn) btn.setAttribute("aria-checked", v ? "true" : "false");

  if (k === "wrap") stApplyWrap(v);
  else if (k === "brackets") stApplyBrackets(v);
  else if (k === "tts") stApplyTTS(v);
  else if (k === "motion" || k === "contrast" || k === "dyslexia" || k === "colorblind" || k === "visualcues") stApplyA11y();
  else if (k === "sound") {
    window.soundEnabled = v;
    try { localStorage.setItem("baydaSound", String(v)); } catch (e) {}
    if (typeof updateSoundButton === "function") updateSoundButton();
  } else if (k === "translate") {
    toast(v ? tx("stTransOn", "الترجمة الفورية: مفعّلة (المحرك جاهز)") : tx("stTransOff", "الترجمة الفورية: معطّلة"));
  }

  if (k !== "translate") beep(v ? "ok" : "close");
}

function stSetLang(v) {
  try { localStorage.setItem(ST_KEYS.lang, v); } catch (e) {}
  var tl = document.getElementById("target-lang");
  if (tl) tl.value = v;
  beep("tap");
  var names = { js: "JavaScript", py: "Python", algo: tx("langAlgo", "خوارزميات (Algo)"), c: "C", cpp: "C++", java: "Java", php: "PHP" };
  toast(tx("stLangIs", "لغة البرنامج: {name}").replace("{name}", names[v] || v));
}

function stSetFont(v) {
  if (typeof changeFontSize === "function") changeFontSize(v);
  beep("tap");
}

/* ---------- تشغيل ---------- */
function stInit() {
  stApplyAll();

  var origOpen = window.openSettings;
  window.openSettings = function () {
    if (typeof origOpen === "function") origOpen();
    stApplyAll();
  };

  window.toggleSoundFromSettings = function () {
    stToggle("sound", document.getElementById("st-sound"));
  };

  var tl = document.getElementById("target-lang");
  if (tl) {
    tl.addEventListener("change", function () {
      try { localStorage.setItem(ST_KEYS.lang, tl.value); } catch (e) {}
      var ls = document.getElementById("st-lang");
      if (ls) ls.value = tl.value;
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", stInit);
} else {
  stInit();
}

/* ===== ميزات إضافية (الدفعة 1) ===== */
ST_KEYS.autotheme = "baydaAutoTheme";
ST_KEYS.shortcuts = "baydaShortcuts";
ST_KEYS.lines = "baydaLines";
ST_KEYS.onehand = "baydaOneHand";
ST_KEYS.haptics = "baydaHaptics";
ST_DEFAULTS.autotheme = false;
ST_DEFAULTS.shortcuts = true;
ST_DEFAULTS.lines = true;
ST_DEFAULTS.onehand = false;
ST_DEFAULTS.haptics = false;
var ST_EXTRA = ["autotheme", "shortcuts", "lines", "onehand", "haptics"];

var stMQ = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
function stApplyAutoTheme() {
  if (!stGet("autotheme") || !stMQ || typeof applyTheme !== "function") return;
  applyTheme(stMQ.matches ? "dark" : "light");
}
if (stMQ && stMQ.addEventListener) stMQ.addEventListener("change", stApplyAutoTheme);

function stApplyLines(on) {
  var l = document.getElementById("line-numbers");
  if (l) l.style.display = on ? "" : "none";
}

function stShortcutHandler(e) {
  if (!stGet("shortcuts")) return;
  var k = (e.key || "").toLowerCase();
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    var r = document.getElementById("run-btn");
    if (r) r.click();
  } else if ((e.ctrlKey || e.metaKey) && e.key === "/") {
    e.preventDefault();
    if (typeof toggleDictionary === "function") toggleDictionary();
  } else if (e.altKey && k === "t") {
    e.preventDefault();
    if (typeof cycleTheme === "function") cycleTheme();
  } else if (e.altKey && k === "c") {
    e.preventDefault();
    if (typeof copyOutput === "function") copyOutput();
  }
}
document.addEventListener("keydown", stShortcutHandler);

document.addEventListener("click", function (e) {
  if (!stGet("haptics") || !navigator.vibrate) return;
  if (e.target.closest && e.target.closest("button")) {
    try { navigator.vibrate(10); } catch (x) {}
  }
}, true);

function stApplyExtra() {
  stApplyLines(stGet("lines"));
  document.body.setAttribute("data-onehand", stGet("onehand") ? "on" : "off");
  stApplyAutoTheme();
  ST_EXTRA.forEach(function (k) { stPaintSwitch(k, stGet(k)); });
}

var stOrigApplyAll = stApplyAll;
stApplyAll = function () { stOrigApplyAll(); stApplyExtra(); };

var stOrigToggle = stToggle;
stToggle = function (k, btn) {
  if (ST_EXTRA.indexOf(k) === -1) return stOrigToggle(k, btn);
  var v = !stGet(k);
  stSet(k, v);
  if (btn) btn.setAttribute("aria-checked", v ? "true" : "false");
  stApplyExtra();
  if (typeof beep === "function") beep(v ? "ok" : "close");
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    stApplyExtra();
    setTimeout(stApplyAutoTheme, 400);
  });
} else {
  stApplyExtra();
  setTimeout(stApplyAutoTheme, 400);
}

/* ===== التشغيل التلقائي بعد التوقف عن الكتابة ===== */
ST_KEYS.autorun = "baydaAutoRun";
ST_DEFAULTS.autorun = false;
ST_EXTRA.push("autorun");

var stRunTimer = null;
(function () {
  var ed = document.getElementById("editor");
  if (!ed) return;
  ed.addEventListener("input", function () {
    clearTimeout(stRunTimer);
    if (!stGet("autorun")) return;
    stRunTimer = setTimeout(function () {
      if (!ed.value.trim()) return;
      var r = document.getElementById("run-btn");
      if (r) r.click();
    }, 1200);
  });
})();

var stOrigToggle2 = stToggle;
stToggle = function (k, btn) {
  stOrigToggle2(k, btn);
  if (k === "autorun" && stGet("autorun")) {
    toast(tx("stAutoRunWarn", "⚠️ التشغيل التلقائي مفعّل: حلقة لا نهائية قد تجمّد الصفحة"));
  }
};

/* ===== ترقيم الأسطر (متوافق مع التفاف النص) ===== */
var stLN = { mirror: null, sig: "" };
function stUpdateLines() {
  var ed = document.getElementById("editor");
  var ln = document.getElementById("line-numbers");
  if (!ed || !ln || !stGet("lines")) return;
  var cs = getComputedStyle(ed);
  var m = stLN.mirror;
  if (!m) {
    m = stLN.mirror = document.createElement("div");
    m.setAttribute("aria-hidden", "true");
    m.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;left:0;top:0;box-sizing:border-box;overflow-wrap:break-word;";
    document.body.appendChild(m);
  }
  m.style.width = ed.clientWidth + "px";
  m.style.fontFamily = cs.fontFamily;
  m.style.fontSize = cs.fontSize;
  m.style.fontWeight = cs.fontWeight;
  m.style.lineHeight = cs.lineHeight;
  m.style.letterSpacing = cs.letterSpacing;
  m.style.paddingLeft = cs.paddingLeft;
  m.style.paddingRight = cs.paddingRight;
  m.style.whiteSpace = ed.style.whiteSpace === "pre" ? "pre" : "pre-wrap";
  m.innerHTML = "";
  var lines = ed.value.split("\n");
  lines.forEach(function (t) {
    var d = document.createElement("div");
    d.textContent = t || " ";
    m.appendChild(d);
  });
  var out = "";
  for (var i = 0; i < lines.length; i++) {
    out += '<div style="height:' + m.children[i].offsetHeight + 'px">' + (i + 1) + "</div>";
  }
  ln.innerHTML = out;
  ln.style.fontFamily = cs.fontFamily;
  ln.style.fontSize = cs.fontSize;
  ln.style.lineHeight = cs.lineHeight;
  ln.style.paddingTop = cs.paddingTop;
  ln.style.paddingBottom = cs.paddingBottom;
  ln.scrollTop = ed.scrollTop;
}

var stOrigLines = stApplyLines;
stApplyLines = function (on) {
  stOrigLines(on);
  if (on) stUpdateLines();
};

(function () {
  var ed = document.getElementById("editor");
  var ln = document.getElementById("line-numbers");
  if (!ed || !ln) return;
  ed.addEventListener("input", stUpdateLines);
  ed.addEventListener("scroll", function () { ln.scrollTop = ed.scrollTop; });
  window.addEventListener("resize", stUpdateLines);
  setInterval(function () {
    var cs = getComputedStyle(ed);
    var sig = ed.value.length + "|" + ed.clientWidth + "|" + cs.fontSize + "|" + ed.style.whiteSpace;
    if (sig !== stLN.sig) { stLN.sig = sig; stUpdateLines(); }
  }, 400);
  stUpdateLines();
})();

/* ===== ترقيم الأسطر في محرر التعلم ===== */
var stLessonMirror = null, stLessonSig = "";
function stUpdateLesson() {
  var ed = document.getElementById("lesson-editor");
  var ln = document.getElementById("lesson-line-numbers");
  if (!ed || !ln || !stGet("lines") || !ed.clientWidth) return;
  var cs = getComputedStyle(ed);
  var m = stLessonMirror;
  if (!m) {
    m = stLessonMirror = document.createElement("div");
    m.setAttribute("aria-hidden", "true");
    m.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;left:0;top:0;box-sizing:border-box;overflow-wrap:break-word;white-space:pre-wrap;";
    document.body.appendChild(m);
  }
  m.style.width = ed.clientWidth + "px";
  m.style.fontFamily = cs.fontFamily;
  m.style.fontSize = cs.fontSize;
  m.style.lineHeight = cs.lineHeight;
  m.style.paddingLeft = cs.paddingLeft;
  m.style.paddingRight = cs.paddingRight;
  m.innerHTML = "";
  var lines = ed.value.split("\n");
  lines.forEach(function (t) {
    var d = document.createElement("div");
    d.textContent = t || " ";
    m.appendChild(d);
  });
  var out = "";
  for (var i = 0; i < lines.length; i++) {
    out += '<div style="height:' + m.children[i].offsetHeight + 'px">' + (i + 1) + "</div>";
  }
  ln.innerHTML = out;
  ln.style.fontFamily = cs.fontFamily;
  ln.style.fontSize = cs.fontSize;
  ln.style.lineHeight = cs.lineHeight;
  ln.style.paddingTop = cs.paddingTop;
  ln.style.paddingBottom = cs.paddingBottom;
  ln.scrollTop = ed.scrollTop;
}

(function () {
  var ed = document.getElementById("lesson-editor");
  if (!ed || ed.parentNode.classList.contains("lesson-wrap")) return;
  var wrap = document.createElement("div");
  wrap.className = "editor-wrapper lesson-wrap";
  var ln = document.createElement("div");
  ln.className = "line-numbers";
  ln.id = "lesson-line-numbers";
  ln.textContent = "1";
  ed.parentNode.insertBefore(wrap, ed);
  wrap.appendChild(ln);
  wrap.appendChild(ed);
  ed.addEventListener("input", stUpdateLesson);
  ed.addEventListener("scroll", function () { ln.scrollTop = ed.scrollTop; });
  window.addEventListener("resize", stUpdateLesson);
  setInterval(function () {
    var sig = ed.value + "|" + ed.clientWidth;
    if (sig !== stLessonSig) { stLessonSig = sig; stUpdateLesson(); }
  }, 400);
})();

var stOrigLines2 = stApplyLines;
stApplyLines = function (on) {
  stOrigLines2(on);
  var l = document.getElementById("lesson-line-numbers");
  if (l) l.style.display = on ? "" : "none";
  if (on) stUpdateLesson();
};
stApplyLines(stGet("lines"));

/* ===== نجوم عشوائية على الشعار والأعلام ===== */
(function () {
  var hero = document.querySelector(".hero-card");
  if (!hero) return;
  var layer = document.createElement("div");
  layer.className = "bl-stars";
  layer.setAttribute("aria-hidden", "true");
  hero.parentNode.appendChild(layer);

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function spawn() {
    if (document.hidden || stGet("motion") || !stGet("stars") || stMinimal()) return;
    if (layer.children.length > 16) return;
    var targets = hero.querySelectorAll(".flag-btn, .logo-container");
    if (!targets.length) return;
    var t = targets[Math.floor(Math.random() * targets.length)];
    var hr = layer.getBoundingClientRect();
    var tr = t.getBoundingClientRect();
    if (!tr.width) return;
    var isLogo = t.classList.contains("logo-container");
    var pad = isLogo ? 0 : 8;
    var x = tr.left - hr.left + rnd(-pad, tr.width + pad);
    var y = tr.top - hr.top + rnd(-pad, tr.height + pad);
    var s = Math.random() < 0.2 ? rnd(4, 6) : rnd(1.6, 3.4);
    var d = rnd(1.1, 2.4);
    var st = document.createElement("span");
    st.className = "bl-star";
    st.style.left = x + "px";
    st.style.top = y + "px";
    st.style.setProperty("--s", s + "px");
    st.style.setProperty("--d", d + "s");
    st.style.setProperty("--f", s >= 4 ? "0.9" : "0");
    layer.appendChild(st);
    setTimeout(function () { if (st.parentNode) st.parentNode.removeChild(st); }, d * 1000 + 60);
  }
  setInterval(spawn, 260);
})();


/* ===== تصغير اللوحات إلى دوائر ===== */
(function () {
  function MAIN() { return [["output-pane", "📟", tx("stPaneOut", "النتيجة")], ["editor-pane", "📝", tx("stPaneEd", "المحرر")], ["dict-pane", "📖", tx("stPaneDict", "القاموس")]]; }
  var hdr = document.querySelector("header");
  var ctrl = document.querySelector(".controls-card");
  if (!hdr || !ctrl) return;
  var mq = window.matchMedia("(max-width: 768px)");
  var dock = document.createElement("div");
  dock.className = "bl-dock";
  hdr.appendChild(dock);
  var sig = "";

  function active() {
    return mq.matches;
  }
  function isMin(p) { return p && p.classList.contains("pane-minimized"); }
  function toggler(p) { return p.querySelector('.icon-btn[onclick^="togglePane"]'); }

  function render() {
    var on = active();
    document.body.setAttribute("data-dock", on ? "on" : "off");
    if (on) {
      var mins = MAIN().filter(function (it) { return isMin(document.getElementById(it[0])); });
      if (mins.length >= 3) {
        var p0 = document.getElementById(mins[0][0]);
        p0.classList.remove("pane-minimized");
        var t0 = toggler(p0);
        if (t0) t0.textContent = "-";
      }
    }
    var hr = hdr.getBoundingClientRect();
    var cr = ctrl.getBoundingClientRect();
    var top = Math.round(cr.top - hr.top + cr.height / 2 - 23);
    var state = MAIN().map(function (it) { return isMin(document.getElementById(it[0])) ? 1 : 0; }).join("");
    var s = (on ? "1" : "0") + state + top;
    if (s === sig) return;
    sig = s;
    dock.innerHTML = "";
    if (!on) return;
    var slot = 0;
    MAIN().forEach(function (it) {
      var p = document.getElementById(it[0]);
      if (!isMin(p) || slot > 1) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "bl-dock-btn";
      b.textContent = it[1];
      b.title = it[2];
      b.setAttribute("aria-label", it[2]);
      b.style.top = top + "px";
      b.style[slot === 0 ? "right" : "left"] = "12px";
      slot++;
      b.addEventListener("click", function () {
        var t = toggler(p);
        if (t) t.click();
      });
      dock.appendChild(b);
    });
  }

  var origTP = window.togglePane;
  window.togglePane = function (id, btn) {
    var pane = document.getElementById(id);
    var drawer = typeof isDrawerMode === "function" && isDrawerMode();
    if (drawer && id === "dict-pane") { setDrawer(false); return; }
    var isMain = MAIN().some(function (it) { return it[0] === id; });
    if (isMain && pane && !isMin(pane)) {
      var open = MAIN().filter(function (it) {
        var p = document.getElementById(it[0]);
        return p && !isMin(p) && !p.classList.contains("hidden") && !(drawer && it[0] === "dict-pane");
      });
      if (open.length <= 1) {
        toast(tx("stKeepOne", "يجب أن تبقى لوحة واحدة مفتوحة"));
        return;
      }
    }
    origTP(id, btn);
    sig = "";
    render();
  };

  window.addEventListener("resize", render);
  /* بدل الاستعلام الدوري كل 500 مللي ثانية: يُعاد الرسم عند تغيّر اللوحات أو حجم الواجهة فقط */
  var raf = 0;
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; render(); });
  }
  window.addEventListener("orientationchange", schedule);
  if (window.MutationObserver) {
    var mo = new MutationObserver(schedule);
    MAIN().forEach(function (it) {
      var p = document.getElementById(it[0]);
      if (p) mo.observe(p, { attributes: true, attributeFilter: ["class"] });
    });
  }
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(schedule);
    ro.observe(hdr);
    ro.observe(ctrl);
  } else {
    setInterval(render, 1500);
  }
  render();
})();

/* ===== علامة التبويب النشط على body (للتنسيق) ===== */
(function () {
  function mark() {
    var learn = document.getElementById("view-learn");
    var on = learn && getComputedStyle(learn).display !== "none";
    document.body.setAttribute("data-tab", on ? "learn" : "lab");
  }
  setInterval(mark, 300);
  mark();
})();

/* ===== الشريط الذكي: أسهم + رموز + اقتراحات ===== */
ST_KEYS.smartbar = "baydaSmartBar";
ST_KEYS.suggest = "baydaSuggest";
ST_DEFAULTS.smartbar = true;
ST_DEFAULTS.suggest = true;
ST_EXTRA.push("smartbar", "suggest");

(function () {
  var BASIC = ["(", ")", "{", "}", "[", "]", "\"", "'", "=", ";", ":", ",", ".", "+", "-", "*", "/", "<", ">", "!"];
  var PRO_JS = ["==", "===", "!=", "!==", "<=", ">=", "&&", "||", "=>", "+=", "-=", "++", "--", "?", "`", "${}", "//", "/* */", "\\", "|", "&", "%", "^", "~", "_", "@", "$"];
  var PRO_PY = ["==", "!=", "<=", ">=", "+=", "-=", "**", "//", "%", "#", "->", "'''", "\\", "|", "&", "^", "~", "_", "@", "$"];
  var BACK = { "${}": 1, "/* */": 3 };
  var ORD = {
    bjs: ["(", ")", "\"", "'", "=", ";", "{", "}", "[", "]", ".", ",", ":", "+", "-", "*", "/", "<", ">", "!"],
    bpy: ["(", ")", "\"", "'", ":", "=", ",", ".", "[", "]", "{", "}", "+", "-", "*", "/", "<", ">", "!", "#"],
    pjs: ["(", ")", "{", "}", "[", "]", "\"", "'", "`", ";", ":", ",", ".", "=", "=>", "==", "===", "!=", "!==", "&&", "||", "!", "?", "+", "-", "*", "/", "%", "<", ">", "<=", ">=", "+=", "-=", "++", "--", "${}", "//", "/* */", "\\", "|", "&", "^", "~", "_", "@", "$", "#"],
    ppy: ["(", ")", ":", "\"", "'", "[", "]", "{", "}", ",", ".", "=", "==", "!=", "<", ">", "<=", ">=", "+", "-", "*", "/", "//", "%", "**", "+=", "-=", "#", "->", "_", "\x27\x27\x27", "\\", "|", "&", "^", "~", "@", "$"]
  };
  var KW = {
    js: ["if", "else", "for", "while", "function", "return", "const", "let", "var", "true", "false", "null", "undefined", "class", "new", "try", "catch", "switch", "case", "break", "continue", "async", "await", "import", "export"],
    py: ["def", "class", "if", "elif", "else", "for", "while", "return", "import", "from", "as", "try", "except", "finally", "with", "lambda", "True", "False", "None", "in", "not", "and", "or", "pass", "break", "continue", "yield"]
  };
  var CALLS = {
    js: [["console.log", "console.log()", 1], ["alert", "alert()", 1]],
    py: [["print", "print()", 1], ["len", "len()", 1], ["range", "range()", 1], ["input", "input()", 1]]
  };
  var CTRL = /(?:^|[^\w$])(if|while|for|switch|catch|elif|idha)\s$/;

  var cur = null, symSig = "", raf = 0, holdT = null, holdI = null;

  function mode() { return document.body.getAttribute("data-mode") || "beginner"; }
  function lang() { var t = document.getElementById("target-lang"); return t ? t.value : "js"; }
  function isEd(e) { return !!e && (e.id === "editor" || e.id === "lesson-editor"); }

  var bar = document.createElement("div");
  bar.id = "bl-smart";
  bar.setAttribute("role", "toolbar");
  var sg = document.createElement("div"); sg.className = "bl-sg";
  var row = document.createElement("div"); row.className = "bl-sm";
  var ar = document.createElement("div"); ar.className = "bl-ar";
  var ar2 = document.createElement("div"); ar2.className = "bl-ar bl-ar2";
  var hs = document.createElement("div"); hs.className = "bl-ar bl-hs";
  var sy = document.createElement("div"); sy.className = "bl-sy";
  row.appendChild(ar); row.appendChild(hs); row.appendChild(ar2);
  bar.appendChild(sg); bar.appendChild(sy); bar.appendChild(row);
  document.body.appendChild(bar);

  /* إبقاء التركيز في المحرر حتى لا تُغلق لوحة المفاتيح */
  bar.addEventListener("pointerdown", function (e) { e.preventDefault(); });
  bar.addEventListener("mousedown", function (e) { e.preventDefault(); });
  bar.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  function mk(label, fn, cls) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    if (cls) b.className = cls;
    if (fn) b.addEventListener("click", fn);
    return b;
  }

  function put(txt, back, rl) {
    var ed = cur;
    if (!ed) return;
    var s = ed.selectionStart, e = ed.selectionEnd;
    var a = rl ? s - rl : s;
    ed.setRangeText(txt, a, e, "end");
    var p = a + txt.length - (back || 0);
    ed.setSelectionRange(p, p);
    ed.dispatchEvent(new Event("input", { bubbles: true }));
    ed.focus();
  }

  function move(dir) {
    var ed = cur;
    if (!ed) return;
    var v = ed.value, p = ed.selectionEnd;
    if (dir === "l") p = Math.max(0, p - 1);
    else if (dir === "r") p = Math.min(v.length, p + 1);
    else {
      var ls = v.lastIndexOf("\n", p - 1) + 1;
      var col = p - ls;
      if (dir === "u") {
        if (ls === 0) p = 0;
        else { var ps = v.lastIndexOf("\n", ls - 2) + 1; p = Math.min(ps + col, ls - 1); }
      } else {
        var ne = v.indexOf("\n", p);
        if (ne === -1) p = v.length;
        else {
          var ns = ne + 1, nn = v.indexOf("\n", ns);
          p = Math.min(ns + col, nn === -1 ? v.length : nn);
        }
      }
    }
    ed.setSelectionRange(p, p);
  }

  function stopHold() {
    clearTimeout(holdT); clearInterval(holdI);
    holdT = holdI = null;
  }

  [["◀", "l"], ["▲", "u"], ["▼", "d"], ["▶", "r"]].forEach(function (a) {
    var b = mk(a[0], null);
    b.addEventListener("pointerdown", function () {
      move(a[1]); stopHold();
      holdT = setTimeout(function () {
        holdI = setInterval(function () { move(a[1]); }, 60);
      }, 350);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) { b.addEventListener(ev, stopHold); });
    (a[1] === "u" || a[1] === "d" ? ar : ar2).appendChild(b);
  });
  function del() {
    var ed = cur;
    if (!ed) return;
    var st = ed.selectionStart, en = ed.selectionEnd;
    if (st === en) {
      if (st === 0) return;
      var c = ed.value.charCodeAt(st - 1);
      var n = (c >= 0xDC00 && c <= 0xDFFF) ? 2 : 1;
      ed.setRangeText("", st - n, en, "end");
    } else {
      ed.setRangeText("", st, en, "end");
    }
    ed.dispatchEvent(new Event("input", { bubbles: true }));
  }
  var db = mk("\u232B", null, "bl-del");
  db.addEventListener("pointerdown", function () {
    del(); stopHold();
    holdT = setTimeout(function () { holdI = setInterval(del, 55); }, 350);
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) { db.addEventListener(ev, stopHold); });
  hs.appendChild(db);
  window.addEventListener("pointerup", stopHold);

  function buildSymbols() {
    var m = mode() === "pro" ? "pro" : "basic", L = lang(), s = m + L;
    if (s === symSig) return;
    symSig = s;
    var list = (m === "pro" ? (L === "py" ? ORD.ppy : ORD.pjs) : (L === "py" ? ORD.bpy : ORD.bjs)).slice();
    
    sy.innerHTML = "";
    sy.appendChild(mk("⇥", function () { put(L === "py" ? "    " : "  ", 0, 0); }));
    list.forEach(function (t) {
      sy.appendChild(mk(t, function () { put(t, BACK[t] || 0, 0); }));
    });
  }

  function dictWords() {
    var out = [];
    document.querySelectorAll("#dict-chips > *").forEach(function (c) {
      var t = (c.textContent || "").trim();
      if (/^[A-Za-z_\u0600-\u06FF]{2,}$/.test(t)) out.push(t);
    });
    return out;
  }

  function suggestions(ed) {
    var res = { items: [], rl: 0 };
    if (!stGet("suggest")) return res;
    var L = lang(), before = ed.value.slice(0, ed.selectionStart);
    var m = /[A-Za-z_$\u0600-\u06FF][\w$.\u0600-\u06FF]*$/.exec(before);
    var max = mode() === "pro" ? 8 : 4;
    if (m) {
      var lw = m[0].toLowerCase(), seen = {}, pool = [];
      var add = function (l, t, b) {
        if (!seen[l]) { seen[l] = 1; pool.push([l, t, b || 0, "bl-kw"]); }
      };
      dictWords().forEach(function (k) { add(k, k + " "); });
      CALLS[L].forEach(function (c) { add(c[0], c[1], c[2]); });
      KW[L].forEach(function (k) { add(k, k + " "); });
      res.items = pool.filter(function (p) {
        var l = p[0].toLowerCase();
        return l !== lw && l.indexOf(lw) === 0;
      }).slice(0, max);
      res.rl = m[0].length;
      if (res.items.length) return res;
    }
    var S = [], last = before.slice(-1);
    if (last === ":" && L === "py") S = [["↵ ⇥", "\n    ", 0]];
    else if (last === "{") S = [["↵ }", "\n  \n}", 2]];
    else if (last === "=") S = [["\"\"", "\"\"", 1], ["[]", "[]", 1], ["{}", "{}", 1], ["()", "()", 1]];
    else if (last === "(") S = [[")", ")", 0], ["\"\"", "\"\"", 1]];
    else if (last === ")") S = L === "js" ? [["{ }", " {\n  \n}", 2], [";", ";", 0]] : [[":", ":", 0]];
    else if (CTRL.test(before)) S = [["( )", "()", 1]];
    res.items = S.map(function (x) { return [x[0], x[1], x[2], "bl-sym"]; });
    res.rl = 0;
    return res;
  }

  function drawChips(r) {
    sg.innerHTML = "";
    r.items.forEach(function (it) {
      sg.appendChild(mk(it[0], function () { put(it[1], it[2], r.rl); }, it[3]));
    });
    sg.classList.toggle("on", r.items.length > 0);
  }

  function place() {
    var vv = window.visualViewport, bottom = 0;
    if (vv) bottom = Math.max(0, document.documentElement.clientHeight - (vv.offsetTop + vv.height));
    bar.style.bottom = bottom + "px";
  }

  function refresh() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () {
      var on = !!cur && document.activeElement === cur && mode() !== "kid" && stGet("smartbar");
      document.body.setAttribute("data-smartbar", on ? "on" : "off");
      if (!on) return;
      buildSymbols();
      drawChips(suggestions(cur));
      place();
    });
  }

  document.addEventListener("focusin", function (e) {
    if (isEd(e.target)) { cur = e.target; refresh(); }
  });
  document.addEventListener("focusout", function () { setTimeout(refresh, 150); });
  document.addEventListener("selectionchange", function () {
    if (cur && document.activeElement === cur) refresh();
  });
  document.addEventListener("input", function (e) { if (e.target === cur) refresh(); });
  if (window.visualViewport) {
    visualViewport.addEventListener("resize", place);
    visualViewport.addEventListener("scroll", place);
  }
})();

/* ===== محررات الكود: بلا حرف كبير ولا تصحيح تلقائي ===== */
["editor", "lesson-editor"].forEach(function (id) {
  var e = document.getElementById(id);
  if (!e) return;
  e.setAttribute("autocapitalize", "off");
  e.setAttribute("autocorrect", "off");
  e.setAttribute("autocomplete", "off");
  e.setAttribute("spellcheck", "false");
});

/* ===== خانة بحث القاموس: قالب يصفّي الشرائح الموجودة ===== */
(function () {
  var inp = document.getElementById("dc-search");
  var box = document.getElementById("dict-chips");
  if (!inp || !box) return;
  inp.disabled = false;
  inp.removeAttribute("title");
  inp.setAttribute("autocomplete", "off");
  inp.setAttribute("autocapitalize", "off");
  inp.setAttribute("enterkeyhint", "search");

  function filter() {
    var q = inp.value.trim().toLowerCase();
    box.querySelectorAll(".dc-chip").forEach(function (c) {
      var w = (c.getAttribute("data-w") || c.textContent || "").toLowerCase();
      var ghost = c.classList.contains("dc-ghost");
      c.style.display = (!q || (!ghost && w.indexOf(q) !== -1)) ? "" : "none";
    });
  }
  inp.addEventListener("input", filter);
  new MutationObserver(filter).observe(box, { childList: true });
})();

/* ===== تراجع وإعادة بجانب زر الحذف ===== */
(function () {
  var hs = document.querySelector("#bl-smart .bl-hs");
  var del = hs && hs.querySelector(".bl-del");
  if (!hs || !del) return;
  var H = new WeakMap(), skip = false, tm = null, last = null;
  function isEd(e) { return !!e && (e.id === "editor" || e.id === "lesson-editor"); }
  function get(ed) {
    var h = H.get(ed);
    if (!h) { h = { st: [{ v: ed.value, s: ed.selectionStart }], i: 0 }; H.set(ed, h); }
    return h;
  }
  function snap(ed) {
    if (skip) return;
    var h = get(ed);
    if (h.st[h.i].v === ed.value) return;
    h.st = h.st.slice(0, h.i + 1);
    h.st.push({ v: ed.value, s: ed.selectionStart });
    if (h.st.length > 200) h.st.shift();
    h.i = h.st.length - 1;
  }
  document.addEventListener("focusin", function (e) {
    if (isEd(e.target)) { last = e.target; get(last); }
  });
  document.addEventListener("input", function (e) {
    if (!isEd(e.target)) return;
    var ed = e.target;
    clearTimeout(tm);
    if (skip) return;
    var ch = ed.value.charAt(ed.selectionStart - 1);
    if (!ch || /[\s;,.(){}\[\]:"'=]/.test(ch)) { tm = null; snap(ed); return; }
    tm = setTimeout(function () { tm = null; snap(ed); }, 900);
  });
  function go(dir) {
    var ed = last;
    if (!ed) return;
    if (tm) { clearTimeout(tm); tm = null; snap(ed); }
    var h = get(ed), j = h.i + dir;
    if (j < 0 || j >= h.st.length) return;
    h.i = j; skip = true;
    ed.value = h.st[j].v;
    var p = Math.min(h.st[j].s, ed.value.length);
    ed.setSelectionRange(p, p);
    ed.dispatchEvent(new Event("input", { bubbles: true }));
    skip = false;
  }
  function ws(c) { return c === " " || c === "\t"; }
  function wsn(c) { return c === " " || c === "\t" || c === "\n"; }
  function jump(dir) {
    var ed = last;
    if (!ed) return;
    var v = ed.value, p = ed.selectionEnd, n = v.length;
    if (dir < 0) {
      if (p <= 0) return;
      p--;
      while (p > 0 && !wsn(v.charAt(p - 1)) && !wsn(v.charAt(p))) p--;
    } else {
      if (p >= n) return;
      p++;
      while (p < n && !wsn(v.charAt(p - 1)) && !wsn(v.charAt(p))) p++;
    }
    ed.setSelectionRange(p, p);
  }
  function btn(t, d) {
    var b = document.createElement("button");
    b.type = "button"; b.textContent = t;
    var hT = null, hI = null;
    function stop() { clearTimeout(hT); clearInterval(hI); hT = hI = null; }
    b.addEventListener("pointerdown", function () {
      jump(d); stop();
      hT = setTimeout(function () { hI = setInterval(function () { jump(d); }, 90); }, 350);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) { b.addEventListener(ev, stop); });
    return b;
  }
  hs.insertBefore(btn("\u21B6", -1), del);
  hs.appendChild(btn("\u21B7", 1));
})();

/* ===== « » قفز بين الأسطر ===== */
(function () {
  var hs = document.querySelector("#bl-smart .bl-hs");
  if (!hs) return;
  function ed() {
    var e = document.activeElement;
    return e && (e.id === "editor" || e.id === "lesson-editor") ? e : null;
  }
  function line(dir) {
    var e = ed();
    if (!e) return;
    var v = e.value, n = v.length, p = e.selectionEnd;
    if (dir < 0) {
      if (p === 0) return;
      var ls = v.lastIndexOf("\n", p - 1) + 1;
      if (p > ls) p = ls;
      else if (ls > 0) p = ls - 2 < 0 ? 0 : v.lastIndexOf("\n", ls - 2) + 1;
    } else {
      var le = v.indexOf("\n", p);
      if (le === -1) le = n;
      if (p < le) p = le;
      else if (le < n) { var nn = v.indexOf("\n", le + 1); p = nn === -1 ? n : nn; }
    }
    e.setSelectionRange(p, p);
  }
  function mk2(t, d) {
    var b = document.createElement("button");
    b.type = "button"; b.textContent = t;
    var hT = null, hI = null;
    function stop() { clearTimeout(hT); clearInterval(hI); hT = hI = null; }
    b.addEventListener("pointerdown", function () {
      line(d); stop();
      hT = setTimeout(function () { hI = setInterval(function () { line(d); }, 110); }, 350);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) { b.addEventListener(ev, stop); });
    return b;
  }
  hs.insertBefore(mk2("\u00AB", -1), hs.firstChild);
  hs.appendChild(mk2("\u00BB", 1));
})();

/* ===== ⌫ وحده في الوسط ===== */
(function () {
  var row = document.querySelector("#bl-smart .bl-sm");
  var hs = row && row.querySelector(".bl-hs");
  var ar = row && row.firstElementChild;
  var ar2 = row && row.querySelector(".bl-ar2");
  if (!hs || !ar || !ar2 || ar === hs) return;
  var map = {};
  Array.prototype.slice.call(hs.children).forEach(function (b) { map[b.textContent] = b; });
  if (map["\u00AB"]) ar.appendChild(map["\u00AB"]);
  if (map["\u21B6"]) ar.appendChild(map["\u21B6"]);
  if (map["\u00BB"]) ar2.insertBefore(map["\u00BB"], ar2.firstChild);
  if (map["\u21B7"]) ar2.insertBefore(map["\u21B7"], ar2.firstChild);
})();

/* ===== « » على جانبي شريط الرموز ===== */
(function () {
  var bar = document.getElementById("bl-smart");
  var sy = bar && bar.querySelector(".bl-sy");
  if (!sy || sy.parentNode.classList.contains("bl-symrow")) return;
  var L = null, R = null;
  bar.querySelectorAll(".bl-ar button").forEach(function (b) {
    if (b.textContent === "\u00AB") L = b;
    if (b.textContent === "\u00BB") R = b;
  });
  if (!L || !R) return;
  var wrap = document.createElement("div");
  wrap.className = "bl-symrow";
  bar.insertBefore(wrap, sy);
  wrap.appendChild(L);
  wrap.appendChild(sy);
  wrap.appendChild(R);
  L.classList.add("bl-jump");
  R.classList.add("bl-jump");
})();

/* ===== معاينة مكبّرة للسطر الحالي ===== */
(function () {
  var bar = document.getElementById("bl-smart");
  if (!bar) return;
  var mag = document.createElement("div");
  mag.className = "bl-mag";
  mag.setAttribute("aria-hidden", "true");
  bar.appendChild(mag);

  var shown = false, holding = false, lastTs = 0, hideT = null, loop = null, sig = "";

  function ed() {
    var e = document.activeElement;
    return e && (e.id === "editor" || e.id === "lesson-editor") ? e : null;
  }
  function esc(t) {
    return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function view(line, col, max) {
    var half = Math.floor(max / 2);
    var s = Math.max(0, Math.min(col - half, line.length - max));
    var e = Math.min(line.length, s + max);
    return {
      b: (s > 0 ? "\u2026" : "") + line.slice(s, col),
      a: line.slice(col, e) + (e < line.length ? "\u2026" : "")
    };
  }
  function plain(line, col, max) {
    var v = view(line, Math.min(col, line.length), max);
    return v.b + v.a;
  }
  function row(no, html, cls) {
    return '<div class="ln ' + cls + '"><span class="no">' + no + '</span><span class="tx">' + html + "</span></div>";
  }
  function hide() {
    shown = false; sig = "";
    mag.classList.remove("on");
    clearInterval(loop); loop = null;
    clearTimeout(hideT);
  }
  function render() {
    var e = ed();
    if (!e) { hide(); return; }
    var v = e.value, p = e.selectionEnd;
    var key = v.length + "|" + p + "|" + bar.clientWidth;
    if (key === sig) return;
    sig = key;
    var root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    var max = Math.max(8, Math.floor((bar.clientWidth - 86) / (root * 1.55 * 0.62)));
    var lines = v.split("\n");
    var before = v.slice(0, p);
    var idx = (before.match(/\n/g) || []).length;
    var col = p - (before.lastIndexOf("\n") + 1);
    var vw = view(lines[idx] || "", col, max);
    var h = "";
    if (idx > 0) h += row(idx, esc(plain(lines[idx - 1], col, max)), "");
    h += row(idx + 1, esc(vw.b) + '<i class="caret"></i>' + esc(vw.a), "cur");
    if (idx < lines.length - 1) h += row(idx + 2, esc(plain(lines[idx + 1], col, max)), "");
    mag.innerHTML = h;
  }
  function show() {
    if (!ed() || !stGet("mag")) return;
    clearTimeout(hideT);
    if (!shown) {
      shown = true; sig = "";
      mag.classList.add("on");
      loop = setInterval(render, 90);
    }
    render();
  }
  bar.addEventListener("pointerdown", function (e) {
    var b = e.target.closest ? e.target.closest(".bl-ar button, .bl-jump") : null;
    if (!b) return;
    holding = true; lastTs = Date.now();
    show();
    setTimeout(render, 30);
  }, true);
  function release() {
    if (!holding) return;
    holding = false; lastTs = Date.now();
    clearTimeout(hideT);
    hideT = setTimeout(hide, 1400);
  }
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);

  function touchEditor(e) {
    var t = e.target;
    if (t && (t.id === "editor" || t.id === "lesson-editor")) hide();
  }
  document.addEventListener("pointerdown", touchEditor, true);
  document.addEventListener("touchstart", touchEditor, { capture: true, passive: true });
  function other() {
    if (!shown || holding || Date.now() - lastTs < 350) return;
    hide();
  }
  document.addEventListener("selectionchange", other);
  document.addEventListener("input", other);
  document.addEventListener("focusout", function () {
    setTimeout(function () { if (!ed()) hide(); }, 200);
  });
})();

/* ===== موجة ضوء عند الضغط على « » ===== */
(function () {
  var bar = document.getElementById("bl-smart");
  if (!bar) return;
  bar.addEventListener("pointerdown", function (e) {
    var b = e.target.closest ? e.target.closest(".bl-jump") : null;
    if (!b || document.body.getAttribute("data-reduce-motion") === "on") return;
    var r = b.getBoundingClientRect();
    var d = Math.max(r.width, r.height) * 2;
    var s = document.createElement("span");
    s.className = "bl-rip";
    s.style.cssText = "width:" + d + "px;height:" + d + "px;left:" +
      (e.clientX - r.left - d / 2) + "px;top:" + (e.clientY - r.top - d / 2) + "px";
    b.appendChild(s);
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 520);
  }, true);
})();

/* ===== عمود طافٍ: المقترحات فوق المعاينة المكبّرة ===== */
(function () {
  var bar = document.getElementById("bl-smart");
  var sg = bar && bar.querySelector(".bl-sg");
  var mag = bar && bar.querySelector(".bl-mag");
  if (!sg || !mag || sg.parentNode.classList.contains("bl-stack")) return;
  var st = document.createElement("div");
  st.className = "bl-stack";
  bar.insertBefore(st, bar.firstChild);
  st.appendChild(sg);
  st.appendChild(mag);
})();

/* ===== ترقيم الأسطر في النتيجة (متوافق مع التفاف النص) ===== */
var stOutMirror = null, stOutSig = "";
function stUpdateOut() {
  var pre = document.getElementById("output");
  var ln = document.getElementById("output-line-numbers");
  if (!pre || !ln || !stGet("lines") || !pre.clientWidth) return;
  var cs = getComputedStyle(pre);
  var m = stOutMirror;
  if (!m) {
    m = stOutMirror = document.createElement("div");
    m.setAttribute("aria-hidden", "true");
    m.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;left:0;top:0;box-sizing:border-box;white-space:pre-wrap;";
    document.body.appendChild(m);
  }
  m.style.width = pre.clientWidth + "px";
  m.style.fontFamily = cs.fontFamily;
  m.style.fontSize = cs.fontSize;
  m.style.fontWeight = cs.fontWeight;
  m.style.lineHeight = cs.lineHeight;
  m.style.letterSpacing = cs.letterSpacing;
  m.style.paddingLeft = cs.paddingLeft;
  m.style.paddingRight = cs.paddingRight;
  m.style.wordBreak = cs.wordBreak;
  m.style.overflowWrap = cs.overflowWrap;
  m.innerHTML = "";
  var lines = (pre.textContent || "").split("\n");
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  lines.forEach(function (t) {
    var d = document.createElement("div");
    d.textContent = t || " ";
    m.appendChild(d);
  });
  var out = "";
  for (var i = 0; i < lines.length; i++) {
    out += '<div style="height:' + m.children[i].offsetHeight + 'px">' + (i + 1) + "</div>";
  }
  ln.innerHTML = out;
  ln.style.fontFamily = cs.fontFamily;
  ln.style.fontSize = cs.fontSize;
  ln.style.lineHeight = cs.lineHeight;
  ln.style.paddingTop = cs.paddingTop;
  ln.style.paddingBottom = cs.paddingBottom;
  ln.style.width = Math.max(35, String(lines.length).length * 11 + 18) + "px";
  ln.scrollTop = pre.scrollTop;
}

(function () {
  var pre = document.getElementById("output");
  if (!pre || pre.parentNode.classList.contains("out-wrap")) return;
  var wrap = document.createElement("div");
  wrap.className = "editor-wrapper out-wrap";
  var ln = document.createElement("div");
  ln.className = "line-numbers";
  ln.id = "output-line-numbers";
  ln.textContent = "1";
  pre.parentNode.insertBefore(wrap, pre);
  wrap.appendChild(ln);
  wrap.appendChild(pre);
  pre.addEventListener("scroll", function () { ln.scrollTop = pre.scrollTop; });
  window.addEventListener("resize", stUpdateOut);
  new MutationObserver(function () { stUpdateOut(); })
    .observe(pre, { childList: true, characterData: true, subtree: true });
  setInterval(function () {
    var cs = getComputedStyle(pre);
    var sig = (pre.textContent || "").length + "|" + pre.clientWidth + "|" + cs.fontSize;
    if (sig !== stOutSig) { stOutSig = sig; stUpdateOut(); }
  }, 400);
  stUpdateOut();
})();

var stOrigLines3 = stApplyLines;
stApplyLines = function (on) {
  stOrigLines3(on);
  var l = document.getElementById("output-line-numbers");
  if (l) l.style.display = on ? "" : "none";
  if (on) stUpdateOut();
};
stApplyLines(stGet("lines"));

/* ===== مفاتيح الشريط الذكي والتأثيرات ===== */
ST_KEYS.mag = "baydaMag";
ST_KEYS.stars = "baydaStars";
ST_KEYS.spin = "baydaSpin";
ST_KEYS.restore = "baydaRestore";
ST_DEFAULTS.mag = true;
ST_DEFAULTS.stars = true;
ST_DEFAULTS.spin = true;
ST_DEFAULTS.restore = true;
ST_EXTRA.push("mag", "stars", "spin", "restore");

var stOrigApplyExtra = stApplyExtra;
stApplyExtra = function () {
  stOrigApplyExtra();
  document.body.setAttribute("data-spin", stGet("spin") ? "on" : "off");
};
stApplyExtra();

/* ===== مسح الكل يشمل خيارات الشريط الذكي والتأثيرات ===== */
(function () {
  var origClear = window.clearAllData;
  if (typeof origClear !== "function") return;
  window.clearAllData = function () {
    var origAsk = window.askConfirm;
    window.askConfirm = function (msg, yes) {
      window.askConfirm = origAsk;
      origAsk(msg, function () {
        if (typeof yes === "function") yes();
        try {
          Object.keys(ST_KEYS).forEach(function (k) { localStorage.removeItem(ST_KEYS[k]); });
        } catch (e) {}
        stApplyAll();
      });
    };
    origClear();
    window.askConfirm = origAsk;
  };
})();

/* ===== وضع الحد الأدنى (للمحترف فقط) ===== */
ST_KEYS.minimal = "baydaMinimal";
ST_DEFAULTS.minimal = false;
ST_EXTRA.push("minimal");

function stMinimal() {
  return document.body.getAttribute("data-minimal") === "on" &&
         document.body.getAttribute("data-mode") === "pro";
}
var stOrigApplyExtra2 = stApplyExtra;
stApplyExtra = function () {
  stOrigApplyExtra2();
  document.body.setAttribute("data-minimal", stGet("minimal") ? "on" : "off");
};
stApplyExtra();

/* ===== الثيم التلقائي: العودة للثيم اليدوي عند الإطفاء ===== */
ST_KEYS.themeManual = "baydaThemeManual";
var stOrigToggle3 = stToggle;
stToggle = function (k, btn) {
  if (k !== "autotheme") return stOrigToggle3(k, btn);
  var wasOn = stGet("autotheme");
  if (!wasOn) {
    try { localStorage.setItem(ST_KEYS.themeManual, document.body.getAttribute("data-theme") || "light"); } catch (e) {}
  }
  stOrigToggle3(k, btn);
  if (wasOn) {
    var t = null;
    try { t = localStorage.getItem(ST_KEYS.themeManual); } catch (e) {}
    if (t && typeof applyTheme === "function") applyTheme(t);
  }
};

/* ===== لوحة الإحصاءات ===== */
ST_KEYS.stats = "baydaStats";
window.blStats = (function () {
  function dayName(i) { return tx("bsDay" + i, ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"][i]); }
  var S = null, tick = 0;

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function key(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function load() {
    if (S) return S;
    try { S = JSON.parse(localStorage.getItem(ST_KEYS.stats) || "null"); } catch (e) { S = null; }
    if (!S || typeof S !== "object" || !S.d) S = { d: {}, last: 0 };
    return S;
  }
  function save() {
    try {
      load();
      if (S.h && localStorage.getItem(ST_KEYS.stats) === null) S = { d: {}, last: 0 };
      S.h = 1;
      localStorage.setItem(ST_KEYS.stats, JSON.stringify(S));
    } catch (e) {}
  }
  function day(k) {
    var s = load();
    if (!s.d[k]) s.d[k] = { r: 0, s: 0 };
    return s.d[k];
  }
  function mins(sec) { return sec < 60 ? sec + " " + tx("bsSecUnit", "ث") : Math.round(sec / 60) + " " + tx("bsMinUnit", "د"); }

  function live() {
    var ed = document.getElementById("editor");
    var v = ed ? ed.value : "";
    var p = ed ? (ed.selectionEnd || 0) : 0, b = v.slice(0, p);
    var vals = {
      "bs-lines": v ? v.split("\n").length : 0,
      "bs-words": (v.trim().match(/\S+/g) || []).length,
      "bs-chars": v.length,
      "bs-pos": ((b.match(/\n/g) || []).length + 1) + ":" + (p - (b.lastIndexOf("\n") + 1) + 1),
      "bs-time": mins(day(key(new Date())).s)
    };
    Object.keys(vals).forEach(function (id) {
      var e = document.getElementById(id);
      if (e) e.textContent = vals[id];
    });
  }

  function card(id, val, label) {
    return '<div class="bs-card"><b id="' + id + '">' + val + "</b><span>" + label + "</span></div>";
  }

  function render() {
    var body = document.getElementById("bl-stats-body");
    if (!body) return;
    var s = load(), now = new Date(), k0 = key(now), t = day(k0);
    var total = 0, active = 0, max = 1, arr = [], bars = "";
    Object.keys(s.d).forEach(function (k) {
      total += s.d[k].r;
      if (s.d[k].r || s.d[k].s > 30) active++;
    });
    for (var i = 6; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      var kk = key(d), x = s.d[kk] || { r: 0, s: 0 };
      arr.push({ k: kk, w: dayName(d.getDay()), r: x.r, s: x.s });
      if (x.r > max) max = x.r;
    }
    arr.forEach(function (a) {
      bars += '<button type="button" class="bs-bar' + (a.k === k0 ? " today" : "") +
        '" data-k="' + a.k + '" data-r="' + a.r + '" data-s="' + a.s + '" data-w="' + a.w + '">' +
        '<i style="height:' + Math.max(4, Math.round(a.r / max * 100)) + '%"></i><em>' + a.r +
        "</em><span>" + a.w + "</span></button>";
    });
    var last = s.last ? new Date(s.last) : null;
    var lastTxt = last ? pad(last.getHours()) + ":" + pad(last.getMinutes()) : "—";
    body.innerHTML =
      '<div class="bs-sec">' + tx("bsCurrent", "الكود الحالي") + '</div><div class="bs-grid">' +
      card("bs-lines", 0, tx("bsLines", "سطر")) + card("bs-words", 0, tx("bsWords", "كلمة")) +
      card("bs-chars", 0, tx("bsChars", "حرف")) + card("bs-pos", "1:1", tx("bsCursor", "المؤشر")) +
      '</div><div class="bs-sec">' + tx("bsUsage", "الاستخدام") + '</div><div class="bs-grid">' +
      card("bs-runs", t.r, tx("bsRunsToday", "تشغيل اليوم")) + card("bs-total", total, tx("bsRunsAll", "تشغيل كلي")) +
      card("bs-time", mins(t.s), tx("bsTimeToday", "وقت اليوم")) + card("bs-last", lastTxt, tx("bsLastRun", "آخر تشغيل")) +
      '</div><div class="bs-sec">' + tx("bsLast7", "آخر 7 أيام (اضغط عموداً)") + '</div><div class="bs-chart">' + bars +
      '</div><div class="bs-detail" id="bs-detail">' + tx("bsActiveDays", "أيام النشاط: {n}").replace("{n}", active) + "</div>";
    live();
  }

  var run = document.getElementById("run-btn");
  if (run) run.addEventListener("click", function () {
    day(key(new Date())).r++;
    load().last = Date.now();
    save();
  });
  setInterval(function () {
    if (document.hidden) return;
    day(key(new Date())).s++;
    if (++tick % 10 === 0) save();
    live();
  }, 1000);
  document.addEventListener("visibilitychange", function () { if (document.hidden) save(); });
  window.addEventListener("pagehide", save);

  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".bs-bar") : null;
    if (!b) return;
    var all = document.querySelectorAll(".bs-bar");
    for (var i = 0; i < all.length; i++) all[i].classList.remove("sel");
    b.classList.add("sel");
    var det = document.getElementById("bs-detail");
    if (det) det.textContent = b.getAttribute("data-w") + " " + b.getAttribute("data-k").slice(5) +
      tx("bsRunsN", "{r} تشغيل، {t}").replace("{r}", b.getAttribute("data-r")).replace("{t}", mins(+b.getAttribute("data-s")));
  });

  return { render: render };
})();

/* ===== ورقة الاختصارات + فتح اللوحات ===== */
(function () {
  function KEYS() { return [
    [["Ctrl", "Enter"], tx("ksRun", "تشغيل الكود")],
    [["Ctrl", "/"], tx("ksDict", "إظهار / إخفاء القاموس")],
    [["Alt", "T"], tx("ksTheme", "تبديل الثيم")],
    [["Alt", "C"], tx("ksCopy", "نسخ النتيجة")],
    [["Alt", "I"], tx("ksStats", "لوحة الإحصاءات")],
    [["Alt", "K"], tx("ksKeys", "ورقة الاختصارات")],
    [["Alt", "S"], tx("ksSettings", "الإعدادات")]
  ]; }
  function TOUCH() { return [
    ["▲ ▼ ◀ ▶", tx("ksMove", "تحريك المؤشر، والضغط المطوّل يكرر")],
    ["« »", tx("ksLineEnds", "بداية السطر / نهايته، ثم السطر السابق / التالي")],
    ["↶ ↷", tx("ksJump", "القفز إلى المسافة السابقة / التالية")],
    ["⌫", tx("ksDel", "حذف حرف، والضغط المطوّل يكرر")],
    ["⇥", tx("ksTab", "إدراج مسافات الإزاحة")]
  ]; }
  function row(keys, txt) {
    return '<div class="bk-row"><span class="bk-keys">' + keys + "</span><span>" + txt + "</span></div>";
  }
  function renderKeys() {
    var body = document.getElementById("bl-keys-body");
    if (!body) return;
    var h = '<div class="bs-sec">' + tx("ksSecKeys", "لوحة المفاتيح") + '</div>';
    KEYS().forEach(function (r) {
      h += row(r[0].map(function (x) { return "<kbd>" + x + "</kbd>"; }).join("+"), r[1]);
    });
    h += '<div class="bs-sec">' + tx("ksSecTouch", "شريط اللمس") + '</div>';
    TOUCH().forEach(function (r) { h += row("<kbd>" + r[0] + "</kbd>", r[1]); });
    h += '<div class="bs-note">' + tx("ksNote", "اختصارات لوحة المفاتيح تعمل عند تفعيل «اختصارات الكيبورد الخارجي» في الإعدادات.") + '</div>';
    body.innerHTML = h;
  }
  window.stOpenPanel = function (id) {
    if (id === "stats-modal") window.blStats.render(); else renderKeys();
    if (typeof closeSettings === "function") closeSettings();
    if (typeof openModal === "function") openModal(id);
  };
  document.addEventListener("keydown", function (e) {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    if (!stGet("shortcuts") || document.body.getAttribute("data-mode") !== "pro") return;
    var k = (e.key || "").toLowerCase();
    if (k === "i") { e.preventDefault(); stOpenPanel("stats-modal"); }
    else if (k === "k") { e.preventDefault(); stOpenPanel("keys-modal"); }
    else if (k === "s") { e.preventDefault(); if (typeof openSettings === "function") openSettings(); }
  });
})();

/* ===== أزرار 📊 ⌨️ بجانب الترس (المحترف) ===== */
ST_KEYS.tools = "baydaTools";
ST_DEFAULTS.tools = true;
ST_EXTRA.push("tools");

var stOrigApplyExtra3 = stApplyExtra;
stApplyExtra = function () {
  stOrigApplyExtra3();
  document.body.setAttribute("data-tools", stGet("tools") ? "on" : "off");
};
stApplyExtra();

(function () {
  var hdr = document.querySelector("header");
  var ctrl = document.querySelector(".controls-card");
  if (!hdr || !ctrl) return;
  function mk(icon, label, panel) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "bl-tool";
    b.textContent = icon;
    b.setAttribute("aria-label", label);
    b.title = label;
    b.addEventListener("click", function () { stOpenPanel(panel); });
    return b;
  }
  var keys = mk("\u2328\uFE0F", tx("ksTitleKeys", "الاختصارات"), "keys-modal");
  var stat = mk("\uD83D\uDCCA", tx("ksTitleStats", "الإحصاءات"), "stats-modal");
  var gear0 = document.querySelector('.tools-row .icon-btn[onclick="openSettings()"]');
  if (gear0) { gear0.before(keys); gear0.after(stat); }
  
})();

/* ===== إمكانية الوصول للنوافذ: حوار + Esc + حبس التركيز (موحّد) ===== */
(function () {
  if (window.__blA11y) return;
  window.__blA11y = true;
  function MODALS() { return {
    "settings-modal": { box: ".st-modal", label: tx("ksSettings", "الإعدادات"), close: tx("uxCloseSettings", "إغلاق الإعدادات") },
    "stats-modal": { box: ".bl-panel", label: tx("ksTitleStats", "الإحصاءات"), close: tx("uxClose", "إغلاق") },
    "keys-modal": { box: ".bl-panel", label: tx("ksTitleKeys", "الاختصارات"), close: tx("uxClose", "إغلاق") }
  }; }
  var openers = {};
  function has(id) { return Object.prototype.hasOwnProperty.call(MODALS(), id); }
  function focusables(box) {
    return Array.prototype.slice.call(box.querySelectorAll("button, select, input, a[href], [tabindex]:not([tabindex='-1'])"))
      .filter(function (e) { return !e.disabled && e.getClientRects().length > 0; });
  }
  function closeIt(id) {
    if (id === "settings-modal" && typeof closeSettings === "function") closeSettings();
    else if (typeof closeModal === "function") closeModal(id);
  }
  function setup(id) {
    var m = document.getElementById(id);
    var box = m && m.querySelector(MODALS()[id].box);
    if (!m || !box) return;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", MODALS()[id].label);
    var cb = box.querySelector(".close-btn");
    if (cb) cb.setAttribute("aria-label", MODALS()[id].close);
    box.querySelectorAll(".st-row").forEach(function (row, i) {
      var lab = row.querySelector(".st-label");
      var ctl = row.querySelector(".st-switch, .st-select");
      if (!lab || !ctl) return;
      if (!lab.id) lab.id = id + "-l" + i;
      ctl.setAttribute("aria-labelledby", lab.id);
    });
    new MutationObserver(function () {
      var on = m.classList.contains("active");
      if (on && !openers[id]) {
        openers[id] = document.activeElement;
        setTimeout(function () { var f = focusables(box); if (f.length) f[0].focus(); }, 60);
      } else if (!on && openers[id]) {
        var o = openers[id];
        openers[id] = null;
        if (o.focus && document.contains(o)) { try { o.focus(); } catch (e) {} }
      }
    }).observe(m, { attributes: true, attributeFilter: ["class"] });
  }
  Object.keys(MODALS()).forEach(setup);
  function top() {
    var a = document.querySelectorAll(".modal-overlay.active");
    return a.length ? a[a.length - 1] : null;
  }
  document.addEventListener("keydown", function (e) {
    var m = top();
    if (!m) return;
    if (m.id === "confirm-modal") {
      if (e.key === "Escape" && typeof confirmNo === "function") { e.preventDefault(); confirmNo(); }
      return;
    }
    if (!has(m.id)) return;
    var box = m.querySelector(MODALS()[m.id].box);
    if (!box) return;
    if (e.key === "Escape") { e.preventDefault(); closeIt(m.id); return; }
    if (e.key !== "Tab") return;
    var f = focusables(box);
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (!box.contains(a)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  });
})();
