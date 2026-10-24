/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 ajilisaifeddine-lab
 * This file is part of Bayda Lab. See LICENSE for the full terms.
 */
(function () {
  'use strict';
  const D = document, B = D.body;
  const $ = (s, r) => (r || D).querySelector(s);
  const kidOnly = el => { el.classList.add('kid-only'); return el; };

  function place() {
    const wand = $('[onclick="magicCode()"]'), say = $('[onclick="readOutput()"]'), bb = $('#bb-open'), dock = $('.kd-dock');
    const eh = $('#editor-pane .pane-header'), oa = $('#output-pane .output-actions');
    if (wand && eh && !eh.contains(wand)) {
      wand.classList.add('kf-wand');
      eh.insertBefore(kidOnly(wand), eh.lastElementChild);
    }
    if (say && oa && !oa.contains(say)) oa.insertBefore(kidOnly(say), oa.firstChild);
    if (bb && dock && !dock.contains(bb)) {
      bb.className = 'kd-btn kid-only';
      dock.insertBefore(bb, $('.kd-main', dock) || dock.lastElementChild);
    }
  }
  place();
  [400, 1500].forEach(t => setTimeout(place, t));
  new MutationObserver(place).observe(B, { childList: true });

  let closing = false, bypass = false;
  const orig = window.closeSettings;
  function slideClose(done) {
    const m = $('#settings-modal');
    if (closing || !m || B.dataset.mode !== 'kid' || !m.classList.contains('active')) return false;
    closing = true; m.classList.add('kf-closing');
    setTimeout(() => { m.classList.remove('kf-closing'); closing = false; done(); }, 320);
    return true;
  }
  if (typeof orig === 'function') {
    window.closeSettings = function () {
      const a = arguments;
      if (!slideClose(() => orig.apply(window, a))) return orig.apply(this, a);
    };
  }
  D.addEventListener('click', e => {
    if (bypass) return;
    const m = $('#settings-modal');
    if (!m || !m.classList.contains('active')) return;
    const t = e.target;
    if (!(t === m || (t.closest && t.closest('#settings-modal .close-btn')))) return;
    const go = () => { bypass = true; try { typeof orig === 'function' ? orig() : t.click(); } finally { bypass = false; } };
    if (slideClose(go)) { e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);
})();
