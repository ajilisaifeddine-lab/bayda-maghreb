/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 ajilisaifeddine-lab
 * This file is part of Bayda Lab. See LICENSE for the full terms.
 */
(function () {
  'use strict';
  const D = document, B = D.body, H = D.documentElement;
  const $ = (s, r) => (r || D).querySelector(s);
  const rd = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  const AR = { d: 'rtl', k: 'ar', h: 'مرحباً', v: 'ar-SA' };
  const LW = (k, h, v) => ({ d: 'ltr', k: k, h: h, v: v });
  const WORLD = [
    { id: 'ar', n: 'العربية', s: 'Arabic', c: 'ع', w: {} },
    { id: 'fr', n: 'Français', s: 'الفرنسية', c: 'FR', w: LW('fr', 'Salut', 'fr-FR') },
    { id: 'en', n: 'English', s: 'الإنجليزية', c: 'EN', w: LW('en', 'Hello', 'en-US') },
    { id: 'es', n: 'Español', s: 'الإسبانية', c: 'ES', w: LW('es', 'Hola', 'es-ES') },
    { id: 'it', n: 'Italiano', s: 'الإيطالية', c: 'IT', w: LW('it', 'Ciao', 'it-IT') },
    { id: 'de', n: 'Deutsch', s: 'الألمانية', c: 'DE', w: LW('de', 'Hallo', 'de-DE') },
    { id: 'nl', n: 'Nederlands', s: 'الهولندية', c: 'NL', w: LW('nl', 'Hallo', 'nl-NL') }
  ];
  const ALL = WORLD;
  const W = id => Object.assign({}, AR, (ALL.find(o => o.id === id) || {}).w);
  const isKid = () => B.dataset.mode === 'kid';

  let ov = null, prevFocus = null;
  const cur = () => { const v = rd('bayda_ui_lang', ''); return WORLD.some(w => w.id === v) ? v : 'ar'; };
  const tr = (k, fb) => { try { const d = window.BaydaI18n && window.BaydaI18n.dict, l = H.lang || 'ar'; return (d && ((d[l] && d[l][k]) || (d.ar && d.ar[k]))) || fb; } catch (e) { return fb; } };
  const wsub = o => { try { const v = new Intl.DisplayNames([H.lang || 'ar'], { type: 'language' }).of(o.id); return v && v !== o.n ? v : ''; } catch (e) { return o.s; } };
  const nameOf = id => { const o = WORLD.find(x => x.id === id); return o ? o.n : 'العربية'; };
  const applyWorld = id => { if (WORLD.some(w => w.id === id)) { H.lang = id; B.dataset.uiLang = id; } };
  applyWorld(rd('bayda_ui_lang', ''));
  if (rd('bayda_lang_seen', '') !== '1') B.classList.add('lp-new');
  const seen = () => { wr('bayda_lang_seen', '1'); B.classList.remove('lp-new'); };

  function say(o) {
    const t = W(o.id);
    if (!t.v || !window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t.h); u.lang = t.v; u.rate = .9; u.pitch = 1.2;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  function mark() {
    if (ov) {
      const c = cur();
      ov.querySelectorAll('.lp-row').forEach(r => {
        const on = r.dataset.id === c;
        r.classList.toggle('on', on);
        if (on) r.setAttribute('aria-current', 'true'); else r.removeAttribute('aria-current');
      });
    }
    const sb = $('#st-uilang'); if (sb) sb.textContent = nameOf(cur()) + ' ›';
  }

  async function pick(o, rowBtn) {
    seen();
    wr("bayda_ui_lang", o.id);
    if (isKid()) say(o);
    let ck = null;
    if (rowBtn) {
      rowBtn.classList.add("loading");
      ck = rowBtn.querySelector(".lp-ck");
      if (ck) {
        ck.textContent = "";
        const sp = D.createElement("span");
        sp.className = "lp-spin-loader";
        ck.appendChild(sp);
      }
    }
    try {
      applyWorld(o.id);
      if (window.BaydaI18n) {
        if (typeof window.BaydaI18n.loadAndApply === "function") {
          await window.BaydaI18n.loadAndApply(o.id);
        } else if (typeof window.BaydaI18n.apply === "function") {
          window.BaydaI18n.apply(o.id);
        }
      }
      D.dispatchEvent(new CustomEvent("bayda:uilang", { detail: { id: o.id, dialect: false } }));
    } catch (e) {
      console.warn("Language change failed:", e);
    } finally {
      mark();
      if (rowBtn) {
        rowBtn.classList.remove("loading");
        if (ck) ck.textContent = "\u2713";
      }
      setTimeout(close, 260);
    }
  }

  function row(o, i) {
    const b = D.createElement('button');
    b.type = 'button'; b.className = 'lp-row'; b.dataset.id = o.id; b.style.setProperty('--i', i);
    b.innerHTML = '<span class="lp-ico"></span><span class="lp-nm"><b></b><small></small></span><span class="lp-ck">\u2713</span>';
    $('b', b).textContent = o.n;
    const sn = $('small', b); sn.textContent = wsub(o); sn.hidden = !sn.textContent;
    $('.lp-ico', b).textContent = o.c;
    b.addEventListener('click', () => pick(o, b));
    return b;
  }

  const onKey = e => { if (e.key === 'Escape') close(); };

  function open() {
    if (ov) return;
    prevFocus = D.activeElement;
    B.classList.add('lp-open');
    ov = D.createElement('div');
    ov.className = 'lp-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', tr('uiLangRow', 'لغة الواجهة'));
    ov.innerHTML = '<div class="lp-sheet"><div class="lp-head"><i class="lp-grab"></i><div class="lp-brand"><img class="lp-logo" alt=""><div><h2>اختر لهجتك ولغة التطبيق</h2><p dir="ltr">Choose your dialect &amp; language</p></div></div></div><div class="lp-list"></div><p class="lp-note" hidden></p></div>';
    const logo = $('#main-logo');
    $('.lp-logo', ov).src = logo ? logo.getAttribute('src') : 'assets/logo.png';
    const list = $('.lp-list', ov);
    const hh = $('h2', ov), hs = $('.lp-brand p', ov);
    if (hh) hh.textContent = tr('lpTitle', 'اختر لغة التطبيق');
    if (hs) hs.remove();
    const g = D.createElement('div'); g.className = 'lp-grp w'; list.appendChild(g);
    WORLD.forEach((o, i) => g.appendChild(row(o, i)));
    B.appendChild(ov);
    mark();
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    D.addEventListener('keydown', onKey);

    const head = $('.lp-head', ov), sheet = $('.lp-sheet', ov);
    let y0 = null;
    head.addEventListener('pointerdown', e => { y0 = e.clientY; sheet.style.transition = 'none'; head.setPointerCapture(e.pointerId); });
    head.addEventListener('pointermove', e => { if (y0 !== null) sheet.style.translate = '0 ' + Math.max(0, e.clientY - y0) + 'px'; });
    const end = e => {
      if (y0 === null) return;
      const dy = e.clientY - y0; y0 = null;
      if (dy > 90) { sheet.style.transition = 'translate .3s cubic-bezier(.4, 0, 1, 1)'; sheet.style.translate = '0 105%'; close(); }
      else { sheet.style.transition = 'translate .25s cubic-bezier(.2, .8, .2, 1)'; sheet.style.translate = ''; setTimeout(() => { sheet.style.transition = ''; }, 260); }
    };
    head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
    const a = $('.lp-row.on', ov); if (a) a.focus({ preventScroll: true });
  }

  function close() {
    if (!ov || ov.classList.contains('out')) return;
    seen();
    const o = ov; o.classList.add('out');
    setTimeout(() => {
      o.remove(); if (ov === o) ov = null;
      D.removeEventListener('keydown', onKey);
      B.classList.remove('lp-open');
      try { D.dispatchEvent(new CustomEvent('bayda:lpclosed')); } catch (e) {}
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    }, 300);
  }

  const lc = $('.logo-container');
  if (lc) {
    lc.setAttribute('role', 'button'); lc.tabIndex = 0; lc.setAttribute('aria-label', tr('uiLangRow', 'لغة الواجهة'));
    lc.addEventListener('click', open);
    lc.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  }

  const sm = $('#settings-modal .st-modal');
  if (sm && !$('#st-uilang')) {
    const first = $('.st-section', sm);
    const sec = D.createElement('div'); sec.className = 'st-section'; sec.setAttribute('data-sec', 'lang'); sec.setAttribute('data-i18n-key', 'langSec'); sec.textContent = 'اللغة';
    const rw = D.createElement('div'); rw.className = 'st-row';
    rw.innerHTML = '<span class="st-label" data-i18n-key="uiLangRow">لغة الواجهة</span><button type="button" class="btn-secondary st-lang-btn" id="st-uilang"></button>';
    sm.insertBefore(sec, first); sm.insertBefore(rw, first);
    $('#st-uilang').addEventListener('click', open);
    if (window.BaydaI18n && typeof window.BaydaI18n.updateDom === 'function') { try { window.BaydaI18n.updateDom(sm); } catch (e) {} }
    mark();
  }

  D.addEventListener('bayda:uilang_changed', () => { mark(); });
  if (rd('bayda_lang_seen', '') !== '1') setTimeout(open, 900);
})();
