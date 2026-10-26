/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 ajilisaifeddine-lab
 * This file is part of Bayda Lab. See LICENSE for the full terms.
 */
import { allVocabularies } from './vocabularies';
import { allKeywords } from './dialects';

/* ============================================================
   dict-ui.js — طبقة عرض بطاقة القاموس التفاعلي (Bayda Lab)
   واجهة فقط. لا محرك، لا معجم، لا بيانات مفردات.
   كل الحقول «أماكن ظهور» تُملأ لاحقًا عند الربط.
   يُحمَّل بعد ui.js و settings.js.
   ============================================================ */

/* ---------- حالة العرض ---------- */
var DC = {
  chips: [],
  index: 0,
  pressTimer: null,
  pressFired: false,
  touchX: 0,
  touchY: 0,
  dragging: false,
  pinchStart: 0,
  scale: 1,
  mascotTaps: 0
};

/* ---------- أدوات ---------- */
function dcMode() {
  return document.body.getAttribute("data-mode") || "beginner";
}
function dcIsKid() { return dcMode() === "kid"; }
function dcIsPro() { return dcMode() === "pro"; }

function dcSfx(kind) {
  if (typeof beep !== "function") return;
  if (dcIsKid()) {
    /* صوت كرتوني: نغمتان متتاليتان */
    beep(kind === "err" ? "err" : "ok");
    setTimeout(function () { beep("tap"); }, 70);
  } else if (dcIsPro()) {
    beep("tap");
  } else {
    beep(kind || "tap");
  }
}

/* ---------- 1) شرائح المفردات (عناصر نائبة) ---------- */
function dcRenderChips() {
  var box = document.getElementById("dict-chips");
  if (!box) return;

  /* أربع شرائح نموذجية كما في التصميم + شريحة شبحية */
  var demo = ["bla", "haqq", "idha", "ktab"];
  var html = "";
  for (var i = 0; i < demo.length; i++) {
    html += '<button class="chip dc-chip dc-tap" data-w="' + demo[i] +
            '" data-i="' + i + '">' + demo[i] + "</button>";
  }
  html += '<button class="chip dc-chip dc-ghost dc-tap" data-i="-1" ' +
          'title="تظهر بقية المفردات عند ربط المعجم">+</button>';
  box.innerHTML = html;

  DC.chips = box.querySelectorAll(".dc-chip");
  dcBindChips();
  dcRenderDots();
}

function dcBindChips() {
  for (var i = 0; i < DC.chips.length; i++) {
    var c = DC.chips[i];

    /* نقرة واحدة */
    c.addEventListener("click", function (e) {
      if (DC.pressFired) { DC.pressFired = false; return; }
      dcRipple(e, this);
      dcOpenCard(parseInt(this.getAttribute("data-i"), 10));
    });

    /* ضغط مطوّل = نظرة سريعة */
    c.addEventListener("pointerdown", function (e) {
      var self = this;
      DC.pressFired = false;
      this.classList.add("dc-pressing");
      DC.pressTimer = setTimeout(function () {
        DC.pressFired = true;
        self.classList.remove("dc-pressing");
        dcPeek(self, e);
      }, 480);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) {
      c.addEventListener(ev, function () {
        clearTimeout(DC.pressTimer);
        this.classList.remove("dc-pressing");
      });
    });

    /* لوحة المفاتيح */
    c.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        dcOpenCard(parseInt(this.getAttribute("data-i"), 10));
      }
    });
  }
}

/* ---------- 2) موجة النقر (Ripple) ---------- */
function dcRipple(e, node) {
  if (!node) return;
  var r = document.createElement("span");
  r.className = "dc-ripple";
  var rect = node.getBoundingClientRect();
  var size = Math.max(rect.width, rect.height) * 1.6;
  var x = (e && e.clientX ? e.clientX - rect.left : rect.width / 2) - size / 2;
  var y = (e && e.clientY ? e.clientY - rect.top : rect.height / 2) - size / 2;
  r.style.width = r.style.height = size + "px";
  r.style.left = x + "px";
  r.style.top = y + "px";
  node.appendChild(r);
  setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, 620);
}

