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
  const DIAL = [
    { id: "tn-latn", n: "تونسية (لاتيني)", s: "Tounsi", w: { h: "أهلا بيك" } },
    { id: "tn-arab", n: "تونسية (عربي)", s: "تونسي", w: { h: "أهلا بيك" } },
    { id: "dz-latn", n: "جزائرية (لاتيني)", s: "Dziri", w: { h: "مرحبا بيك" } },
    { id: "dz-arab", n: "جزائرية (عربي)", s: "دزيري", w: { h: "مرحبا بيك" } },
    { id: "ma-latn", n: "مغربية (لاتيني)", s: "Darija", w: { h: "مرحبا بيك" } },
    { id: "ma-arab", n: "مغربية (عربي)", s: "دارجة", w: { h: "مرحبا بيك" } },
    { id: "ly-latn", n: "ليبية (لاتيني)", s: "Libi", w: { h: "أهلا بيك" } },
    { id: "ly-arab", n: "ليبية (عربي)", s: "ليبي", w: { h: "أهلا بيك" } },
    { id: "mr-latn", n: "حسانية (لاتيني)", s: "Hassaniya", w: { h: "مرحبا بيك" } },
    { id: "mr-arab", n: "حسانية (عربي)", s: "حسانية", w: { h: "مرحبا بيك" } },
    { id: "kab-latn", n: "قبائلية (لاتيني)", s: "Taqbaylit", w: { k: "kab", h: "Ansuf", v: "" } },
    { id: "kab-tifinagh", n: "قبائلية (تيفيناغ)", s: "ⵜⴰⵇⴱⴰⵢⵍⵉⵜ", w: { k: "kab", h: "Ansuf", v: "" } },
    { id: "shi-latn", n: "شلحية (لاتيني)", s: "Tacelḥit", w: { k: "shi", h: "Ansuf", v: "" } }
  ];
  const WORLD = [
    { id: 'ar', n: 'العربية', s: 'Arabic', c: 'ع', w: {} },
    { id: 'en', n: 'English', s: 'الإنجليزية', c: 'EN', w: LW('en', 'Hello', 'en-US') },
    { id: 'fr', n: 'Français', s: 'الفرنسية', c: 'FR', w: LW('fr', 'Salut', 'fr-FR') },
    { id: 'es', n: 'Español', s: 'الإسبانية', c: 'ES', w: LW('es', 'Hola', 'es-ES') },
    { id: 'ru', n: 'Русский', s: 'الروسية', c: 'RU', w: LW('ru', 'Привет', 'ru-RU') },
    { id: 'zh', n: '中文', s: 'الصينية', c: '中', w: LW('zh', '你好', 'zh-CN') }
  ];
  const ALL = DIAL.concat(WORLD);
  const W = id => Object.assign({}, AR, (ALL.find(o => o.id === id) || {}).w);
  const isKid = () => B.dataset.mode === 'kid';

  const css = `
.logo-container{position:relative;cursor:pointer;-webkit-tap-highlight-color:transparent}
.logo-container::after{content:"🌐";position:absolute;bottom:4px;inset-inline-end:8px;width:24px;height:24px;display:grid;place-items:center;font-size:14px;background:var(--panel,#fff);border:2px solid var(--border,#e2e8f0);border-radius:50%;pointer-events:none}
body.lp-new .logo-container::after{animation:lpPulse 1.6s ease-in-out infinite}
.lp-ov{position:fixed;inset:0;z-index:1300;display:flex;align-items:flex-end;justify-content:center;background:rgba(15,23,42,.45);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);animation:lpFade .25s ease-out}
.lp-ov.out{animation:lpFadeOut .3s ease-in forwards}
.lp-sheet{width:100%;max-width:520px;max-height:88dvh;overflow-y:auto;background:var(--panel,#fff);color:var(--text,#0f172a);border:2px solid var(--border,#e2e8f0);border-bottom:0;border-radius:28px 28px 0 0;padding:6px 16px 26px;box-shadow:0 -12px 40px rgba(0,0,0,.2);animation:lpUp .45s cubic-bezier(.3,1.2,.5,1)}
.lp-ov.out .lp-sheet{animation:lpDown .3s cubic-bezier(.5,0,.9,.5) forwards}
.lp-head{position:sticky;top:0;z-index:2;background:var(--panel,#fff);padding:6px 0 10px;touch-action:none}
.lp-grab{display:block;width:46px;height:5px;border-radius:9px;background:var(--border,#cbd5e1);margin:2px auto 10px}
.lp-brand{display:flex;align-items:center;gap:12px}
.lp-logo{width:48px;height:48px;object-fit:contain;animation:lpSpin 14s linear infinite;filter:drop-shadow(0 0 6px var(--primary,#3b82f6))}
.lp-brand h2{font-size:1.2rem}
.lp-brand p{margin-top:2px;font-size:.85rem;color:var(--text-muted,#64748b)}
.lp-sec{font-size:.9rem;font-weight:800;color:var(--text-muted,#64748b);margin:14px 4px 8px}
.lp-sec small{font-weight:600;opacity:.8}
.lp-row{display:grid;grid-template-columns:48px 1fr 28px;align-items:center;gap:12px;width:100%;min-height:60px;padding:8px 12px;margin-bottom:8px;background:var(--bg,#f8fafc);color:inherit;border:2px solid var(--border,#e2e8f0);border-radius:var(--radius,14px);cursor:pointer;text-align:start;font:inherit;transition:transform .12s,box-shadow .12s;position:relative}
.lp-row:active{transform:scale(.98)}
.lp-row.on{border-color:var(--primary,#3b82f6);background:color-mix(in srgb,var(--primary,#3b82f6) 12%,var(--panel,#fff))}
.lp-ico{position:relative;width:48px;height:48px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--primary,#3b82f6);color:var(--on-primary,#fff);font-weight:800;font-size:1.05rem;border:2px solid var(--border,#e2e8f0)}
.lp-ico img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.lp-nm b{display:block;font-size:1.1rem}
.lp-nm small{display:block;font-size:.85rem;color:var(--text-muted,#64748b)}
.lp-soon{display:inline-block;margin-top:2px;font-style:normal;font-size:.7rem;font-weight:700;padding:0 7px;border-radius:99px;background:var(--border,#e2e8f0);color:var(--text-muted,#64748b)}
.lp-ck{visibility:hidden;color:var(--primary,#3b82f6);font-weight:900;font-size:1.3rem;text-align:center}
.lp-row.on .lp-ck{visibility:visible}
.lp-grp.w{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.lp-grp.w .lp-row{grid-template-columns:36px 1fr 18px;gap:8px;min-height:52px;padding:6px 10px;margin:0}
.lp-grp.w .lp-ico{width:36px;height:36px;font-size:.85rem}
.lp-grp.w .lp-nm b{font-size:1rem}
.lp-grp.w .lp-nm small{font-size:.75rem}
.lp-note{margin:10px 4px 0;padding:10px 12px;border-radius:12px;background:color-mix(in srgb,var(--primary,#3b82f6) 10%,var(--panel,#fff));font-size:.9rem;text-align:center}
[data-mode="kid"] .lp-sheet{border-width:4px;border-radius:34px 34px 0 0}
[data-mode="kid"] .lp-grp{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
[data-mode="kid"] .lp-grp .lp-row{grid-template-columns:1fr;justify-items:center;align-content:center;text-align:center;gap:6px;min-height:118px;padding:10px 6px;margin:0;min-width:0;border-width:3px;border-radius:22px;box-shadow:0 4px 0 var(--border);animation:lpPop .4s cubic-bezier(.34,1.56,.64,1) both;animation-delay:calc(var(--i) * 45ms)}
[data-mode="kid"] .lp-grp .lp-row:active{transform:translateY(4px);box-shadow:none}
[data-mode="kid"] .lp-grp .lp-ico{width:64px;height:64px;font-size:1.3rem}
[data-mode="kid"] .lp-grp .lp-nm b{font-size:1rem}
[data-mode="kid"] .lp-grp .lp-nm small,[data-mode="kid"] .lp-soon{display:none}
[data-mode="kid"] .lp-grp .lp-ck{position:absolute;top:6px;inset-inline-end:8px;width:24px;height:24px;line-height:24px;border-radius:50%;background:var(--primary,#3b82f6);color:#fff;font-size:.9rem}
.st-lang-btn{min-width:120px}
body[data-reduce-motion="on"] .lp-logo,body[data-reduce-motion="on"] .lp-row,body.lp-new[data-reduce-motion="on"] .logo-container::after{animation:none}
@keyframes lpFade{from{opacity:0}to{opacity:1}}
@keyframes lpFadeOut{to{opacity:0}}
@keyframes lpUp{0%{transform:translateY(100%)}70%{transform:translateY(-8px)}100%{transform:none}}
@keyframes lpDown{to{transform:translateY(105%)}}
@keyframes lpSpin{to{transform:rotate(-360deg)}}
@keyframes lpPop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes lpPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}`;
  const st = D.createElement('style'); st.id = 'lp-css'; st.textContent = css; D.head.appendChild(st);

  let ov = null, prevFocus = null;
  const cur = () => rd('bayda_ui_lang', '') || ($('.flag-btn.active') ? $('.flag-btn.active').dataset.dialect : 'tn-latn');
  const nameOf = id => { const o = ALL.find(x => x.id === id); return o ? o.n : 'تونسية'; };
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

  function pick(o, isD) {
    seen();
    wr("bayda_ui_lang", o.id);
    if (isKid()) say(o);
    if (isD) {
      const fb = $('.flag-btn[data-dialect="' + o.id + '"]');
      if (fb) {
        fb.click();
      } else {
        if (typeof applyDialect === "function") {
          if (typeof currentDialect !== "undefined") currentDialect = o.id;
          applyDialect(o.id);
          if (typeof saveState === "function") saveState();
        }
        const country = o.id.split("-")[0];
        const pfb = $('.flag-btn[data-dialect^="' + country + '"]');
        if (pfb) {
          D.querySelectorAll(".flag-btn").forEach(b => b.classList.remove("active"));
          pfb.classList.add("active");
        }
      }
    } else applyWorld(o.id);
    D.dispatchEvent(new CustomEvent("bayda:uilang", { detail: { id: o.id, dialect: isD } }));
    mark();
    if (isD || o.id === "ar") { setTimeout(close, 260); return; }
    const note = $(".lp-note", ov);
    if (note) {
      note.textContent = "اخترت «" + o.n + "». ستُفعَّل ترجمة الواجهة عند ربط ملف اللغة.";
      note.hidden = false;
    }
    setTimeout(close, 1500);
  }

  function row(o, i, isD) {
    const b = D.createElement('button');
    b.type = 'button'; b.className = 'lp-row'; b.dataset.id = o.id; b.style.setProperty('--i', i);
    b.innerHTML = '<span class="lp-ico"></span><span class="lp-nm"><b></b><small></small></span><span class="lp-ck">✓</span>';
    $('b', b).textContent = o.n; $('small', b).textContent = o.s;
    if (!isD && o.id !== 'ar') { const e = D.createElement('em'); e.className = 'lp-soon'; e.textContent = 'قريباً'; $('.lp-nm', b).appendChild(e); }
    const ic = $('.lp-ico', b);
    if (isD) {
      ic.textContent = o.s.charAt(0);
      const country = o.id.split("-")[0];
      const im = $('.flag-btn[data-dialect="' + o.id + '"] img') || $('.flag-btn[data-dialect^="' + country + '"] img');
      if (im) { const x = D.createElement('img'); x.src = im.getAttribute('src'); x.alt = ''; x.onerror = () => x.remove(); ic.appendChild(x); }
    } else ic.textContent = o.c;
    b.addEventListener('click', () => pick(o, isD));
    return b;
  }

  const onKey = e => { if (e.key === 'Escape') close(); };

  function open() {
    if (ov) return;
    prevFocus = D.activeElement;
    B.classList.add('lp-open');
    ov = D.createElement('div');
    ov.className = 'lp-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'اللهجة ولغة الواجهة');
    ov.innerHTML = '<div class="lp-sheet"><div class="lp-head"><i class="lp-grab"></i><div class="lp-brand"><img class="lp-logo" alt=""><div><h2>اختر لهجتك ولغة التطبيق</h2><p dir="ltr">Choose your dialect &amp; language</p></div></div></div><div class="lp-list"></div><p class="lp-note" hidden></p></div>';
    const logo = $('#main-logo');
    $('.lp-logo', ov).src = logo ? logo.getAttribute('src') : 'assets/logo.png';
    const list = $('.lp-list', ov);
    let i = 0;
    const sec = (t, sub, cls, arr, isD) => {
      const h = D.createElement('h3'); h.className = 'lp-sec'; h.textContent = t + ' ';
      const s = D.createElement('small'); s.textContent = sub; h.appendChild(s); list.appendChild(h);
      const g = D.createElement('div'); g.className = 'lp-grp ' + cls; list.appendChild(g);
      arr.forEach(o => g.appendChild(row(o, i++, isD)));
    };
    sec('🗣️ لهجتك', '(كلمات البرمجة)', 'd', DIAL, true);
    sec('🌍 لغة الواجهة', '', 'w', WORLD, false);
    B.appendChild(ov);
    mark();
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    D.addEventListener('keydown', onKey);

    const head = $('.lp-head', ov), sheet = $('.lp-sheet', ov);
    let y0 = null;
    head.addEventListener('pointerdown', e => { y0 = e.clientY; sheet.style.animation = 'none'; head.setPointerCapture(e.pointerId); });
    head.addEventListener('pointermove', e => { if (y0 !== null) sheet.style.transform = 'translateY(' + Math.max(0, e.clientY - y0) + 'px)'; });
    const end = e => {
      if (y0 === null) return;
      const dy = e.clientY - y0; y0 = null;
      if (dy > 90) { sheet.style.transform = ''; sheet.style.animation = ''; close(); }
      else { sheet.style.transition = 'transform .25s'; sheet.style.transform = ''; setTimeout(() => { sheet.style.transition = ''; }, 260); }
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
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    }, 300);
  }

  const lc = $('.logo-container');
  if (lc) {
    lc.setAttribute('role', 'button'); lc.tabIndex = 0; lc.setAttribute('aria-label', 'اللهجة ولغة الواجهة');
    lc.addEventListener('click', open);
    lc.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  }

  const sm = $('#settings-modal .st-modal');
  if (sm && !$('#st-uilang')) {
    const first = $('.st-section', sm);
    const sec = D.createElement('div'); sec.className = 'st-section'; sec.textContent = 'اللغة';
    const rw = D.createElement('div'); rw.className = 'st-row';
    rw.innerHTML = '<span class="st-label">اللهجة ولغة الواجهة</span><button type="button" class="btn-secondary st-lang-btn" id="st-uilang"></button>';
    sm.insertBefore(sec, first); sm.insertBefore(rw, first);
    $('#st-uilang').addEventListener('click', open);
    sm.querySelectorAll('.st-label').forEach(l => { if (l.textContent.trim() === 'لغة البرنامج') l.textContent = 'لغة البرمجة'; });
    mark();
  }

  D.addEventListener('click', e => {
    const f = e.target.closest && e.target.closest('.flag-btn');
    if (f && f.dataset.dialect) { wr('bayda_ui_lang', f.dataset.dialect); mark(); }
  });

  if (rd('bayda_lang_seen', '') !== '1') setTimeout(open, 900);
})();
