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
})();