/* ---------- 3) نظرة سريعة (Long press) ---------- */
function dcPeek(node, e) {
  var old = document.getElementById("dc-peek");
  if (old) old.parentNode.removeChild(old);

  var tip = document.createElement("div");
  tip.className = "dc-peek";
  tip.id = "dc-peek";
  tip.innerHTML = '<b>' + (node.getAttribute("data-w") || "+") + "</b>" +
                  '<span>اضغط مطوّلًا للمعاينة — التفاصيل تُفتح بالنقر</span>';

  var rect = node.getBoundingClientRect();
  tip.style.left = Math.max(8, rect.left) + "px";
  tip.style.top = (rect.top - 8) + "px";
  document.body.appendChild(tip);

  requestAnimationFrame(function () { tip.classList.add("show"); });
  dcSfx("tap");

  setTimeout(function () {
    tip.classList.remove("show");
    setTimeout(function () { if (tip.parentNode) tip.parentNode.removeChild(tip); }, 220);
  }, 1500);
}

/* ---------- 4) البطاقة ---------- */
function dcOpenCard(i) {
  var card = document.getElementById("dc-card");
  if (!card) return;

  DC.index = (i < 0) ? 0 : i;

  /* إعادة ضبط الحقول إلى «مكان ظهور» فارغ */
  dcResetFields();

  /* شارة الوضع */
  var badges = document.getElementById("dc-badges");
  if (badges) {
    badges.innerHTML =
      '<span class="dc-badge">' +
      (dcIsKid() ? "وضع الطفل" : dcIsPro() ? "وضع المحترف" : "وضع المبتدئ") +
      "</span>" +
      '<span class="dc-badge dc-badge-empty">بانتظار الربط</span>';
  }

  /* عنوان الشريحة */
  var w = document.getElementById("dw-word");
  if (w) {
    var chip = DC.chips[DC.index];
    w.textContent = chip ? (chip.getAttribute("data-w") || "+") : "—";
  }

  /* حركة الدخول حسب الوضع */
  card.classList.remove("dc-in-kid", "dc-in-beginner", "dc-in-pro");
  void card.offsetWidth;
  card.classList.add("dc-in-" + dcMode());

  if (typeof openModal === "function") openModal("dict-popup");
  dcSfx("open");
  dcRenderDots();
  dcApplyScale(1);
}

function dcResetFields() {
  var ids = ["dw-ar", "dc-role", "dc-js", "dc-py", "dc-ex", "dc-analogy"];
  for (var i = 0; i < ids.length; i++) {
    var n = document.getElementById(ids[i]);
    if (n) {
      n.textContent = "—";
      n.classList.add("dc-empty");
    }
  }
  var slots = document.getElementById("dc-slots");
  if (slots) {
    slots.innerHTML =
      '<div class="dc-slot dc-empty"><span>الرمز</span><b>—</b></div>' +
      '<div class="dc-slot dc-empty"><span>القيمة</span><b>—</b></div>' +
      '<div class="dc-slot dc-empty"><span>تلميح</span><b>—</b></div>' +
      '<div class="dc-slot dc-empty"><span>بطاقة</span><b>—</b></div>';
  }
}

function dcRenderDots() {
  var box = document.getElementById("dc-dots");
  if (!box) return;
  var html = "";
  for (var i = 0; i < DC.chips.length; i++) {
    html += '<i class="dc-dot' + (i === DC.index ? " on" : "") + '"></i>';
  }
  box.innerHTML = html;
}

/* ---------- 5) التنقل: سحب / أسهم ---------- */
function dcNext() { dcGo(1); }
function dcPrev() { dcGo(-1); }

function dcGo(dir) {
  var n = DC.chips.length;
  if (!n) return;
  var i = DC.index + dir;
  if (i < 0) i = n - 1;
  if (i >= n) i = 0;
  dcSlide(dir);
  setTimeout(function () { dcOpenCard(i); }, 150);
}

function dcSlide(dir) {
  var card = document.getElementById("dc-card");
  if (!card) return;
  card.classList.add(dir > 0 ? "dc-slide-l" : "dc-slide-r");
  setTimeout(function () {
    card.classList.remove("dc-slide-l", "dc-slide-r");
  }, 220);
}

function dcBindSwipe() {
  var card = document.getElementById("dc-card");
  if (!card) return;

  card.addEventListener("touchstart", function (e) {
    if (e.touches.length === 2) {
      DC.pinchStart = dcPinchDist(e.touches);
      return;
    }
    DC.touchX = e.touches[0].clientX;
    DC.touchY = e.touches[0].clientY;
    DC.dragging = true;
  }, { passive: true });

  card.addEventListener("touchmove", function (e) {
    if (e.touches.length === 2 && dcIsPro()) {
      var d = dcPinchDist(e.touches);
      var s = DC.scale * (d / (DC.pinchStart || d));
      dcApplyScale(Math.min(1.18, Math.max(0.92, s)));
      return;
    }
    if (!DC.dragging) return;
    var dx = e.touches[0].clientX - DC.touchX;
    card.style.transform = "translateX(" + (dx * 0.35) + "px)";
  }, { passive: true });

  card.addEventListener("touchend", function (e) {
    if (e.touches.length === 2) return;
    if (DC.pinchStart) { DC.scale = dcCurrentScale(); DC.pinchStart = 0; return; }
    DC.dragging = false;
    card.style.transform = "";
    var t = e.changedTouches[0];
    var dx = t.clientX - DC.touchX;
    var dy = t.clientY - DC.touchY;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
      dcGo(dx < 0 ? 1 : -1);
    }
  });
}

