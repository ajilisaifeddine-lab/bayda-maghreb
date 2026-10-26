/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 ajilisaifeddine-lab
 * This file is part of Bayda Lab. See LICENSE for the full terms.
 */
/* ============================================================
   kid-mode.js — طبقة "وضع الطفل" (واجهة فقط، بلا محركات)
   المشروع: bayda-maghreb/apps/web-lab
   تُحمَّل بعد ui.js و settings.js و dict-ui.js وتضيف:
     1) مرشد كرتوني (روبوت) يطفو ويتفاعل وينطق تلميحات قصيرة
     2) حفلة الثيمات — أربعة عوالم ببطاقات ضخمة بلا قراءة
     3) نظام نجوم ومكافآت (ملصقات) — تحفيز فوري
     4) شريط تنقل سفلي بالأيقونات فقط (أهداف لمس كبيرة)
   لا تحتوي أي بيانات معجمية ولا منطق تنفيذ كود.
   ============================================================ */
"use strict";

(function () {

  var KLS = {
    stars: "baydaKidStars",
    theme: "baydaKidTheme",
    stickers: "baydaKidStickers"
  };

  var THEMES = [
    { id: "candy",  emoji: "\uD83C\uDF6C", name: "\u062D\u0644\u0648\u064A\u0627\u062A", c1: "#ff8fc7", c2: "#ffd166" },
    { id: "jungle", emoji: "\uD83C\uDF34", name: "\u063A\u0627\u0628\u0629",   c1: "#4ade80", c2: "#facc15" },
    { id: "ocean",  emoji: "\uD83C\uDF0A", name: "\u0645\u062D\u064A\u0637",   c1: "#38bdf8", c2: "#a78bfa" },
    { id: "space",  emoji: "\uD83D\uDE80", name: "\u0641\u0636\u0627\u0621",   c1: "#8b5cf6", c2: "#22d3ee" }
  ];

  function kEl(id) { return document.getElementById(id); }
  function kKid() { return document.body.getAttribute("data-mode") === "kid"; }
  function kNum(k, d) {
    var v = parseInt(localStorage.getItem(k), 10);
    return isNaN(v) ? d : v;
  }
  function kSet(k, v) { localStorage.setItem(k, String(v)); }

  function kSfx(kind) {
    if (typeof beep === "function") beep(kind);
  }
  function kFanfare() {
    if (typeof beep !== "function") return;
    beep("ok");
    setTimeout(function () { beep("open"); }, 110);
    setTimeout(function () { beep("ok"); }, 230);
  }

  /* ============================================================
     1) المرشد الكرتوني
     ============================================================ */
  var TIPS = [
    "\u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0623\u064A \u0628\u0637\u0627\u0642\u0629!",
    "\u062C\u0631\u0651\u0628 \u0627\u0644\u0633\u062D\u0628 \u064A\u0645\u064A\u0646\u064B\u0627 \u0648\u064A\u0633\u0627\u0631\u064B\u0627",
    "\u0627\u0636\u063A\u0637 \u0639\u0644\u064A\u0651 \u0628\u0633\u0631\u0639\u0629 5 \u0645\u0631\u0627\u062A!",
    "\u0627\u062C\u0645\u0639 \u0627\u0644\u0646\u062C\u0648\u0645 \u0644\u062A\u0641\u062A\u062D \u0645\u0644\u0635\u0642\u064B\u0627!",
    "\u0627\u062E\u062A\u0631 \u0639\u0627\u0644\u0645\u064B\u0627 \u0645\u0646 \u0632\u0631 \u0627\u0644\u0623\u0644\u0648\u0627\u0646"
  ];
  var tipIndex = 0;
  var buddyTaps = 0;

  function kBuddyInit() {
    if (kEl("kid-buddy")) return;
    var b = document.createElement("div");
    b.id = "kid-buddy";
    b.className = "kb-wrap";
    b.innerHTML = DOMPurify.sanitize(
      '<div class="kb-bubble" id="kb-bubble"></div>' +
      '<button class="kb-body" id="kb-body" aria-label="\u0627\u0644\u0645\u0631\u0634\u062F \u0646\u062C\u0645">' +
      '  <img src="assets/mascot.webp" alt="" class="kb-img">' +
      '  <span class="kb-star">\u2B50</span>' +
      '</button>'
    );
    document.body.appendChild(b);
    kEl("kb-body").addEventListener("click", kBuddyTap);
    setTimeout(function () { kSay(TIPS[0], 2600); }, 900);
  }

  function kSay(text, ms) {
    var bb = kEl("kb-bubble");
    if (!bb) return;
    bb.textContent = text;
    bb.classList.add("on");
    clearTimeout(bb._t);
    bb._t = setTimeout(function () { bb.classList.remove("on"); }, ms || 2400);
  }

  function kBuddyTap() {
    var body = kEl("kb-body");
    if (!body) return;
    body.classList.remove("kb-hop");
    void body.offsetWidth;
    body.classList.add("kb-hop");
    kSfx("tap");
    buddyTaps++;
    kAddStar(1, body);

    if (buddyTaps % 5 === 0) {
      kConfetti(34);
      kFanfare();
      kSay("\u0645\u0641\u0627\u062C\u0623\u0629! \uD83C\uDF89", 2200);
      body.classList.add("kb-spin");
      setTimeout(function () { body.classList.remove("kb-spin"); }, 900);
    } else {
      tipIndex = (tipIndex + 1) % TIPS.length;
      kSay(TIPS[tipIndex], 2400);
    }
  }

  /* ============================================================
     2) النجوم والمكافآت
     ============================================================ */
  function kStarBar() {
    if (kEl("kid-stars")) return;
    var d = document.createElement("div");
    d.id = "kid-stars";
    d.className = "ks-bar";
    d.innerHTML = '<span class="ks-ico">\u2B50</span><span class="ks-num" id="ks-num">0</span>' +
                  '<span class="ks-track"><i id="ks-fill"></i></span>' +
                  '<span class="ks-lvl" id="ks-lvl">1</span>';
    document.body.appendChild(d);
    kStarPaint();
  }

  function kStarPaint() {
    var n = kNum(KLS.stars, 0);
    var num = kEl("ks-num"), fill = kEl("ks-fill"), lvl = kEl("ks-lvl");
    if (!num) return;
    num.textContent = n;
    fill.style.width = ((n % 10) * 10) + "%";
    lvl.textContent = Math.floor(n / 10) + 1;
  }

  function kAddStar(n, fromNode) {
    if (!kKid()) return;
    var total = kNum(KLS.stars, 0) + n;
    kSet(KLS.stars, total);
    kStarPaint();
    if (fromNode) kFlyStar(fromNode);
    if (total % 10 === 0 && total > 0) kStickerUnlock(Math.floor(total / 10));
  }

  function kFlyStar(from) {
    var r = from.getBoundingClientRect();
    var s = document.createElement("span");
    s.className = "ks-fly";
    s.textContent = "\u2B50";
    s.style.left = (r.left + r.width / 2) + "px";
    s.style.top = (r.top + r.height / 2) + "px";
    document.body.appendChild(s);
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 900);
  }

  var STICKERS = ["\uD83E\uDD84", "\uD83D\uDC32", "\uD83D\uDE80", "\uD83C\uDF08", "\uD83E\uDD8B",
                  "\uD83D\uDC19", "\uD83C\uDF1F", "\uD83E\uDDE9", "\uD83D\uDC51", "\uD83C\uDF81"];

  function kStickerUnlock(level) {
    var got = kNum(KLS.stickers, 0);
    if (level <= got) return;
    kSet(KLS.stickers, level);
    kConfetti(40);
    kFanfare();
    kSay("\u0645\u0644\u0635\u0642 \u062C\u062F\u064A\u062F! " + STICKERS[(level - 1) % STICKERS.length], 3000);
    kStickerPop(level);
  }

  function kStickerPop(level) {
    var o = document.createElement("div");
    o.className = "kst-pop";
    o.innerHTML = '<div class="kst-card"><div class="kst-emoji">' +
      STICKERS[(level - 1) % STICKERS.length] + '</div><div class="kst-txt">\u0645\u0644\u0635\u0642 \u0631\u0642\u0645 ' +
      level + '</div></div>';
    document.body.appendChild(o);
    setTimeout(function () { o.classList.add("out"); }, 1700);
    setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 2300);
  }

  /* ============================================================
     3) حفلة الثيمات
     ============================================================ */
  function kPartyOpen() {
    if (kEl("kid-party")) { kPartyClose(); return; }
    var o = document.createElement("div");
    o.id = "kid-party";
    o.className = "kp-overlay";
    var cur = document.body.getAttribute("data-kid-theme") || "candy";
    var cards = "";
    for (var i = 0; i < THEMES.length; i++) {
      var t = THEMES[i];
      cards +=
        '<button class="kp-card' + (t.id === cur ? " on" : "") + '" data-t="' + t.id + '" ' +
        'style="--c1:' + t.c1 + ';--c2:' + t.c2 + '">' +
        '  <span class="kp-blob"></span>' +
        '  <span class="kp-emoji">' + t.emoji + '</span>' +
        '  <span class="kp-name">' + t.name + '</span>' +
        '  <span class="kp-tick">\u2713</span>' +
        '</button>';
    }
    o.innerHTML =
      '<div class="kp-panel">' +
      '  <button class="kp-close" aria-label="\u0625\u063A\u0644\u0627\u0642">\u00D7</button>' +
      '  <div class="kp-title"><span>\uD83C\uDFA8</span> \u062D\u0641\u0644\u0629 \u0627\u0644\u0623\u0644\u0648\u0627\u0646</div>' +
      '  <div class="kp-grid">' + cards + '</div>' +
      '  <button class="kp-dice" id="kp-dice">\uD83C\uDFB2 \u0641\u0627\u062C\u0626\u0646\u064A!</button>' +
      '</div>';
    document.body.appendChild(o);
    requestAnimationFrame(function () { o.classList.add("in"); });

    o.addEventListener("click", function (e) { if (e.target === o) kPartyClose(); });
    o.querySelector(".kp-close").addEventListener("click", kPartyClose);

    var cs = o.querySelectorAll(".kp-card");
    for (var j = 0; j < cs.length; j++) {
      cs[j].addEventListener("click", function () {
        kApplyTheme(this.getAttribute("data-t"), this);
      });
    }
    kEl("kp-dice").addEventListener("click", function () {
      var pick = THEMES[Math.floor(Math.random() * THEMES.length)];
      kApplyTheme(pick.id, o.querySelector('.kp-card[data-t="' + pick.id + '"]'));
    });
    kSfx("open");
  }

  function kPartyClose() {
    var o = kEl("kid-party");
    if (!o) return;
    o.classList.remove("in");
    setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 260);
    kSfx("close");
  }

  function kApplyTheme(id, node) {
    document.body.setAttribute("data-kid-theme", id);
    kSet(KLS.theme, id);
    document.documentElement.style.removeProperty("--primary");

    var all = document.querySelectorAll(".kp-card");
    for (var i = 0; i < all.length; i++) all[i].classList.remove("on");
    if (node) node.classList.add("on");

    kConfetti(26);
    kFanfare();
    kAddStar(1, node);
    kSay("\u0639\u0627\u0644\u0645 \u062C\u062F\u064A\u062F!", 1800);
    if (typeof toast === "function") {
      var t = null;
      for (var k = 0; k < THEMES.length; k++) if (THEMES[k].id === id) t = THEMES[k];
      if (t) toast("\u062B\u064A\u0645: " + t.name + " " + t.emoji);
    }
  }

  /* ============================================================
     4) شريط التنقل بالأيقونات
     ============================================================ */
  function kDock() {
    if (kEl("kid-dock")) return;
    var d = document.createElement("nav");
    d.id = "kid-dock";
    d.className = "kd-dock";
    d.innerHTML =
      '<button class="kd-btn" data-a="top" aria-label="\u0627\u0644\u0623\u0639\u0644\u0649">\uD83C\uDFE0</button>' +
      '<button class="kd-btn" data-a="dict" aria-label="\u0627\u0644\u0642\u0627\u0645\u0648\u0633">\uD83D\uDCD6</button>' +
      '<button class="kd-btn kd-main" data-a="party" aria-label="\u0627\u0644\u0623\u0644\u0648\u0627\u0646">\uD83C\uDFA8</button>' +
      '<button class="kd-btn" data-a="set" aria-label="\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A">\u2699\uFE0F</button>';
    document.body.appendChild(d);

    d.addEventListener("click", function (e) {
      var b = e.target.closest(".kd-btn");
      if (!b) return;
      var a = b.getAttribute("data-a");
      kSfx("tap");
      kAddStar(1, b);
      if (a === "top") window.scrollTo({ top: 0, behavior: "smooth" });
      else if (a === "dict" && typeof toggleDictionary === "function") toggleDictionary();
      else if (a === "party") kPartyOpen();
      else if (a === "set" && typeof openSettings === "function") openSettings();
    });
  }

  /* ============================================================
     5) كونفيتي
     ============================================================ */
  function kConfetti(n) {
    if (document.body.getAttribute("data-reduce-motion") === "on") return;
    var box = document.createElement("div");
    box.className = "kcf-box";
    var shapes = ["\u25CF", "\u25B2", "\u25A0", "\u2605", "\u2665"];
    var colors = ["#ff8fc7", "#ffd166", "#4ade80", "#38bdf8", "#a78bfa", "#fb7185"];
    var html = "";
    for (var i = 0; i < n; i++) {
      var dx = (Math.random() * 300 - 150).toFixed(0);
      var rot = (Math.random() * 720 - 360).toFixed(0);
      var delay = (Math.random() * 0.25).toFixed(2);
      var dur = (0.9 + Math.random() * 0.7).toFixed(2);
      html += '<i class="kcf" style="--dx:' + dx + 'px;--rot:' + rot + 'deg;--d:' + delay +
              's;--t:' + dur + 's;color:' + colors[i % colors.length] + '">' +
              shapes[i % shapes.length] + '</i>';
    }
    box.innerHTML = html;
    document.body.appendChild(box);
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 2000);
  }

  /* ============================================================
     6) ربط وتشغيل
     ============================================================ */
  function kApply() {
    var on = kKid();
    document.body.classList.toggle("kid-on", on);

    if (on) {
      kBuddyInit();
      kStarBar();
      kDock();
      var saved = localStorage.getItem(KLS.theme) || "candy";
      document.body.setAttribute("data-kid-theme", saved);
    } else {
      var p = kEl("kid-party");
      if (p && p.parentNode) p.parentNode.removeChild(p);
    }
  }

  function kInit() {
    var orig = window.changeKidTheme;
    window.changeKidTheme = function () {
      if (kKid()) { kPartyOpen(); return; }
      if (typeof orig === "function") orig();
    };

    var origOpen = window.dcOpenCard;
    if (typeof origOpen === "function") {
      window.dcOpenCard = function (i) {
        origOpen.apply(this, arguments);
        if (kKid()) {
          kAddStar(1);
          kSay("\u0623\u062D\u0633\u0646\u062A!", 1600);
        }
      };
    }

    kApply();

    var sel = kEl("mode-select");
    if (sel) sel.addEventListener("change", function () { setTimeout(kApply, 30); });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && kEl("kid-party")) kPartyClose();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", kInit);
  } else {
    kInit();
  }

  window.kPartyOpen = kPartyOpen;
  window.kPartyClose = kPartyClose;
  window.kAddStar = kAddStar;
  window.kConfetti = kConfetti;
  window.kBuddyTap = kBuddyTap;
  window.kSay = kSay;

})();
