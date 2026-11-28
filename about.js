/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 ajilisaifeddine-lab
 * This file is part of Bayda Lab. See LICENSE for the full terms.
 */
(function () {
  'use strict';
  const D = document, B = D.body;
  const $ = (s, r) => (r || D).querySelector(s);

  const CFG = {
    name: 'Bayda Lab — بيضاء',
    version: '2026.10.23',
    year: '2026',
    holder: 'ajilisaifeddine-lab',
    repo: 'https://github.com/ajilisaifeddine-lab/bayda-maghreb',
    licenseUrl: 'https://www.gnu.org/licenses/agpl-3.0.html',
    privacy: ''
  };
  const FONTS = [['IBM Plex Sans Arabic', 'OFL-1.1'], ['Fira Code', 'OFL-1.1'], ['Baloo Bhaijaan 2', 'OFL-1.1']];

  const css = `
.ab-ov{position:fixed;inset:0;z-index:1350;display:flex;align-items:flex-end;justify-content:center;background:rgba(15,23,42,.5);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);animation:abFade .25s ease-out}
.ab-ov.out{animation:abFadeOut .3s ease-in forwards}
.ab-sheet{position:relative;width:100%;max-width:520px;max-height:88dvh;overflow-y:auto;background:var(--panel,#fff);color:var(--text,#0f172a);border:2px solid var(--border,#e2e8f0);border-bottom:0;border-radius:28px 28px 0 0;padding:20px 18px 28px;box-shadow:0 -12px 40px rgba(0,0,0,.2);animation:abUp .45s cubic-bezier(.3,1.2,.5,1)}
.ab-ov.out .ab-sheet{animation:abDown .3s cubic-bezier(.5,0,.9,.5) forwards}
.ab-x{position:absolute;top:10px;inset-inline-end:12px;width:44px;height:44px;border-radius:50%;border:2px solid var(--border,#e2e8f0);background:var(--bg,#f8fafc);color:inherit;font-size:1.5rem;line-height:1;cursor:pointer}
.ab-sheet h2{font-size:1.3rem;margin-bottom:4px}
.ab-app{font-weight:800;font-size:1.1rem}
.ab-ver{display:block;direction:ltr;text-align:start;color:var(--text-muted,#64748b);font-size:.85rem;margin-bottom:10px}
.ab-sheet p{font-size:.95rem;line-height:1.7;margin-bottom:8px}
.ab-en{direction:ltr;text-align:start;font-size:.85rem!important;color:var(--text-muted,#64748b)}
.ab-sheet h3{font-size:.95rem;margin:14px 0 6px;color:var(--text-muted,#64748b)}
.ab-links{display:flex;flex-direction:column;gap:8px}
.ab-link{display:block;padding:12px 14px;border:2px solid var(--border,#e2e8f0);border-radius:var(--radius,14px);background:var(--bg,#f8fafc);color:var(--primary,#3b82f6);font-weight:700;text-decoration:none}
.ab-sheet ul{padding-inline-start:20px;font-size:.9rem;line-height:1.8}
.ab-gate{margin:10px 0;padding:14px;border:2px dashed var(--primary,#3b82f6);border-radius:var(--radius,14px);text-align:center}
.ab-gate b{display:block;font-size:1.3rem;margin:6px 0;direction:ltr}
.ab-gate input{width:100px;padding:10px;font-size:1.2rem;text-align:center;border:2px solid var(--border,#e2e8f0);border-radius:12px;background:var(--bg,#f8fafc);color:inherit}
.ab-gate button{margin-inline-start:8px;padding:10px 18px;border:0;border-radius:12px;background:var(--primary,#3b82f6);color:var(--on-primary,#fff);font:inherit;font-weight:700;cursor:pointer}
.ab-gate small{display:block;margin-top:6px;color:var(--text-muted,#64748b)}
[data-mode="kid"] .ab-sheet{border-width:4px;border-radius:34px 34px 0 0}
[data-mode="kid"] .ab-link{padding:16px;border-width:3px;border-radius:20px;box-shadow:0 4px 0 var(--border)}
@keyframes abFade{from{opacity:0}to{opacity:1}}
@keyframes abFadeOut{to{opacity:0}}
@keyframes abUp{0%{transform:translateY(100%)}70%{transform:translateY(-8px)}100%{transform:none}}
@keyframes abDown{to{transform:translateY(105%)}}`;
  const st = D.createElement('style'); st.id = 'ab-css'; st.textContent = css; D.head.appendChild(st);

  let ov = null, prevFocus = null;
  const onKey = e => { if (e.key === 'Escape') close(); };

  function go(href) { window.open(href, '_blank', 'noopener,noreferrer'); }

  function gate(href, host) {
    const old = $('.ab-gate', ov); if (old) old.remove();
    const a = 12 + Math.floor(Math.random() * 8), b = 3 + Math.floor(Math.random() * 7), ans = a * b;
    const g = D.createElement('div'); g.className = 'ab-gate';
    g.innerHTML = '<span></span><b></b><input type="number" inputmode="numeric"><button type="button"></button><small hidden></small>';
    $('span', g).textContent = tr('gtAdultMsg', 'هذا الرابط يفتح موقعاً خارجياً. اطلب من أحد الكبار حلّ المسألة:');
    $('input', g).setAttribute('aria-label', tr('gtAnswer', 'الجواب'));
    $('button', g).textContent = tr('gtConfirm', 'تأكيد');
    $('small', g).textContent = tr('gtWrong', 'جواب غير صحيح، حاول مرة أخرى.');
    $('b', g).textContent = a + ' × ' + b + ' = ?';
    const inp = $('input', g), bad = $('small', g);
    $('button', g).addEventListener('click', () => {
      if (parseInt(inp.value, 10) === ans) { g.remove(); go(href); }
      else { bad.hidden = false; inp.value = ''; inp.focus(); }
    });
    host.after(g); inp.focus();
  }

  const tr = (k, fb) => { try { const d = window.BaydaI18n && window.BaydaI18n.dict, l = D.documentElement.lang || 'ar'; return (d && ((d[l] && d[l][k]) || (d.ar && d.ar[k]))) || fb; } catch (e) { return fb; } };

  function open() {
    if (ov) return;
    prevFocus = D.activeElement;
    ov = D.createElement('div');
    ov.className = 'ab-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'حول التطبيق والرخصة');
    ov.innerHTML = '<div class="ab-sheet"><button class="ab-x" type="button" aria-label="إغلاق">×</button><h2>حول التطبيق</h2><span class="ab-app"></span><span class="ab-ver"></span><p class="ab-copy"></p><p>برنامج حر: يمكنك إعادة توزيعه وتعديله بموجب رخصة GNU Affero العامة، الإصدار 3 أو أي إصدار لاحق. ويُقدَّم بلا أي ضمان.</p><p class="ab-en">This program comes with ABSOLUTELY NO WARRANTY. This is free software, and you are welcome to redistribute it under the terms of the GNU Affero General Public License, version 3 or later.</p><p class="ab-priv" hidden></p><div class="ab-links"></div><h3>مكوّنات من أطراف ثالثة</h3><ul class="ab-fonts"></ul></div>';
    const ttl = $('h2', ov), fr = $('p:not([class])', ov), h3 = $('h3', ov), xb = $('.ab-x', ov);
    ov.setAttribute('aria-label', tr('abAria', ov.getAttribute('aria-label')));
    if (ttl) ttl.textContent = tr('abTitle', ttl.textContent);
    if (fr) fr.textContent = tr('abFree', fr.textContent);
    if (h3) h3.textContent = tr('abThird', h3.textContent);
    if (xb) xb.setAttribute('aria-label', tr('close', 'إغلاق'));
    $('.ab-app', ov).textContent = CFG.name;
    $('.ab-ver', ov).textContent = 'v' + CFG.version + ' · AGPL-3.0-or-later';
    $('.ab-copy', ov).textContent = '© ' + CFG.year + ' ' + CFG.holder;
    if (CFG.privacy) { const p = $('.ab-priv', ov); p.textContent = CFG.privacy; p.hidden = false; }
    const links = $('.ab-links', ov);
    [[tr('abSource', 'الشيفرة المصدرية (GitHub)'), CFG.repo], [tr('abLicense', 'نص الرخصة الكامل'), CFG.licenseUrl]].forEach(l => {
      const a = D.createElement('a'); a.className = 'ab-link'; a.href = l[1]; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = l[0] + ' ↗';
      a.addEventListener('click', e => { if (B.dataset.mode === 'kid') { e.preventDefault(); gate(l[1], a); } });
      links.appendChild(a);
    });
    FONTS.forEach(f => { const li = D.createElement('li'); li.textContent = f[0] + ' — ' + f[1]; $('.ab-fonts', ov).appendChild(li); });
    B.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    $('.ab-x', ov).addEventListener('click', close);
    D.addEventListener('keydown', onKey);
    $('.ab-x', ov).focus({ preventScroll: true });
  }

  function close() {
    if (!ov || ov.classList.contains('out')) return;
    const o = ov; o.classList.add('out');
    setTimeout(() => {
      o.remove(); if (ov === o) ov = null;
      D.removeEventListener('keydown', onKey);
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    }, 300);
  }

  window.openAbout = open;

  const sm = $('#settings-modal .st-modal');
  if (sm && !$('#st-about')) {
    const sec = D.createElement('div'); sec.className = 'st-section'; sec.setAttribute('data-sec', 'about'); sec.setAttribute('data-i18n-key', 'aboutSec'); sec.textContent = 'عن التطبيق';
    const rw = D.createElement('div'); rw.className = 'st-row';
    rw.innerHTML = '<span class="st-label" data-i18n-key="aboutRow">حول التطبيق والرخصة</span><button type="button" class="btn-secondary" id="st-about" data-i18n-key="aboutBtn">عرض ›</button>';
    sm.appendChild(sec); sm.appendChild(rw);
    $('#st-about').addEventListener('click', open);
    if (window.BaydaI18n && typeof window.BaydaI18n.updateDom === 'function') { try { window.BaydaI18n.updateDom(sm); } catch (e) {} }
  }
})();
