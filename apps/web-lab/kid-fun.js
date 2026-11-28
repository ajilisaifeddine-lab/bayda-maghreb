/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 ajilisaifeddine-lab
 * This file is part of Bayda Lab. See LICENSE for the full terms.
 */
(function () {
  'use strict';
  const D = document, B = D.body;
  const rd = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const list = () => { try { const a = JSON.parse(rd('bayda_stk', '[]')); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const calmNow = () => B.dataset.reduceMotion === 'on';

  let ac, muted = rd('bayda_bb_mute', '0') === '1';
  function tone(f1, f2, dur, type, vol, delay) {
    if (muted || B.dataset.sound === 'off') return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f1, t);
      o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(vol || .18, t);
      g.gain.exponentialRampToValueAtTime(.001, t + dur);
      o.connect(g).connect(ac.destination);
      o.start(t); o.stop(t + dur + .02);
    } catch (e) {}
  }
  const arp = (fs, vol) => fs.forEach((f, i) => tone(f, f * 1.01, .16, 'triangle', vol || .15, i * .08));

  function confetti() {
    if (calmNow()) return;
    const box = D.createElement('div'), E = ['🎉', '⭐', '🎈', '✨', '💖', '🌈'];
    box.className = 'kcf-box';
    for (let i = 0; i < 26; i++) {
      const k = D.createElement('i');
      k.className = 'kcf'; k.textContent = E[i % E.length];
      k.style.cssText = `--dx:${(Math.random() - .5) * 340}px;--rot:${(Math.random() - .5) * 720}deg;--t:${1 + Math.random() * .7}s;--d:${Math.random() * .2}s`;
      box.appendChild(k);
    }
    B.appendChild(box); setTimeout(() => box.remove(), 2200);
  }

  const KEY = 'bayda_kid_theme_x', T = 'desert';
  const applyTheme = () => { if (B.dataset.mode === 'kid') B.setAttribute('data-kid-theme', T); };
  const restore = () => { if (rd(KEY, '') === T && B.dataset.mode === 'kid') setTimeout(applyTheme, 150); };

  function inject(grid) {
    if (grid.querySelector('[data-x="' + T + '"]')) return;
    const on = rd(KEY, '') === T && B.dataset.kidTheme === T;
    const c = D.createElement('button');
    c.type = 'button'; c.className = 'kp-card kp-wide' + (on ? ' on' : ''); c.dataset.x = T;
    c.style.setProperty('--c1', '#fb923c'); c.style.setProperty('--c2', '#a855f7');
    c.innerHTML = '<i class="kp-blob"></i><span class="kp-emoji">🐪</span><span class="kp-name"></span><span class="kp-tick">✓</span><span class="kx-new"></span>';
    c.querySelector('.kp-name').textContent = tx('kdDesert', 'الصحراء');
    c.querySelector('.kx-new').textContent = tx('kdNew', 'جديد');
    grid.appendChild(c);
    if (on) grid.querySelectorAll('.kp-card').forEach(x => { if (x !== c) x.classList.remove('on'); });
  }
  new MutationObserver(ms => {
    for (const m of ms) for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      const g = n.matches('.kp-grid') ? n : n.querySelector('.kp-grid');
      if (g) inject(g);
    }
  }).observe(B, { childList: true, subtree: true });

  D.addEventListener('click', e => {
    const c = e.target.closest && e.target.closest('.kp-card, .kp-dice');
    if (!c) return;
    if (c.dataset.x === T) {
      wr(KEY, T); applyTheme();
      c.parentNode.querySelectorAll('.kp-card').forEach(x => x.classList.toggle('on', x === c));
      arp([392, 523, 659]); confetti();
    } else wr(KEY, '');
  }, true);
  new MutationObserver(restore).observe(B, { attributes: true, attributeFilter: ['data-mode'] });
  setTimeout(restore, 400);

  const SYM = ['(', ')', '{', '}', '=', ';', '"', '+', '[', ']'];
  const COL = [['#fb7185', '#f43f5e'], ['#fbbf24', '#f59e0b'], ['#34d399', '#10b981'], ['#60a5fa', '#3b82f6'], ['#c084fc', '#a855f7'], ['#f472b6', '#ec4899']];
  const STK = ['🦄', '🐲', '🦖', '🐪', '🚀', '🌈', '🎈', '🍉', '🐙', '🍭'];
  let ov, tick, total = +rd('bayda_bb_total', '0') || 0, pops = 0, combo = 0, last = 0, calm = false, targetItem = null;
  const LBL_AR={print:"\uD83D\uDDE3\uFE0F \u0627\u0637\u0628\u0639",if:"\uD83D\uDEAA \u0625\u0630\u0627",else:"\uD83D\uDD00 \u0648\u0625\u0644\u0627",true:"\u2705 \u0635\u062D",false:"\u274C \u063A\u0644\u0637",while:"\uD83D\uDD01 \u0645\u0627\u062F\u0627\u0645",for:"\uD83D\uDD04 \u0644\u0643\u0644",let:"\uD83D\uDCE6 \u0645\u062A\u063A\u064A\u0631",fn:"\uD83E\uDDEA \u062F\u0627\u0644\u0629",return:"\u21A9\uFE0F \u0625\u0631\u062C\u0627\u0639",input:"\uD83C\uDFA4 \u0625\u062F\u062E\u0627\u0644",push:"\u2795 \u0623\u0636\u0641",len:"\uD83D\uDCCF \u0627\u0644\u0637\u0648\u0644",break:"\uD83D\uDED1 \u062A\u0648\u0642\u0641",continue:"\u23ED\uFE0F \u0648\u0627\u0635\u0644",try:"\uD83D\uDEE1\uFE0F \u062C\u0631\u0628",catch:"\uD83E\uDEA4 \u0627\u0644\u062A\u0642\u0637",in:"\uD83D\uDD0D \u0641\u064A",and:"\uD83D\uDD17 \u0648",or:"\uD83D\uDD00 \u0623\u0648",not:"\uD83D\uDEAB \u0644\u064A\u0633",null:"\u2205 \u0641\u0627\u0631\u063A"};
  const LBL_FR={print:"\uD83D\uDDE3\uFE0F afficher",if:"\uD83D\uDEAA si",else:"\uD83D\uDD00 sinon",true:"\u2705 vrai",false:"\u274C faux",while:"\uD83D\uDD01 tant que",for:"\uD83D\uDD04 pour",let:"\uD83D\uDCE6 variable",fn:"\uD83E\uDDEA fonction",return:"\u21A9\uFE0F retour",input:"\uD83C\uDFA4 saisir",push:"\u2795 ajouter",len:"\uD83D\uDCCF taille",break:"\uD83D\uDED1 stop",continue:"\u23ED\uFE0F continuer"};
  const LBL_EN={print:"\uD83D\uDDE3\uFE0F print",if:"\uD83D\uDEAA if",else:"\uD83D\uDD00 else",true:"\u2705 true",false:"\u274C false",while:"\uD83D\uDD01 while",for:"\uD83D\uDD04 for",let:"\uD83D\uDCE6 var",fn:"\uD83E\uDDEA function",return:"\u21A9\uFE0F return",input:"\uD83C\uDFA4 input",push:"\u2795 push",len:"\uD83D\uDCCF length",break:"\uD83D\uDED1 break",continue:"\u23ED\uFE0F continue"};
  const SYM_AR={"(":"\u0642\u0648\u0633 \u0641\u062A\u062D",")":"\u0642\u0648\u0633 \u0625\u063A\u0644\u0627\u0642","{":"\u062D\u0627\u0635\u0631\u0629 \u0641\u062A\u062D","}":"\u062D\u0627\u0635\u0631\u0629 \u0625\u063A\u0644\u0627\u0642","=":"\u064A\u0633\u0627\u0648\u064A",";":"\u0641\u0627\u0635\u0644\u0629 \u0645\u0646\u0642\u0648\u0637\u0629","\"":"\u062A\u0646\u0635\u064A\u0635","+":"\u062C\u0645\u0639","[":"\u0642\u0627\u0626\u0645\u0629 \u0641\u062A\u062D","]":"\u0642\u0627\u0626\u0645\u0629 \u0625\u063A\u0644\u0627\u0642"};
  const SYM_FR={"(":"parenth\u00e8se (",")":"parenth\u00e8se )","{":"accolade {","}":"accolade }","=":"\u00e9gal",";":"point-virgule","\"":"guillemets","+":"plus","[":"crochet [","]":"crochet ]"};
  const SYM_EN={"(":"open (",")":"close )","{":"brace {","}":"brace }","=":"equals",";":"semicolon","\"":"quotes","+":"plus","[":"bracket [","]":"bracket ]"};
  const bbLang=()=>{const u=(typeof currentUILang==="string"&&currentUILang)||rd("baydaUILang","ar");return u==="fr"?"fr":u==="ar"?"ar":"en";};
  const kwLabel=c=>{const l=bbLang();const m=l==="fr"?LBL_FR:l==="ar"?LBL_AR:LBL_EN;return m[c]||LBL_EN[c]||c;};
  const symLabel=s=>{const l=bbLang();const m=l==="fr"?SYM_FR:l==="ar"?SYM_AR:SYM_EN;return m[s]||s;};
  const CORE_KW=["print","if","else","true","false","while","for","let","fn","return","input"];
  function bbPool(){
    const E=window.BaydaEngine,d=E&&E.getDialect?E.getDialect():null,seen=new Set();
    const out=SYM.map(s=>{seen.add(s);return{t:s,h:symLabel(s)};});
    if(d&&d.keywords){
      const ks=Object.keys(d.keywords).filter(w=>w.length<=8&&!seen.has(w));
      ks.sort((a,b)=>{const ia=CORE_KW.indexOf(d.keywords[a]),ib=CORE_KW.indexOf(d.keywords[b]);return(ia<0?99:ia)-(ib<0?99:ib);});
      for(const w of ks.slice(0,6)){seen.add(w);out.push({t:w,h:kwLabel(d.keywords[w])});}
    }
    if(d&&d.vocabulary){for(const w of Object.keys(d.vocabulary).filter(w=>w.length<=8&&!seen.has(w)).slice(0,4)){seen.add(w);out.push({t:w,h:String(d.vocabulary[w])});}}
    return out;
  }
  function nextTarget(){
    const p=bbPool();targetItem=p[Math.random()*p.length|0];
    const el=ov&&ov.querySelector("#bb-target");
    if(el&&targetItem)el.textContent="\uD83C\uDFAF "+targetItem.h+" ("+targetItem.t+")";
  }
  function shelf() {
    const have = list();
    ov.querySelector('.bb-shelf').innerHTML = STK.map(s => `<span class="${have.includes(s) ? 'on' : ''}">${s}</span>`).join('');
  }
  function hop() {
    const m = ov && ov.querySelector('.bb-mascot');
    if (!m || calm) return;
    m.classList.remove('kb-hop'); void m.offsetWidth; m.classList.add('kb-hop');
  }
  function sticker() {
    const have = list(), pool = STK.filter(s => !have.includes(s)), src = pool.length ? pool : STK;
    const e = src[Math.random() * src.length | 0];
    if (!have.includes(e)) { have.push(e); wr('bayda_stk', JSON.stringify(have)); }
    shelf(); arp([523, 659, 784, 1047], .18); confetti();
    const p = D.createElement('div');
    p.className = 'kst-pop';
    p.innerHTML = `<div class="kst-card"><div class="kst-emoji">${e}</div><div class="kst-txt"></div></div>`;
    p.querySelector('.kst-txt').textContent = tx('kdSticker', 'ملصق جديد!');
    B.appendChild(p);
    setTimeout(() => p.classList.add('out'), 1500); setTimeout(() => p.remove(), 1800);
  }
  function burst(x, y, n) {
    if (calm) return;
    for (let i = 0; i < n; i++) {
      const p = D.createElement('i'), a = Math.PI * 2 * i / n + Math.random() * .5, d = 40 + Math.random() * 50;
      p.className = 'bb-p';
      p.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;background:${COL[i % COL.length][0]}`;
      ov.appendChild(p); setTimeout(() => p.remove(), 600);
    }
  }
  function fly(x, y, txt) {
    if (calm) return;
    const f = D.createElement('div');
    f.className = 'ks-fly'; f.textContent = txt; f.style.left = x + 'px'; f.style.top = y + 'px'; f.style.zIndex = 1460;
    B.appendChild(f); setTimeout(() => f.remove(), 900);
  }

  function pop(b, mega) {
    if (b._p) return;
    b._p = 1; clearTimeout(b._t);
    const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const gold = b.classList.contains("gold"), now = Date.now();
    const hit = Boolean(targetItem && b.dataset.tok === targetItem.t);
    const ok = gold || hit;
    combo = ok && now - last < 1600 ? Math.min(combo + 1, 8) : 0; if (ok) last = now;
    const gain = gold ? 5 : hit ? (mega ? 5 : 3) : 0;
    if (gain > 0) {
      total += gain; pops++; wr("bayda_bb_total", total);
      const n = ov.querySelector("#bb-n"), sc = n.parentNode;
      n.textContent = total; sc.classList.remove("bump"); void sc.offsetWidth; sc.classList.add("bump");
      if (gold) arp([659, 784, 988, 1319]);
      else if (mega) { tone(180, 80, .3, "triangle", .25); tone(500, 1000, .15, "square", .07, .05); }
      else arp([523, 659, 784]);
      if (navigator.vibrate) navigator.vibrate(mega || gold ? [20, 30, 20] : 14);
      burst(x, y, mega || gold ? 14 : 9); fly(x, y, gold ? "\uD83C\uDF1F +5" : "\uD83C\uDFAF +" + gain + " \u2B50");
      if (hit) nextTarget();
      hop(); document.dispatchEvent(new CustomEvent("kid:stars", { detail: { n: gain } }));
      if (combo === 4) confetti();
      if (pops % 10 === 0) setTimeout(sticker, 280);
    } else {
      tone(220, 160, .14, "sine", .12);
      fly(x, y, targetItem ? "\uD83C\uDFAF " + targetItem.t : "\uD83D\uDD01");
    }
    b.style.translate = getComputedStyle(b).translate;
    b.classList.remove("hold"); b.classList.add("pop");
    setTimeout(() => b.remove(), 260);
  }

  function spawn() {
    const f = ov.querySelector(".bb-field");
    if (f.children.length >= 7) return;
    const gold = Math.random() < .08, s = gold ? 84 : 56 + Math.random() * 34, c = gold ? ["#fde047", "#f59e0b"] : COL[Math.random() * COL.length | 0];
    const b = D.createElement("button");
    b.className = "bb" + (gold ? " gold" : ""); b.type = "button";
    const pool = bbPool(), needT = targetItem && ![...f.children].some(ch => ch.dataset.tok === targetItem.t);
    const pick = gold ? null : (needT || Math.random() < .42 ? targetItem : pool[Math.random() * pool.length | 0]);
    b.textContent = gold ? "\u2605" : (pick ? pick.t : SYM[0]);
    if (pick) b.dataset.tok = pick.t;
    b.setAttribute("aria-label", gold ? tx("kdBubbleGold", "\u0641\u0642\u0627\u0639\u0629 \u0630\u0647\u0628\u064A\u0629") : tx("kdBubble", "\u0641\u0642\u0627\u0639\u0629"));
    b.style.cssText = `--s:${s}px;--c1:${c[0]};--c2:${c[1]};--d:${(12 - (s - 56) / 8).toFixed(1)}s;--y:${15 + Math.random() * 55}%;left:calc(${8 + Math.random() * 84}% - ${s / 2}px)`;
    b.addEventListener("pointerdown", () => { b.classList.add("hold"); b._t = setTimeout(() => { b._m = 1; pop(b, true); }, 520); });
    const cancel = () => { clearTimeout(b._t); b.classList.remove("hold"); };
    b.addEventListener("pointerup", cancel); b.addEventListener("pointercancel", cancel); b.addEventListener("pointerleave", cancel);
    b.addEventListener("click", () => { if (!b._m) pop(b, false); });
    if (calm) setTimeout(() => b.remove(), 9000);
    else b.addEventListener("animationend", e => { if (e.animationName === "bbRise") b.remove(); });
    f.appendChild(b);
  }

  function close() {
    clearInterval(tick); D.removeEventListener('keydown', onKey); D.removeEventListener("bayda:dialect_changed", onDial);
    if (ov) ov.remove(); ov = null;
    const o = D.getElementById('bb-open'); if (o) o.focus();
  }
  const onKey = e => { if (e.key === 'Escape') close(); };
  const onDial = () => { if (ov) nextTarget(); };

  function open() {
    if (ov) return;
    calm = calmNow(); combo = 0; pops = 0; last = Date.now();
    ov = D.createElement('div');
    ov.className = 'bb-ov' + (calm ? ' calm' : '');
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', tx('kdBubbleGame', 'لعبة الفقاعات'));
    ov.innerHTML = `<div class="bb-top"><button class="bb-x" aria-label="${tx('uxClose', 'إغلاق')}">✕</button><div class="bb-score">⭐ <b id="bb-n">${total}</b></div><div class="bb-score" id="bb-target" style="font-size:.82rem;padding:4px 10px">🎯</div><button class="bb-snd" aria-label="${tx('kdSound', 'الصوت')}"></button></div><div class="bb-field"></div><div class="bb-shelf"></div><img class="bb-mascot" src="assets/mascot.webp" alt="">`;
    B.appendChild(ov);
    const snd = ov.querySelector('.bb-snd');
    snd.textContent = muted ? '🔇' : '🔊';
    snd.onclick = () => { muted = !muted; wr('bayda_bb_mute', muted ? '1' : '0'); snd.textContent = muted ? '🔇' : '🔊'; tone(500, 900, .1); };
    ov.querySelector('.bb-x').onclick = close;
    D.addEventListener('keydown', onKey); D.addEventListener('bayda:dialect_changed', onDial);
    shelf(); nextTarget(); spawn(); spawn();
    tick = setInterval(() => {
      spawn();
      if (Date.now() - last > 6000) {
        const b = ov.querySelector('.bb:not(.hint)');
        if (b) { b.classList.add('hint'); hop(); }
      }
    }, 950);
    ov.querySelector('.bb-x').focus();
  }

  const host = D.getElementById('kid-theme-controls');
  if (host && !D.getElementById('bb-open')) {
    const o = D.createElement('button');
    o.id = 'bb-open'; o.className = 'icon-btn'; o.title = tx('kdBubbles', 'فقاعات'); o.setAttribute('aria-label', tx('kdBubbleGame', 'لعبة الفقاعات')); o.textContent = "\uD83E\uDEE7";
    o.onclick = open; host.appendChild(o);
  }
})();