function dcPinchDist(t) {
  var dx = t[0].clientX - t[1].clientX;
  var dy = t[0].clientY - t[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}
function dcCurrentScale() {
  var c = document.getElementById("dc-card");
  if (!c) return 1;
  var m = /scale\(([\d.]+)\)/.exec(c.style.transform || "");
  return m ? parseFloat(m[1]) : 1;
}
function dcApplyScale(s) {
  var c = document.getElementById("dc-card");
  if (!c) return;
  DC.scale = s;
  c.style.transform = "scale(" + s + ")";
}

/* ---------- 6) الثيم الفوري ---------- */
function dcQuickTheme() {
  if (typeof cycleTheme === "function") {
    cycleTheme();
    dcSfx("ok");
  }
}

/* ---------- 7) النطق ---------- */
function dcSpeak() {
  var w = document.getElementById("dw-word");
  var txt = w ? w.textContent : "";
  if (!txt || txt === "—") { if (typeof toast === "function") toast("لا يوجد نص بعد"); return; }
  if (!("speechSynthesis" in window)) { if (typeof toast === "function") toast("المتصفح لا يدعم النطق"); return; }
  try {
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(txt);
    u.lang = "ar"; u.rate = dcIsKid() ? 0.85 : 0.95;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

/* ---------- 8) المرشد + البيضة الفصحية (وضع الطفل) ---------- */
function dcMascotTap() {
  if (!dcIsKid()) { dcSfx("tap"); return; }
  DC.mascotTaps++;
  var m = document.getElementById("dc-mascot");
  if (m) {
    m.classList.remove("dc-hop");
    void m.offsetWidth;
    m.classList.add("dc-hop");
  }
  dcSfx("ok");
  if (DC.mascotTaps >= 5) {
    DC.mascotTaps = 0;
    dcConfetti();
    if (typeof toast === "function") toast("وجدت البيضة الفصحية! 🥚✨");
  }
}

function dcConfetti() {
  var host = document.getElementById("dict-popup");
  if (!host) return;
  var colors = ["#f43f5e", "#f59e0b", "#22c55e", "#0ea5e9", "#a855f7", "#ec4899"];
  for (var i = 0; i < 26; i++) {
    var p = document.createElement("i");
    p.className = "dc-confetti";
    p.style.left = (10 + Math.random() * 80) + "%";
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = (Math.random() * 0.35) + "s";
    p.style.setProperty("--dx", (Math.random() * 120 - 60) + "px");
    p.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg");
    host.appendChild(p);
    (function (n) { setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 1600); })(p);
  }
}

/* ---------- 9) الأزرار السفلية ---------- */
function dcBindActions() {
  var card = document.getElementById("dc-card");
  if (!card) return;
  card.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".dc-tap") : null;
    if (b) dcRipple(e, b);
  });
}

/* ---------- 10) تشغيل ---------- */
function dcInit() {
  dcRenderChips();
  dcBindSwipe();
  dcBindActions();

  /* إعادة الرسم عند تغيير الوضع */
  var sel = document.getElementById("mode-select");
  if (sel) {
    sel.addEventListener("change", function () {
      setTimeout(function () {
        dcRenderChips();
        var card = document.getElementById("dc-card");
        if (card) {
          card.classList.remove("dc-in-kid", "dc-in-beginner", "dc-in-pro");
          card.classList.add("dc-in-" + dcMode());
        }
      }, 60);
    });
  }

  /* دعم لوحة المفاتيح داخل البطاقة */
  document.addEventListener("keydown", function (e) {
    var modal = document.getElementById("dict-popup");
    if (!modal || !modal.classList.contains("active")) return;
    if (e.key === "ArrowLeft") dcNext();
    if (e.key === "ArrowRight") dcPrev();
    if (e.key === "Escape" && typeof closeDictPopup === "function") closeDictPopup();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", dcInit);
} else {
  dcInit();
}
