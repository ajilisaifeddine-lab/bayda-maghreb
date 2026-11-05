// apps/web-lab/tooltip.js - Unified Long-Press & Hover Tooltip Manager
// Vanilla ES module / IIFE compatible with strict CSP (no inline styles)

(function () {
  "use strict";

  var tipEl = null;
  var pressTimer = null;
  var hideTimer = null;
  var currentTarget = null;
  var isTouch = false;

  function ensureTipElement() {
    if (tipEl && tipEl.parentNode) return tipEl;
    tipEl = document.createElement("div");
    tipEl.className = "bayda-tooltip";
    tipEl.setAttribute("role", "tooltip");
    tipEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(tipEl);
    return tipEl;
  }

  function getTooltipText(target) {
    if (!target) return "";
    var key = target.getAttribute("data-tooltip-key");
    if (key && window.BaydaI18n && typeof window.BaydaI18n.t === "function") {
      return window.BaydaI18n.t(key);
    }
    var raw = target.getAttribute("data-tooltip");
    if (raw && window.BaydaI18n && typeof window.BaydaI18n.t === "function") {
      var translated = window.BaydaI18n.t(raw);
      if (translated !== raw) return translated;
    }
    return raw || target.getAttribute("aria-label") || target.getAttribute("title") || "";
  }

  function showTooltip(target) {
    var text = getTooltipText(target);
    if (!text) return;

    var tip = ensureTipElement();
    tip.textContent = text;
    tip.classList.remove("show");

    // موضع العنصر
    var rect = target.getBoundingClientRect();
    var tipRect = tip.getBoundingClientRect();

    // حساب الموضع الافتراضي (فوق العنصر)
    var top = rect.top - 38;
    var left = rect.left + (rect.width / 2);

    // إذا لم تكن هناك مساحة في الأعلى، اعرضه أسفل العنصر
    if (top < 10) {
      top = rect.bottom + 8;
    }

    // التأكد من عدم الخروج عن حواف الشاشة أفقياً
    var winW = window.innerWidth || document.documentElement.clientWidth;
    var margin = 12;
    if (left < 60) left = 60;
    if (left > winW - 60) left = winW - 60;

    tip.style.setProperty("top", top + "px");
    tip.style.setProperty("left", left + "px");
    tip.setAttribute("aria-hidden", "false");

    // تفعيل الأنيميشن
    requestAnimationFrame(function () {
      tip.classList.add("show");
    });

    clearTimeout(hideTimer);
    if (isTouch) {
      hideTimer = setTimeout(hideTooltip, 2800);
    }
  }

  function hideTooltip() {
    clearTimeout(pressTimer);
    clearTimeout(hideTimer);
    pressTimer = null;
    currentTarget = null;
    if (tipEl) {
      tipEl.classList.remove("show");
      tipEl.setAttribute("aria-hidden", "true");
    }
  }

  function findTooltipTarget(node) {
    if (!node || !node.closest) return null;
    return node.closest("[data-tooltip], [data-tooltip-key]");
  }

  // أحداث اللمس (Long-Press للهاتف والتابلت)
  document.addEventListener("touchstart", function (e) {
    isTouch = true;
    var target = findTooltipTarget(e.target);
    if (!target) {
      hideTooltip();
      return;
    }
    currentTarget = target;
    clearTimeout(pressTimer);
    pressTimer = setTimeout(function () {
      if (currentTarget) showTooltip(currentTarget);
    }, 450);
  }, { passive: true });

  document.addEventListener("touchmove", function () {
    clearTimeout(pressTimer);
    hideTooltip();
  }, { passive: true });

  document.addEventListener("touchend", function () {
    clearTimeout(pressTimer);
  }, { passive: true });

  document.addEventListener("touchcancel", function () {
    clearTimeout(pressTimer);
    hideTooltip();
  }, { passive: true });

  // أحداث الفأرة (Hover لسطح المكتب)
  document.addEventListener("pointerover", function (e) {
    if (isTouch) return;
    var target = findTooltipTarget(e.target);
    if (!target) return;
    currentTarget = target;
    clearTimeout(pressTimer);
    pressTimer = setTimeout(function () {
      if (currentTarget === target) showTooltip(target);
    }, 300);
  });

  document.addEventListener("pointerout", function (e) {
    if (isTouch) return;
    var target = findTooltipTarget(e.target);
    if (target && target === currentTarget) {
      hideTooltip();
    }
  });

  window.BaydaTooltip = {
    show: showTooltip,
    hide: hideTooltip,
    refresh: function () {
      if (currentTarget && tipEl && tipEl.classList.contains("show")) {
        showTooltip(currentTarget);
      }
    }
  };
})();
