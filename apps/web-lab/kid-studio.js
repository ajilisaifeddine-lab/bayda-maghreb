/* SPDX-License-Identifier: AGPL-3.0-or-later */
"use strict";
(function () {
  var LS_AGE = "baydaKidAgeOverride";
  var LS_LOCK = "baydaKidParentLock";
  var LS_SOLVED = "baydaKidSolved";
  var el = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  };
  var uiLang = function () {
    return (typeof currentUILang === "string" && currentUILang) || localStorage.getItem("baydaUILang") || "ar";
  };
  var getStars = function () {
    var n = parseInt(localStorage.getItem("baydaKidStars") || "0", 10);
    return isNaN(n) ? 0 : n;
  };
  var awardStars = function (n, node) {
    if (typeof window.kAddStar === "function") { window.kAddStar(n, node); return; }
    var tot = getStars() + n;
    localStorage.setItem("baydaKidStars", String(tot));
  };
  var confetti = function (n) {
    if (typeof window.kConfetti === "function") window.kConfetti(n || 24);
  };
  var cueTimer = null;
  function showCue(msg, kind) {
    if (document.body.getAttribute("data-visual-cues") !== "on") return;
    state.visualCue = { text: msg, kind: kind || "info" };
    if (navigator.vibrate && document.body.getAttribute("data-reduce-motion") !== "on") {
      try { navigator.vibrate(kind === "err" ? [40, 30, 40] : 18); } catch (e) {}
    }
    clearTimeout(cueTimer);
    cueTimer = setTimeout(function () { state.visualCue = null; var b = el("ks-cue-bar"); if (b) b.remove(); }, 2200);
  }
  var sfx = function (k) {
    if (typeof beep === "function") beep(k);
    if (k === "ok") showCue("🔔 ✨", "ok");
    else if (k === "err") showCue("⚠️ 💥", "err");
  };

  var state = {
    tab: "blocks",
    ageChoice: localStorage.getItem(LS_AGE) || "auto",
    parentLock: localStorage.getItem(LS_LOCK) === "1",
    missionIdx: 0,
    blocks: [],
    tierPopOpen: false,
    editingBlockId: "",
    dialectId: "",
    runningStep: -1,
    timer: null,
    outputs: [],
    awaitingPrompt: null,
    inputs: [],
    heroPos: 0,
    heroMotion: "",
    speech: "",
    robotIdx: 0,
    robotQueue: [],
    robotStepIdx: -1,
    robotMsg: "",
    robotTimer: null,
    lessonIdx: 0,
    lessonChosen: [],
    lessonMsg: null,
    memState: {},
    orderState: {},
    gameStatus: {},
    solved: {}
  };
  try { state.solved = JSON.parse(localStorage.getItem(LS_SOLVED) || "{}") || {}; } catch (e) {}

  function markSolved(id, stars, node) {
    if (!state.solved[id]) {
      state.solved[id] = true;
      localStorage.setItem(LS_SOLVED, JSON.stringify(state.solved));
      awardStars(stars || 2, node);
    } else {
      awardStars(1, node);
    }
    confetti(26);
    sfx("ok");
  }

  function getDialectState() {
    var E = window.BaydaEngine;
    return E && E.getDialect ? E.getDialect() : { id: "dz-latn", source: "example", keywords: {}, vocabulary: {} };
  }

  function getTier() {
    var K = window.BaydaKidEngine;
    return K ? K.resolveKidTier(getStars(), state.ageChoice) : { band: "4-5", levelNumber: 1, stars: 0, progressPercent: 0, optionCount: 2 };
  }

  function ensureBlocks(forceStarter) {
    var K = window.BaydaKidEngine;
    if (!K) return;
    var ds = getDialectState();
    var tier = getTier();
    var key = "baydaKidBlocks_" + (ds.id || "kid") + "_" + tier.band;
    if (!forceStarter && state.blocks.length && state.dialectId === (ds.id + ":" + tier.band)) return;
    state.dialectId = ds.id + ":" + tier.band;
    if (!forceStarter) {
      try {
        var saved = JSON.parse(localStorage.getItem(key) || "null");
        if (Array.isArray(saved) && saved.length) { state.blocks = saved; return; }
      } catch (e) {}
    }
    state.blocks = K.buildKidStarterBlocks(tier.band, ds, uiLang());
    saveBlocks();
  }

  function saveBlocks() {
    var ds = getDialectState(), tier = getTier();
    try { localStorage.setItem("baydaKidBlocks_" + (ds.id || "kid") + "_" + tier.band, JSON.stringify(state.blocks)); } catch (e) {}
  }

  function uid() { return "b" + Math.random().toString(36).slice(2, 8); }

  function kindMeta(kind) {
    var map = {
      say: ["💬", tx("ksBlkSay", "تكلّم")],
      move: ["🚶", tx("ksBlkMove", "تحرّك")],
      jump: ["🐸", tx("ksBlkJump", "اقفز")],
      turn: ["🔄", tx("ksBlkTurn", "استدر")],
      gate: ["🚪", tx("ksBlkGate", "بوابة شرط")],
      repeat: ["🔁", tx("ksBlkRepeat", "كرّر")],
      counter: ["🔢", tx("ksBlkCounter", "عدّاد")],
      ask: ["🎤", tx("ksBlkAsk", "اسأل")],
      list: ["🧺", tx("ksBlkList", "سلة")],
      recipe: ["🪄", tx("ksBlkRecipe", "وصفة")]
    };
    return map[kind] || ["🧩", kind];
  }

  function allowedKinds(band) {
    if (band === "4-5") return ["say", "move", "jump", "turn"];
    if (band === "6-7") return ["say", "move", "jump", "turn", "gate", "repeat", "counter"];
    return ["say", "move", "jump", "turn", "gate", "repeat", "counter", "ask", "list", "recipe"];
  }

  function addBlock(kind) {
    var K = window.BaydaKidEngine, ds = getDialectState();
    var first = K ? K.getKidTilePresets(ds.vocabulary || {}, uiLang()).firstWord : "Salam!";
    var b = { id: uid(), kind: kind, payload: first };
    if (kind === "move" || kind === "jump") b.steps = 1;
    if (kind === "gate") { b.gateMode = "switch"; b.truth = true; b.elsePayload = "🌙"; b.compareTarget = 3; }
    if (kind === "repeat") { b.count = 3; b.innerActions = ["jump", "say"]; }
    if (kind === "counter") { b.startValue = 1; b.stepValue = 1; }
    if (kind === "ask") { b.payload = "👋"; }
    if (kind === "list") { b.items = ["🍎", "⭐", "🎈"]; }
    state.blocks.push(b);
    state.editingBlockId = b.id;
    saveBlocks();
    sfx("tap");
    renderAll();
  }

  function stopPlayback() {
    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
    state.runningStep = -1;
  }

  function runStory(stepOnly) {
    var K = window.BaydaKidEngine, E = window.BaydaEngine;
    if (!K || !E) return;
    stopPlayback();
    var ds = getDialectState();
    var code = K.buildCodeFromKidBlocks(state.blocks, ds.keywords);
    var res = E.executeCode(code, { inputs: state.inputs });
    if (res.awaitingPrompt !== undefined) {
      state.awaitingPrompt = res.awaitingPrompt;
      state.outputs = res.outputs || [];
      renderAll();
      return;
    }
    state.awaitingPrompt = null;
    state.outputs = res.outputs || [];
    var trace = K.buildKidVisualTrace(state.blocks);
    var missions = K.getStoryMissionsForBand(getTier().band);
    var m = missions[state.missionIdx % missions.length];
    if (m && K.evaluateStoryMission(m, state.blocks, res.outputs || [])) {
      markSolved("m_" + m.id, 2);
    }
    if (!trace.length) { state.speech = state.outputs[0] || ""; renderAll(); return; }
    var idx = 0;
    state.heroPos = 0;
    function tick() {
      if (idx >= trace.length) { state.runningStep = -1; state.heroMotion = ""; renderAll(); return; }
      var tr = trace[idx];
      state.runningStep = idx;
      if (tr.moveDelta) state.heroPos = (state.heroPos + tr.moveDelta + 5) % 5;
      state.heroMotion = tr.jump ? "hop" : tr.turn ? "spin" : "";
      state.speech = state.outputs[idx] || tr.output || "";
      sfx(tr.jump ? "open" : "tap");
      renderAll();
      idx++;
      if (!stepOnly) state.timer = setTimeout(tick, 580);
    }
    tick();
  }

  function blockPreview(b) {
    if (b.kind === "say" || b.kind === "ask" || b.kind === "recipe") return b.payload || "";
    if (b.kind === "move" || b.kind === "jump") return "×" + (b.steps || 1);
    if (b.kind === "gate") return (b.truth !== false ? "✅" : "❌") + " " + (b.payload || "");
    if (b.kind === "repeat") return "×" + (b.count || 2);
    if (b.kind === "counter") return String(b.startValue || 1) + "+" + (b.stepValue || 1);
    if (b.kind === "list") return (b.items || []).join(" ");
    return "";
  }

  function renderBlockCard(b, idx, tiles, trace) {
    var meta = kindMeta(b.kind);
    var active = state.runningStep >= 0 && trace[state.runningStep] && trace[state.runningStep].blockId === b.id;
    var open = state.editingBlockId === b.id;
    var body = "";
    if (open) {
      if (b.kind === "say" || b.kind === "ask" || b.kind === "recipe") {
        var picks = tiles.slice(0, 6).map(function (t) {
          var on = b.payload === t.value ? " on" : "";
          return '<button type="button" class="ks-chip-pick' + on + '" data-act="set-pay" data-i="' + idx + '" data-v="' + esc(t.value) + '">' + esc(t.value) + "</button>";
        }).join("");
        body = picks + '<input class="ks-inline-input" data-act="edit-pay" data-i="' + idx + '" value="' + esc(b.payload) + '">';
      } else if (b.kind === "move" || b.kind === "jump") {
        body = '<button type="button" class="kid-plastic-btn ks-mini-btn" data-act="step-dec" data-i="' + idx + '">-</button><b>×' + (b.steps || 1) + '</b><button type="button" class="kid-plastic-btn ks-mini-btn" data-act="step-inc" data-i="' + idx + '">+</button>';
      } else if (b.kind === "gate") {
        body = '<button type="button" class="kid-plastic-btn ks-mini-btn ' + (b.truth !== false ? "kid-plastic-btn-emerald" : "kid-plastic-btn-primary") + '" data-act="gate-tog" data-i="' + idx + '">' +
          (b.truth !== false ? tx("ksGateYes", "مفتوح ✅") : tx("ksGateNo", "مغلق ❌")) + "</button>" +
          '<span>' + tx("ksGateIfYes", "إذا نعم") + ':</span><input class="ks-inline-input" data-act="edit-pay" data-i="' + idx + '" value="' + esc(b.payload) + '">' +
          '<span>' + tx("ksGateIfNo", "وإلا") + ':</span><input class="ks-inline-input" data-act="edit-else" data-i="' + idx + '" value="' + esc(b.elsePayload || "🌙") + '">';
      } else if (b.kind === "repeat") {
        var acts = (b.innerActions || ["jump"]).map(function (a) { return kindMeta(a)[0]; }).join(" + ");
        body = '<button type="button" class="kid-plastic-btn ks-mini-btn" data-act="rep-dec" data-i="' + idx + '">-</button><b>×' + (b.count || 2) + '</b><button type="button" class="kid-plastic-btn ks-mini-btn" data-act="rep-inc" data-i="' + idx + '">+</button><button type="button" class="ks-chip-pick on" data-act="rep-act" data-i="' + idx + '">' + acts + '</button>';
      } else if (b.kind === "counter") {
        body = '<span>🔢 ' + (b.startValue || 1) + ' + ' + (b.stepValue || 1) + '</span>';
      } else if (b.kind === "list") {
        body = '<input class="ks-inline-input" data-act="edit-list" data-i="' + idx + '" value="' + esc((b.items || []).join(", ")) + '">';
      }
    }
    var prev = blockPreview(b);
    return '<div class="ks-block-card' + (active ? " is-running" : "") + '" data-kind="' + esc(b.kind) + '">' +
      '<div class="ks-block-head">' +
      '  <div class="ks-block-title" data-act="tog-blk" data-id="' + esc(b.id) + '"><span class="ks-step-num">' + (idx + 1) + '</span><span>' + meta[0] + " " + esc(meta[1]) + '</span>' + (prev ? '<span class="ks-block-preview">' + esc(prev) + '</span>' : "") + '</div>' +
      '  <div class="ks-block-tools">' +
      (b.kind !== "turn" ? '    <button type="button" class="kid-plastic-btn ks-mini-btn" data-act="tog-blk" data-id="' + esc(b.id) + '">' + (open ? "▴" : "✏️") + '</button>' : "") +
      '    <button type="button" class="kid-plastic-btn ks-mini-btn" data-act="mv-up" data-i="' + idx + '"' + (idx === 0 ? " disabled" : "") + '>⬆️</button>' +
      '    <button type="button" class="kid-plastic-btn ks-mini-btn" data-act="mv-dn" data-i="' + idx + '"' + (idx === state.blocks.length - 1 ? " disabled" : "") + '>⬇️</button>' +
      '    <button type="button" class="kid-plastic-btn kid-plastic-btn-primary ks-mini-btn" data-act="del" data-i="' + idx + '">🗑️</button>' +
      '  </div>' +
      '</div>' +
      (body ? '<div class="ks-block-body">' + body + '</div>' : "") +
    '</div>';
  }

  function renderBlocksView(tier, ds) {
    var K = window.BaydaKidEngine;
    ensureBlocks(false);
    var presets = K ? K.getKidTilePresets(ds.vocabulary, uiLang()) : { tiles: [] };
    var trace = K ? K.buildKidVisualTrace(state.blocks) : [];
    var missions = K ? K.getStoryMissionsForBand(tier.band) : [];
    var m = missions[state.missionIdx % Math.max(1, missions.length)];
    var mDone = m && K && K.evaluateStoryMission(m, state.blocks, state.outputs);
    var paletteHtml = allowedKinds(tier.band).map(function (k) {
      var mta = kindMeta(k);
      return '<button type="button" class="kid-plastic-btn kid-plastic-btn-cyan ks-tile-add" data-act="add-blk" data-kind="' + k + '">' + mta[0] + " " + esc(mta[1]) + '</button>';
    }).join("");
    var seqHtml = state.blocks.length
      ? state.blocks.map(function (b, i) { return renderBlockCard(b, i, presets.tiles, trace); }).join("")
      : '<div style="text-align:center;padding:16px;color:#64748b;font-weight:800">' + esc(tx("ksEmptySeq", "اضغط على أي بلاطة بالأعلى لبناء قصتك!")) + '</div>';
    var stones = [0, 1, 2, 3, 4].map(function (i) {
      var isHere = state.heroPos === i;
      return '<div class="ks-stone' + (isHere ? " active" : "") + '">' +
        (isHere ? '<img src="assets/mascot.webp" alt="" class="ks-hero-sprite ' + esc(state.heroMotion) + '">' : String(i + 1)) +
      '</div>';
    }).join("");
    var outHtml = state.outputs.map(function (o) { return '<span class="ks-out-card">' + esc(o) + '</span>'; }).join("");
    var promptHtml = state.awaitingPrompt !== null
      ? '<div class="kid-plastic-panel" style="padding:8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap">' +
        '<b>🎤 ' + esc(state.awaitingPrompt || tx("ksPromptHint", "أجب عن السؤال لمتابعة القصة:")) + '</b>' +
        '<input id="ks-prompt-in" class="ks-inline-input" type="text">' +
        '<button type="button" class="kid-plastic-btn kid-plastic-btn-emerald ks-mini-btn" data-act="send-prompt">' + esc(tx("ksSend", "إرسال")) + '</button></div>'
      : "";
    var codePeek = (tier.band === "8-9" && K)
      ? '<details class="ks-peek-code"><summary style="cursor:pointer;font-weight:800;font-size:.82rem">' + esc(tx("ksPeekCode", "👁️ كود اللهجة (اختياري)")) + '</summary><pre>' + esc(K.buildCodeFromKidBlocks(state.blocks, ds.keywords)) + '</pre></details>'
      : "";
    var missionPill = m
      ? '<button type="button" class="ks-mission-pill' + (mDone ? " done" : "") + '" data-act="next-mission">' +
        '<span>' + (mDone ? "✅" : m.emoji) + '</span><span>' + esc(tx(m.titleKey, m.id)) + '</span><span>↻</span></button>'
      : "";
    return '<div class="ks-studio-grid">' +
      '  <div class="kid-plastic-window ks-section-box">' +
      '    <div class="ks-stage-head">' +
      '      <b style="font-size:.9rem">🧩 ' + esc(tx("ksAddBlocks", "أضف بلاطة")) + '</b>' +
      '      <div style="display:flex;gap:5px">' +
      '        <button type="button" class="kid-plastic-btn kid-plastic-btn-amber ks-mini-btn" data-act="load-starter" title="' + esc(tx("ksStarter", "قالب")) + '">✨</button>' +
      '        <button type="button" class="kid-plastic-btn ks-mini-btn" data-act="clear-blks" title="' + esc(tx("ksClear", "مسح")) + '">🧹</button>' +
      '      </div>' +
      '    </div>' +
      '    <div class="ks-palette">' + paletteHtml + '</div>' +
      '    <div class="kid-plastic-well ks-seq-list">' + seqHtml + '</div>' +
      codePeek +
      '  </div>' +
      '  <div class="kid-plastic-window ks-section-box ks-stage-card">' +
      '    <div class="ks-stage-head">' +
      (missionPill || '<b>🎭 ' + esc(tx("ksStageTitle", "مسرح التنفيذ الحي")) + '</b>') +
      '      <div style="display:flex;gap:5px">' +
      '        <button type="button" class="kid-plastic-btn kid-plastic-btn-emerald" data-act="play-story">' + esc(tx("ksPlay", "▶ شغّل")) + '</button>' +
      '        <button type="button" class="kid-plastic-btn kid-plastic-btn-blue ks-mini-btn" data-act="step-story" title="' + esc(tx("ksStep", "⏭ خطوة")) + '">⏭</button>' +
      '        <button type="button" class="kid-plastic-btn ks-mini-btn" data-act="reset-story" title="' + esc(tx("ksReset", "↺ إعادة")) + '">↺</button>' +
      '        <button type="button" class="kid-plastic-btn kid-plastic-btn-violet ks-mini-btn" data-act="speak-out" title="' + esc(tx("ksSpeak", "🗣️ انطق")) + '">🗣️</button>' +
      '      </div>' +
      '    </div>' +
      '    <div class="ks-theater-stage">' +
      '      <div class="ks-stage-sky">' +
      (state.speech ? '<div class="ks-speech-bubble">' + esc(state.speech) + '</div>' : '<span></span>') +
      '        <span style="font-size:1.3rem">✨</span>' +
      '      </div>' +
      '      <div class="ks-stones">' + stones + '</div>' +
      '    </div>' +
      promptHtml +
      (outHtml ? '<div class="ks-output-cards">' + outHtml + '</div>' : "") +
      '  </div>' +
      '</div>';
  }

  function renderRobotView(tier) {
    var K = window.BaydaKidEngine;
    if (!K) return "";
    var missions = K.getRobotMissionsForBand(tier.band);
    var m = missions[state.robotIdx % missions.length];
    var sim = K.simulateRobotRun(state.robotQueue, m);
    var step = state.robotStepIdx >= 0 && sim.trace[state.robotStepIdx]
      ? sim.trace[state.robotStepIdx]
      : { x: m.start.x, y: m.start.y, dir: m.startDir };
    var trailSet = {};
    for (var ti = 0; ti <= state.robotStepIdx && ti < sim.trace.length; ti++) {
      trailSet[sim.trace[ti].x + "," + sim.trace[ti].y] = true;
    }
    var arrows = ["⬆️", "➡️", "⬇️", "⬅️"];
    var cells = "";
    for (var y = 0; y < m.size; y++) {
      for (var x = 0; x < m.size; x++) {
        var key = x + "," + y;
        var isBot = step.x === x && step.y === y;
        var isRock = m.rocks.some(function (r) { return r.x === x && r.y === y; });
        var isStar = m.stars.some(function (s) { return s.x === x && s.y === y; });
        var cls = "ks-cell" + (isBot ? " bot" : isRock ? " rock" : isStar ? " goal" : trailSet[key] ? " trail" : "");
        var sym = isBot ? "🤖" + arrows[step.dir] : isRock ? "🪨" : isStar ? "⭐" : trailSet[key] ? "•" : "";
        cells += '<div class="' + cls + '">' + sym + '</div>';
      }
    }
    var btns = tier.band === "4-5"
      ? [["up", "⬆️"], ["down", "⬇️"], ["dir_right", "➡️"], ["dir_left", "⬅️"]]
      : [["forward", "⬆️"], ["right", "↪️"], ["left", "↩️"], ["collect", "⭐"]];
    var cmdHtml = btns.map(function (p) {
      return '<button type="button" class="kid-plastic-btn kid-plastic-btn-blue" data-act="rob-add" data-cmd="' + p[0] + '">' + p[1] + '</button>';
    }).join("");
    var qHtml = state.robotQueue.map(function (c, i) {
      var lbl = { up: "⬆️", down: "⬇️", dir_right: "➡️", dir_left: "⬅️", forward: "⬆️", right: "↪️", left: "↩️", collect: "⭐" }[c] || c;
      return '<button type="button" class="kid-plastic-btn ks-mini-btn" data-act="rob-del" data-i="' + i + '">' + lbl + '</button>';
    }).join("");
    var mTabs = missions.map(function (mm, idx) {
      return '<button type="button" class="kid-plastic-btn ks-mini-btn ' + (idx === state.robotIdx % missions.length ? "kid-plastic-btn-amber" : "") + '" data-act="rob-m" data-i="' + idx + '">#' + (idx + 1) + '</button>';
    }).join("");
    return '<div class="kid-plastic-window ks-section-box">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
      '  <b>🤖 ' + esc(tx("ksRobGoal", "ساعد الروبوت ليجمع النجوم ويتجنب الصخور")) + ' — ' + esc(tier.band === "4-5" && m.titleHintDirect ? m.titleHintDirect : m.titleHint) + '</b>' +
      '  <div style="display:flex;gap:6px">' + mTabs + '</div>' +
      '</div>' +
      '<div class="ks-robot-layout">' +
      '  <div class="kid-plastic-well ks-robot-board">' + cells + '</div>' +
      '  <div style="display:flex;flex-direction:column;gap:10px">' +
      '    <div class="ks-game-choices">' + cmdHtml + '</div>' +
      '    <b>' + esc(tx("ksRobQueue", "الأوامر")) + ':</b>' +
      '    <div class="kid-plastic-well ks-queue">' + qHtml + '</div>' +
      '    <div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '      <button type="button" class="kid-plastic-btn kid-plastic-btn-emerald" data-act="rob-run">' + esc(tx("ksPlay", "▶ شغّل")) + '</button>' +
      '      <button type="button" class="kid-plastic-btn" data-act="rob-clr">' + esc(tx("ksClear", "مسح")) + '</button>' +
      '    </div>' +
      (state.robotMsg ? '<div class="kid-plastic-panel" style="padding:10px;font-weight:900">' + esc(state.robotMsg) + '</div>' : "") +
      '  </div>' +
      '</div>' +
    '</div>';
  }

  function gameMsgBox(gid) {
    var m = state.gameStatus[gid];
    return m ? '<div style="font-weight:900;color:' + (m.ok ? "#059669" : "#e11d48") + '">' + esc(m.text) + '</div>' : "";
  }

  function renderGamesView(tier, ds) {
    var K = window.BaydaKidEngine;
    if (!K) return "";
    var g = K.buildMiniGamesForBand(tier.band, ds);
    var cards = [];
    if (g.soundMatch) {
      var sm = g.soundMatch[((state.gameIdx && state.gameIdx["sm"]) || 0) % g.soundMatch.length];
      cards.push('<div class="kid-plastic-window ks-game-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><b>' + esc(tx("ksGameSound", "🎵 طابق الكلمة")) + ': <span style="color:#0284c7">' + esc(sm.word) + '</span></b><button type="button" class="kid-plastic-btn ks-mini-btn" data-act="g-next" data-gid="sm">\u21BB</button></div>' +
        '<div class="ks-game-choices">' + sm.options.map(function (o) {
          return '<button type="button" class="kid-plastic-btn kid-plastic-btn-amber" data-act="g-pick" data-gid="sm" data-ok="' + (o.emoji.trim() === sm.emoji ? "1" : "0") + '">' + o.emoji + ' ' + esc(({ print: tx("ksConcept_print", "اطبع"), if: tx("ksConcept_if", "إذا"), true: tx("ksConcept_true", "صحيح"), false: tx("ksConcept_false", "خطأ"), hello: tx("ksConcept_hello", "مرحباً") }[o.conceptKey] || o.conceptKey)) + '</button>';
        }).join("") + '</div>' + gameMsgBox("sm") + '</div>');
    }
    if (g.patternTrail) {
      var pt = g.patternTrail[((state.gameIdx && state.gameIdx["pt"]) || 0) % g.patternTrail.length];
      cards.push('<div class="kid-plastic-window ks-game-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><b>' + esc(tx("ksGamePattern", "🧩 أكمل النمط")) + '</b><button type="button" class="kid-plastic-btn ks-mini-btn" data-act="g-next" data-gid="pt">\u21BB</button></div>' +
        '<div class="kid-plastic-well" style="padding:10px;display:flex;gap:10px;justify-content:center;font-size:1.5rem">' +
        pt.seq.map(function (x) { return '<span>' + (x || "❓") + '</span>'; }).join(" ➜ ") + '</div>' +
        '<div class="ks-game-choices">' + pt.options.map(function (o) {
          return '<button type="button" class="kid-plastic-btn kid-plastic-btn-teal" data-act="g-pick" data-gid="pt" data-ok="' + (o.emoji === pt.correct ? "1" : "0") + '">' + o.emoji + ' ' + esc(o.label) + '</button>';
        }).join("") + '</div>' + gameMsgBox("pt") + '</div>');
    }
    if (g.memoryPairs) {
      var mm = g.memoryPairs[((state.gameIdx && state.gameIdx["mm"]) || 0) % g.memoryPairs.length];
      var ms = state.memState[mm.id] || { open: [], matched: [] };
      cards.push('<div class="kid-plastic-window ks-game-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><b>' + esc(tx("ksGameMemory", "🃏 لعبة الذاكرة")) + '</b><button type="button" class="kid-plastic-btn ks-mini-btn" data-act="g-next" data-gid="mm">\u21BB</button></div>' +
        '<div class="ks-mem-grid">' + mm.cards.map(function (c) {
          var show = ms.open.indexOf(c.id) >= 0 || ms.matched.indexOf(c.pair) >= 0;
          return '<button type="button" class="kid-plastic-btn ks-mem-card ' + (ms.matched.indexOf(c.pair) >= 0 ? "kid-plastic-btn-emerald" : "kid-plastic-btn-violet") + '" data-act="mem-flip" data-mid="' + mm.id + '" data-cid="' + c.id + '" data-pair="' + c.pair + '">' +
            (show ? esc(c.disp) : "❔") + '</button>';
        }).join("") + '</div>' + gameMsgBox(mm.id) + '</div>');
    }
    if (g.storyBlocks) {
      var sb = g.storyBlocks[((state.gameIdx && state.gameIdx["sb"]) || 0) % g.storyBlocks.length];
      var ord = state.orderState[sb.id] || [];
      cards.push('<div class="kid-plastic-window ks-game-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><b>' + esc(tx("ksGameStory", "🧱 رتّب القصة")) + ': ' + esc(sb.hint) + '</b><button type="button" class="kid-plastic-btn ks-mini-btn" data-act="g-next" data-gid="sb">\u21BB</button></div>' +
        '<div class="kid-plastic-well ks-tiles-tray">' + ord.map(function (id) {
          var blk = sb.blocks.find(function (x) { return x.id === id; });
          return blk ? '<span class="ks-chip-pick on">' + esc(blk.label) + '</span>' : "";
        }).join("") + '</div>' +
        '<div class="ks-game-choices">' + sb.blocks.map(function (b) {
          return '<button type="button" class="kid-plastic-btn kid-plastic-btn-blue" data-act="ord-add" data-oid="' + sb.id + '" data-bid="' + b.id + '">' + esc(b.label) + '</button>';
        }).join("") + '</div>' +
        '<div style="display:flex;gap:8px"><button type="button" class="kid-plastic-btn kid-plastic-btn-emerald" data-act="ord-chk" data-oid="' + sb.id + '" data-ans="' + esc(sb.order.join(",")) + '">' + esc(tx("ksTryPass", "✅ تحقّق")) + '</button>' +
        '<button type="button" class="kid-plastic-btn" data-act="ord-clr" data-oid="' + sb.id + '">' + esc(tx("ksClear", "مسح")) + '</button></div>' + gameMsgBox(sb.id) + '</div>');
    }
    if (g.wordDetective) {
      var wd = g.wordDetective[((state.gameIdx && state.gameIdx["wd"]) || 0) % g.wordDetective.length];
      cards.push('<div class="kid-plastic-window ks-game-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><b>' + esc(tx("ksGameOdd", "🔎 صائد الدخيل")) + '</b><button type="button" class="kid-plastic-btn ks-mini-btn" data-act="g-next" data-gid="wd">\u21BB</button></div>' +
        '<div class="ks-game-choices">' + wd.cards.map(function (c) {
          return '<button type="button" class="kid-plastic-btn kid-plastic-btn-cyan" data-act="g-pick" data-gid="wd" data-ok="' + (c.odd ? "1" : "0") + '">' + c.emoji + ' ' + esc(c.word) + '</button>';
        }).join("") + '</div>' + gameMsgBox("wd") + '</div>');
    }
    if (g.bridgeBuilder) {
      var br = g.bridgeBuilder[((state.gameIdx && state.gameIdx["br"]) || 0) % g.bridgeBuilder.length];
      var bord = state.orderState[br.id] || [];
      cards.push('<div class="kid-plastic-window ks-game-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><b>' + esc(tx("ksGameBridge", "🌉 ابنِ الجسر")) + ': ' + esc(br.goal) + '</b><button type="button" class="kid-plastic-btn ks-mini-btn" data-act="g-next" data-gid="br">\u21BB</button></div>' +
        '<div class="kid-plastic-well ks-tiles-tray">' + bord.map(function (id) {
          var pl = br.planks.find(function (x) { return x.id === id; });
          return pl ? '<span class="ks-chip-pick on">' + esc(pl.label) + '</span>' : "";
        }).join("") + '</div>' +
        '<div class="ks-game-choices">' + br.planks.map(function (p) {
          return '<button type="button" class="kid-plastic-btn kid-plastic-btn-amber" data-act="ord-add" data-oid="' + br.id + '" data-bid="' + p.id + '">' + esc(p.label) + '</button>';
        }).join("") + '</div>' +
        '<div style="display:flex;gap:8px"><button type="button" class="kid-plastic-btn kid-plastic-btn-emerald" data-act="ord-chk" data-oid="' + br.id + '" data-ans="' + esc(br.order.join(",")) + '">' + esc(tx("ksTryPass", "✅ تحقّق")) + '</button>' +
        '<button type="button" class="kid-plastic-btn" data-act="ord-clr" data-oid="' + br.id + '">' + esc(tx("ksClear", "مسح")) + '</button></div>' + gameMsgBox(br.id) + '</div>');
    }
    if (g.loopTracer) {
      var lt = g.loopTracer[((state.gameIdx && state.gameIdx["lt"]) || 0) % g.loopTracer.length];
      cards.push('<div class="kid-plastic-window ks-game-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><b>' + esc(tx("ksGameLoop", "🔁 تتبّع الحلقة")) + '</b><button type="button" class="kid-plastic-btn ks-mini-btn" data-act="g-next" data-gid="lt">\u21BB</button></div>' +
        '<div class="kid-plastic-well" style="padding:9px;font-weight:800">' + lt.steps.map(esc).join("<br>") + '</div>' +
        '<div class="ks-game-choices">' + lt.options.map(function (o) {
          return '<button type="button" class="kid-plastic-btn kid-plastic-btn-blue" data-act="g-pick" data-gid="lt" data-ok="' + (o === lt.correct ? "1" : "0") + '">' + esc(o) + '</button>';
        }).join("") + '</div>' + gameMsgBox("lt") + '</div>');
    }
    if (g.conditionLab) {
      var cl = g.conditionLab[((state.gameIdx && state.gameIdx["cl"]) || 0) % g.conditionLab.length];
      cards.push('<div class="kid-plastic-window ks-game-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><b>' + esc(tx("ksGameCond", "🚦 معمل الشرط")) + ': ' + esc(cl.goal) + '</b><button type="button" class="kid-plastic-btn ks-mini-btn" data-act="g-next" data-gid="cl">\u21BB</button></div>' +
        '<div class="ks-game-choices">' + cl.options.map(function (o) {
          return '<button type="button" class="kid-plastic-btn kid-plastic-btn-teal" data-act="g-pick" data-gid="cl" data-ok="' + (o.ok ? "1" : "0") + '">' + esc(o.expr) + '</button>';
        }).join("") + '</div>' + gameMsgBox("cl") + '</div>');
    }
    if (g.vaultCracker) {
      var vc = g.vaultCracker[((state.gameIdx && state.gameIdx["vc"]) || 0) % g.vaultCracker.length];
      cards.push('<div class="kid-plastic-window ks-game-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><b>' + esc(tx("ksGameVault", "🔐 فك الخزنة")) + '</b><button type="button" class="kid-plastic-btn ks-mini-btn" data-act="g-next" data-gid="vc">\u21BB</button></div>' +
        '<div class="kid-plastic-well" style="padding:9px;font-weight:800">' + vc.steps.map(esc).join("<br>") + '</div>' +
        '<div class="ks-game-choices">' + [vc.answer - 2, vc.answer, vc.answer + 3].map(function (n) {
          return '<button type="button" class="kid-plastic-btn kid-plastic-btn-violet" data-act="g-pick" data-gid="vc" data-ok="' + (n === vc.answer ? "1" : "0") + '">🔑 ' + n + '</button>';
        }).join("") + '</div>' + gameMsgBox("vc") + '</div>');
    }
    cards.push('<div class="kid-plastic-window ks-game-card" style="justify-content:center;align-items:center;text-align:center">' +
      '<b>' + esc(tx("ksGameBubble", "\uD83E\uDEE7 \u0641\u0642\u0627\u0639\u0627\u062A \u0627\u0644\u0643\u0648\u062F")) + '</b>' +
      '<button type="button" class="kid-plastic-btn kid-plastic-btn-primary" data-act="open-bb">\uD83E\uDEE7 ' + esc(tx("ksPlay", "▶ شغّل")) + '</button>' +
      '</div>');
    return '<div class="ks-games-grid">' + cards.join("") + '</div>';
  }

  function renderStickersView() {
    var stars = getStars();
    var icons = ["🐪", "🦊", "🦁", "🦅", "🌴", "🏺", "🚀", "🌟", "👑", "🎁"];
    var curT = document.body.getAttribute("data-kid-theme") || "candy";
    var themes = [
      ["candy", "🍬", "kmTheme_candy"],
      ["jungle", "🌴", "kmTheme_jungle"],
      ["ocean", "🌊", "kmTheme_ocean"],
      ["space", "🚀", "kmTheme_space"],
      ["desert", "🐪", "kdDesert"]
    ];
    return '<div class="kid-plastic-window ks-section-box">' +
      '<b>🏆 ' + esc(tx("ksStickersTitle", "ألبوم ملصقات المغرب الكبير")) + ' (' + stars + ' ⭐)</b>' +
      '<div class="ks-stickers-grid">' + icons.map(function (em, idx) {
        var need = (idx + 1) * 5;
        var ok = stars >= need;
        return '<div class="ks-sticker-slot' + (ok ? " unlocked" : "") + '">' +
          '<div class="ks-sticker-emoji">' + (ok ? em : "🔒") + '</div>' +
          '<small>' + need + ' ⭐</small></div>';
      }).join("") + '</div>' +
      '<b>🎨 ' + esc(tx("ksThemesTitle", "اختر عالمك")) + '</b>' +
      '<div class="ks-game-choices">' + themes.map(function (t) {
        return '<button type="button" class="kid-plastic-btn ' + (curT === t[0] ? "kid-plastic-btn-amber" : "") + '" data-act="set-theme" data-t="' + t[0] + '">' + t[1] + ' ' + esc(tx(t[2], t[0])) + '</button>';
      }).join("") + '</div>' +
    '</div>';
  }

  function getActiveKidLessons(ds){
    var E=window.BaydaEngine,K=window.BaydaKidEngine;
    var view=E&&E.getLessonsView?E.getLessonsView("kid"):{installed:false,ready:[],locked:[]};
    if(view.installed&&view.ready.length){
      return{
        downloaded:true,
        lockedCount:view.locked.length,
        items:view.ready.map(function(l){
          return{
            id:l.id,emoji:"📘",title:l.title,goal:l.goal,isPack:true,
            tiles:(l.cards||[]).map(function(c,i){
              var f=E.fillLessonCode?E.fillLessonCode(c):{ok:false};
              var txt=f&&f.ok&&f.text?f.text:c;
              return{id:"c"+i,emoji:"🧩",label:txt,code:txt};
            })
          };
        })
      };
    }
    var list=K?K.KID_LESSONS:[];
    return{
      downloaded:false,lockedCount:0,
      items:list.map(function(l){
        var loc=K.localizeKidLesson?K.localizeKidLesson(l,ds.id):l;
        var g=tx(loc.goalKey,loc.id),sw=K.KID_STARTER_WORDS&&K.KID_STARTER_WORDS[ds.id];if(sw){if(loc.id==="kid-talk")g=g.replace(/\bsalam\b/g,sw.salam);if(loc.id==="kid-door")g=g.replace(/\b(win|sun)\b/g,sw.sun);}return{id:loc.id,emoji:loc.emoji,title:tx(loc.titleKey,loc.id),goal:g,isPack:false,raw:loc,tiles:loc.buildTiles(ds.keywords)};
      })
    };
  }
  function renderLearnStage(){
    var box=el("kid-learn-stage"),K=window.BaydaKidEngine;
    if(!box||!K)return;
    var ds=getDialectState(),data=getActiveKidLessons(ds),lessons=data.items;
    if(!lessons.length)return;
    var lesson=lessons[state.lessonIdx%lessons.length],tiles=lesson.tiles;
    var tabs=lessons.map(function(l,i){
      return '<button type="button" class="kid-plastic-btn '+(i===state.lessonIdx%lessons.length?"kid-plastic-btn-amber":"")+'" data-act="les-pick" data-i="'+i+'">'+l.emoji+" "+esc(l.title)+"</button>";
    }).join("");
    var chosenHtml=state.lessonChosen.map(function(tid,idx){
      var t=tiles.find(function(x){return x.id===tid;});
      return t?'<button type="button" class="kid-plastic-btn kid-plastic-btn-blue" data-act="les-rem" data-i="'+idx+'">'+t.emoji+" "+esc(t.label)+" ✕</button>":"";
    }).join("");
    var bankHtml=tiles.map(function(t){
      return '<button type="button" class="kid-plastic-btn kid-plastic-btn-cyan" data-act="les-add" data-tid="'+t.id+'">'+t.emoji+" "+esc(t.label)+"</button>";
    }).join("");
    var dlBanner=data.lockedCount?'<div class="kid-plastic-panel" style="padding:8px;font-size:.82rem;font-weight:700">'+esc(tx("lrnNeedDialectPack","🔒 يتطلب تنزيل حزمة اللهجة من المختبر"))+" ("+data.lockedCount+")</div>":"";
    box.innerHTML=
      '<div class="kid-plastic-window ks-section-box">'+
      '  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>📚 '+esc(tx("ksLearnHeader","دروس البطاقات البصرية — رتّب البطاقات بذكاء!"))+'</b><button type="button" class="kid-plastic-btn kid-plastic-btn-amber ks-mini-btn" data-act="go-lab">🧩</button></div>'+
      dlBanner+
      '  <div class="ks-lesson-tabs">'+tabs+"</div>"+
      '  <div class="kid-plastic-panel" style="padding:12px;font-weight:900">'+lesson.emoji+" "+esc(lesson.goal)+"</div>"+
      "  <b>"+esc(tx("ksTapTiles","اضغط على البطاقات لإضافتها بالترتيب:"))+"</b>"+
      '  <div class="kid-plastic-well ks-tiles-bank">'+bankHtml+"</div>"+
      "  <b>"+esc(tx("ksChosenTiles","مسار الحل"))+":</b>"+
      '  <div class="kid-plastic-well ks-tiles-tray">'+chosenHtml+"</div>"+
      '  <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="kid-plastic-btn kid-plastic-btn-emerald" data-act="les-run">'+esc(tx("ksTryPass","✅ تحقّق"))+'</button><button type="button" class="kid-plastic-btn" data-act="les-clr">'+esc(tx("ksClear","مسح"))+"</button></div>"+
      (state.lessonMsg?'<div class="kid-plastic-panel" style="padding:10px;font-weight:900;color:'+(state.lessonMsg.ok?"#059669":"#e11d48")+'">'+esc(state.lessonMsg.text)+"</div>":"")+
      "</div>";
  }
  function ensureMounts() {
    var hdr = document.querySelector("header");
    if (hdr && !el("ks-hdr-bar") && hdr.parentNode) {
      var hb = document.createElement("div");
      hb.id = "ks-hdr-bar";
      hb.className = "ks-hdr-bar kid-only";
      hb.innerHTML = '<button type="button" id="ks-hdr-toggle" class="ks-hdr-handle" data-act="tog-hdr">⌄</button>';
      hdr.parentNode.insertBefore(hb, hdr.nextSibling);
    }
    var lab = el("view-lab");
    if (lab && !el("kid-studio-root")) {
      var st = document.createElement("section");
      st.id = "kid-studio-root";
      st.className = "kid-only";
      lab.insertBefore(st, lab.firstChild);
    }
    var lrn = document.querySelector("#view-learn .learn-container");
    if (lrn && !el("kid-learn-stage")) {
      var l = document.createElement("section");
      l.id = "kid-learn-stage";
      l.className = "kid-only";
      lrn.appendChild(l);
    }
  }

  function renderAll() {
    if (document.body.getAttribute("data-mode") !== "kid") return;
    ensureMounts();
    var hbtn = el("ks-hdr-toggle"), ds0 = getDialectState();
    if (hbtn) {
      var isOpen = document.body.classList.contains("ks-hdr-open");
      hbtn.textContent = isOpen ? "⌃" : ("⌄ " + (ds0.id || ""));
    }
    var root = el("kid-studio-root"), K = window.BaydaKidEngine;
    if (root && K) {
      var ds = ds0, tier = getTier();
      var tierTxt = tier.band === "4-5" ? tx("ksTier1", "المستوى 1 · مستكشف صغير") : tier.band === "6-7" ? tx("ksTier2", "المستوى 2 · باني القصص") : tx("ksTier3", "المستوى 3 · صانع المنطق");
      var bands = ["auto", "4-5", "6-7", "8-9"].map(function (b) {
        var lbl = b === "auto" ? tx("ksAutoBand", "تلقائي") : b;
        return '<button type="button" class="kid-plastic-btn ks-mini-btn ks-band-btn' + (state.ageChoice === b ? " is-active" : "") + '" data-act="set-band" data-b="' + b + '">' + (b === "auto" ? "✨ " : "🎂 ") + esc(lbl) + '</button>';
      }).join("");
      var tierPop = state.tierPopOpen
        ? '<div class="kid-plastic-panel ks-tier-pop">' + bands +
          '  <button type="button" class="kid-plastic-btn ks-mini-btn ' + (state.parentLock ? "kid-plastic-btn-primary" : "") + '" data-act="tog-lock">' + (state.parentLock ? "🔒 " + esc(tx("ksLocked", "مقفل")) : "🔓 " + esc(tx("ksLockParent", "قفل الأهل"))) + '</button>' +
          '</div>'
        : "";
      var tabs = [
        ["blocks", tx("ksTabBlocks", "🧩 البلاطات"), "kid-plastic-btn-amber"],
        ["robot", tx("ksTabRobot", "🤖 الروبوت"), "kid-plastic-btn-blue"],
        ["games", tx("ksTabGames", "🎮 الألعاب"), "kid-plastic-btn-teal"],
        ["stickers", tx("ksTabStickers", "🏆 الملصقات"), "kid-plastic-btn-violet"]
      ].map(function (t) {
        var parts = String(t[1]).split(" "); var ico = parts[0]; var lbl = parts.slice(1).join(" ") || t[1];
        return '<button type="button" class="kid-plastic-btn ks-nav-tab ' + t[2] + (state.tab === t[0] ? " is-active" : "") + '" data-act="set-tab" data-tab="' + t[0] + '"><span class="ks-tab-ico">' + esc(ico) + '</span><span class="ks-tab-lbl">' + esc(lbl) + '</span></button>';
      }).join("");
      var body = state.tab === "blocks" ? renderBlocksView(tier, ds)
        : state.tab === "robot" ? renderRobotView(tier)
        : state.tab === "games" ? renderGamesView(tier, ds)
        : renderStickersView();
      root.innerHTML =
        '<div class="kid-plastic-window ks-topbar">' +
        '  <div class="ks-mascot-pill">' +
        '    <button type="button" class="ks-mascot-avatar" data-act="mascot-tap" aria-label="mascot"><img src="assets/mascot.webp" alt=""></button>' +
        '    <div style="min-width:0"><div class="ks-tier-title">' + esc(tierTxt) + '</div><div class="ks-tier-sub">⭐ ' + tier.stars + ' · ' + esc(tier.band) + '</div></div>' +
        '  </div>' +
        '  <div class="ks-top-actions">' +
        '    <button type="button" class="kid-plastic-btn ks-mini-btn kid-plastic-btn-cyan" data-act="go-learn">📚</button>' +
        '    <button type="button" class="kid-plastic-btn ks-mini-btn" data-act="tog-tier-pop">' + (state.parentLock ? "🔒 " : "") + esc(tier.band) + ' ▾</button>' +
        tierPop +
        '  </div>' +
        '</div>' +
'<div class="ks-nav-tabs">' + tabs + '</div>' +
        (state.visualCue && document.body.getAttribute("data-visual-cues") === "on" ? '<div id="ks-cue-bar" class="ks-caption-bar ' + esc(state.visualCue.kind) + '">' + esc(state.visualCue.text) + '</div>' : "") +
        body;
    }
    renderLearnStage();
  }

  function runRobot() {
    var K = window.BaydaKidEngine;
    if (!K) return;
    if (state.robotTimer) { clearTimeout(state.robotTimer); state.robotTimer = null; }
    var missions = K.getRobotMissionsForBand(getTier().band);
    var m = missions[state.robotIdx % missions.length];
    var sim = K.simulateRobotRun(state.robotQueue, m);
    state.robotMsg = "";
    var idx = 0;
    function step() {
      state.robotStepIdx = idx;
      if (idx >= sim.trace.length - 1) {
        if (sim.solved) { state.robotMsg = tx("ksRobWin", "🎉 أحسنت! جمع الروبوت كل النجوم"); showCue(state.robotMsg, "ok"); markSolved("rob_" + m.id, 3); }
        else if (sim.hitRock || sim.outOfBounds) { state.robotMsg = tx("ksRobRock", "💥 اصطدم الروبوت بصخرة! أعد المحاولة"); showCue(state.robotMsg, "err"); sfx("err"); }
        else { state.robotMsg = tx("ksRobMiss", "⭐ لم يجمع كل النجوم بعد!"); sfx("tap"); }
        renderAll();
        return;
      }
      sfx("tap");
      renderAll();
      idx++;
      state.robotTimer = setTimeout(step, 340);
    }
    step();
  }

  function speakOutputs() {
    if (!window.speechSynthesis || !state.outputs.length) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(state.outputs.join(" . "));
      u.lang = uiLang() === "ar" ? "ar-MA" : uiLang() === "fr" ? "fr-FR" : "en-US";
      window.speechSynthesis.speak(u);
      showCue("🔊 " + state.outputs.join(" · "), "ok");
    } catch (e) {}
  }

  function openMathGate(onPass) {
    var K = window.BaydaKidEngine;
    var ch = K ? K.createMathGateChallenge() : { a: 4, b: 3, answer: 7 };
    var ov = document.createElement("div");
    ov.className = "ks-gate-overlay";
    ov.innerHTML =
      '<div class="kid-plastic-window ks-gate-box">' +
      '  <h3>' + esc(tx("ksGateTitle", "🔒 بوابة الأهل")) + '</h3>' +
      '  <p>' + esc(tx("ksGateSub", "احسب الناتج لفتح وضع المبتدئ / المحترف:")) + '</p>' +
      '  <div class="kid-plastic-well" style="padding:12px;text-align:center;font-size:1.4rem;font-weight:900">' + ch.a + ' + ' + ch.b + ' = ?</div>' +
      '  <input id="ks-gate-in" class="ks-inline-input" type="number" inputmode="numeric">' +
      '  <div style="display:flex;gap:8px">' +
      '    <button type="button" class="kid-plastic-btn kid-plastic-btn-emerald" id="ks-gate-ok" style="flex:1">' + esc(tx("ksUnlock", "فتح")) + '</button>' +
      '    <button type="button" class="kid-plastic-btn" id="ks-gate-no">' + esc(tx("uxClose", "إغلاق")) + '</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(ov);
    var inp = el("ks-gate-in");
    if (inp) inp.focus();
    el("ks-gate-no").onclick = function () { ov.remove(); };
    el("ks-gate-ok").onclick = function () {
      if (inp && parseInt(inp.value, 10) === ch.answer) { ov.remove(); onPass(); }
      else { sfx("err"); if (inp) inp.value = ""; }
    };
  }

  window.ksGuardModeExit = function (sel) {
    if (!state.parentLock || sel.value === "kid") return true;
    var targetMode = sel.value;
    sel.value = "kid";
    openMathGate(function () {
      state.parentLock = false;
      localStorage.setItem(LS_LOCK, "0");
      sel.value = targetMode;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });
    return false;
  };

  function onAction(e) {
    if (state.tierPopOpen && !(e.target && e.target.closest && e.target.closest(".ks-top-actions"))) { state.tierPopOpen = false; renderAll(); }
    var btn = e.target && e.target.closest ? e.target.closest("[data-act]") : null;
    if (!btn) return;
    var act = btn.getAttribute("data-act"), idx = parseInt(btn.getAttribute("data-i") || "0", 10);
    var K = window.BaydaKidEngine;
    if (act === "tog-hdr") { document.body.classList.toggle("ks-hdr-open"); sfx("tap"); renderAll(); return; }
    if (act === "tog-tier-pop") { state.tierPopOpen = !state.tierPopOpen; sfx("tap"); renderAll(); return; }
    if (act === "tog-blk") { var bid = btn.getAttribute("data-id"); state.editingBlockId = state.editingBlockId === bid ? "" : bid; sfx("tap"); renderAll(); return; }
    if (act === "go-learn") { if (typeof switchTab === "function") switchTab("learn"); renderAll(); return; }
    if (act === "go-lab") { if (typeof switchTab === "function") switchTab("lab"); renderAll(); return; }
    if (act === "set-tab") { state.tab = btn.getAttribute("data-tab") || "blocks"; sfx("tap"); renderAll(); return; }
    if (act === "set-band") { state.ageChoice = btn.getAttribute("data-b") || "auto"; state.tierPopOpen = false; localStorage.setItem(LS_AGE, state.ageChoice); sfx("tap"); renderAll(); return; }
    if (act === "tog-lock") {
      if (state.parentLock) {
        openMathGate(function () { state.parentLock = false; localStorage.setItem(LS_LOCK, "0"); renderAll(); });
      } else { state.parentLock = true; localStorage.setItem(LS_LOCK, "1"); sfx("ok"); renderAll(); }
      return;
    }
    if (act === "mascot-tap") { if (typeof window.kBuddyTap === "function") window.kBuddyTap(); else { awardStars(1, btn); confetti(18); sfx("ok"); } renderAll(); return; }
    if (act === "add-blk") { addBlock(btn.getAttribute("data-kind") || "say"); return; }
    if (act === "load-starter") { ensureBlocks(true); sfx("tap"); renderAll(); return; }
    if (act === "clear-blks") { state.blocks = []; state.outputs = []; state.speech = ""; saveBlocks(); renderAll(); return; }
    if (act === "next-mission") { state.missionIdx++; sfx("tap"); renderAll(); return; }
    if (act === "del") { state.blocks.splice(idx, 1); saveBlocks(); renderAll(); return; }
    if (act === "mv-up" && idx > 0) { var t = state.blocks[idx - 1]; state.blocks[idx - 1] = state.blocks[idx]; state.blocks[idx] = t; saveBlocks(); renderAll(); return; }
    if (act === "mv-dn" && idx < state.blocks.length - 1) { var t2 = state.blocks[idx + 1]; state.blocks[idx + 1] = state.blocks[idx]; state.blocks[idx] = t2; saveBlocks(); renderAll(); return; }
    if (act === "set-pay" && state.blocks[idx]) { state.blocks[idx].payload = btn.getAttribute("data-v") || ""; saveBlocks(); sfx("tap"); renderAll(); return; }
    if (act === "step-dec" && state.blocks[idx]) { state.blocks[idx].steps = Math.max(1, (state.blocks[idx].steps || 1) - 1); saveBlocks(); renderAll(); return; }
    if (act === "step-inc" && state.blocks[idx]) { state.blocks[idx].steps = Math.min(5, (state.blocks[idx].steps || 1) + 1); saveBlocks(); renderAll(); return; }
    if (act === "gate-tog" && state.blocks[idx]) { state.blocks[idx].truth = state.blocks[idx].truth === false; saveBlocks(); sfx("tap"); renderAll(); return; }
    if (act === "rep-dec" && state.blocks[idx]) { state.blocks[idx].count = Math.max(2, (state.blocks[idx].count || 2) - 1); saveBlocks(); renderAll(); return; }
    if (act === "rep-inc" && state.blocks[idx]) { state.blocks[idx].count = Math.min(6, (state.blocks[idx].count || 2) + 1); saveBlocks(); renderAll(); return; }
    if (act === "rep-act" && state.blocks[idx]) {
      var cur = (state.blocks[idx].innerActions || ["jump"])[0];
      state.blocks[idx].innerActions = [cur === "jump" ? "say" : cur === "say" ? "move" : "jump"];
      saveBlocks(); renderAll(); return;
    }
    if (act === "play-story") { runStory(false); return; }
    if (act === "step-story") { runStory(true); return; }
    if (act === "reset-story") { stopPlayback(); state.outputs = []; state.speech = ""; state.heroPos = 0; state.inputs = []; state.awaitingPrompt = null; renderAll(); return; }
    if (act === "speak-out") { speakOutputs(); return; }
    if (act === "send-prompt") {
      var pin = el("ks-prompt-in");
      state.inputs.push(pin ? pin.value : "");
      runStory(false); return;
    }
    if (act === "rob-m") { state.robotIdx = idx; state.robotQueue = []; state.robotStepIdx = -1; state.robotMsg = ""; renderAll(); return; }
    if (act === "rob-add") { state.robotQueue.push(btn.getAttribute("data-cmd")); sfx("tap"); renderAll(); return; }
    if (act === "rob-del") { state.robotQueue.splice(idx, 1); renderAll(); return; }
    if (act === "rob-clr") { state.robotQueue = []; state.robotStepIdx = -1; state.robotMsg = ""; renderAll(); return; }
    if (act === "rob-run") { runRobot(); return; }
    if (act === "g-pick") {
      var gid = btn.getAttribute("data-gid"), ok = btn.getAttribute("data-ok") === "1";
      state.gameStatus[gid] = { ok: ok, text: ok ? tx("ksCorrect", "🌟 رائع! إجابة صحيحة") : tx("ksWrong", "🔁 حاول مرة أخرى") };
      if (ok) markSolved("g_" + gid, 2, btn); else sfx("err");
      renderAll(); return;
    }
    if (act === "mem-flip") {
      var mid = btn.getAttribute("data-mid"), cid = btn.getAttribute("data-cid"), pair = btn.getAttribute("data-pair");
      var ms = state.memState[mid] || { open: [], matched: [] };
      if (ms.matched.indexOf(pair) >= 0 || ms.open.indexOf(cid) >= 0) return;
      ms.open.push(cid);
      if (ms.open.length === 2) {
        var b0 = document.querySelector('[data-mid="' + mid + '"][data-cid="' + ms.open[0] + '"]');
        if (b0 && b0.getAttribute("data-pair") === pair) {
          ms.matched.push(pair); ms.open = []; markSolved("mem_" + mid + "_" + pair, 1, btn);
        } else { sfx("err"); setTimeout(function () { ms.open = []; renderAll(); }, 550); }
      } else sfx("tap");
      state.memState[mid] = ms; renderAll(); return;
    }
    if (act === "ord-add") { var oid = btn.getAttribute("data-oid"); state.orderState[oid] = (state.orderState[oid] || []).concat(btn.getAttribute("data-bid")); sfx("tap"); renderAll(); return; }
    if (act === "ord-clr") { var oid2 = btn.getAttribute("data-oid"); state.orderState[oid2] = []; state.gameStatus[oid2] = null; renderAll(); return; }
    if (act === "ord-chk") {
      var oid3 = btn.getAttribute("data-oid"), got = (state.orderState[oid3] || []).join(","), ans = btn.getAttribute("data-ans");
      var okOrd = got === ans;
      state.gameStatus[oid3] = { ok: okOrd, text: okOrd ? tx("ksCorrect", "🌟 رائع! إجابة صحيحة") : tx("ksWrong", "🔁 حاول مرة أخرى") };
      if (okOrd) markSolved("ord_" + oid3, 2, btn); else sfx("err");
      renderAll(); return;
    }
    if (act === "open-bb") { var bb = el("bb-open"); if (bb) bb.click(); return; }
    if (act === "set-theme") {
      var tId = btn.getAttribute("data-t");
      document.body.setAttribute("data-kid-theme", tId);
      localStorage.setItem("baydaKidTheme", tId);
      localStorage.setItem("bayda_kid_theme_x", tId === "desert" ? "desert" : "");
      confetti(18); sfx("ok"); renderAll(); return;
    }
    if (act === "g-next") { var gid = btn.getAttribute("data-gid"); if (gid) { state.gameIdx = state.gameIdx || {}; state.gameIdx[gid] = (state.gameIdx[gid] || 0) + 1; delete state.gameStatus[gid]; renderAll(); } return; }
    if (act === "les-pick") { state.lessonIdx = idx; state.lessonChosen = []; state.lessonMsg = null; sfx("tap"); renderAll(); return; }
    if (act === "les-add") { state.lessonChosen.push(btn.getAttribute("data-tid")); state.lessonMsg = null; sfx("tap"); renderAll(); return; }
    if (act === "les-rem") { state.lessonChosen.splice(idx, 1); state.lessonMsg = null; renderAll(); return; }
    if (act === "les-clr") { state.lessonChosen = []; state.lessonMsg = null; renderAll(); return; }
    if(act==="les-dl"){if(typeof window.baydaDownloadLessons==="function")window.baydaDownloadLessons(getDialectState().id||"dz-latn");return;}
    if(act==="les-run"&&K){
      var ds=getDialectState(),data=getActiveKidLessons(ds),les=data.items[state.lessonIdx%data.items.length],E=window.BaydaEngine;
      var codes=state.lessonChosen.map(function(id){var x=les.tiles.find(function(z){return z.id===id;});return x?x.code:"";});
      if(les.isPack&&E&&E.checkLessonEntry){
        var r=E.checkLessonEntry(les.id,codes.join("\n"),"kid");
        var ex=E.executeCode?E.executeCode(codes.join("\n")):{outputs:[]};
        state.lessonMsg={ok:r.status==="ok",text:r.message+(ex.outputs&&ex.outputs.length?" → "+ex.outputs.join(" · "):"")};
        if(r.status==="ok")markSolved("les_"+les.id,3,btn);else sfx("err");
      }else{
        var vr=K.verifyKidLesson(les.raw,codes,ds);
        state.lessonMsg={ok:vr.ok,text:(vr.ok?tx("ksCorrect","🌟 رائع! إجابة صحيحة"):tx("ksWrong","🔁 حاول مرة أخرى"))+(vr.outputs.length?" → "+vr.outputs.join(" · "):"")};
        if(vr.ok)markSolved("les_"+les.id,3,btn);else sfx("err");
      }
      renderAll();
    }
  }

  function onInput(e) {
    var act = e.target && e.target.getAttribute ? e.target.getAttribute("data-act") : "";
    if (!act) return;
    var idx = parseInt(e.target.getAttribute("data-i") || "0", 10);
    if (!state.blocks[idx]) return;
    if (act === "edit-pay") state.blocks[idx].payload = e.target.value;
    else if (act === "edit-else") state.blocks[idx].elsePayload = e.target.value;
    else if (act === "edit-list") state.blocks[idx].items = e.target.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    saveBlocks();
  }


  var DICT_ICONS={print:"🗣️",if:"🚪",else:"🔀",true:"✅",false:"❌",while:"🔁",for:"🔄",let:"📦",input:"🎤",function:"⚙️",return:"↩️",push:"➕",length:"📏"};
  function openKidDictModal(){
    var old=el("ks-dict-modal");if(old&&old.parentNode)old.parentNode.removeChild(old);
    var ds=getDialectState(),rows=[];
    Object.keys(ds.keywords||{}).forEach(function(w){var c=ds.keywords[w];rows.push({w:w,m:c,e:DICT_ICONS[c]||"🧩"});});
    Object.keys(ds.vocabulary||{}).forEach(function(w){rows.push({w:w,m:ds.vocabulary[w],e:"💬"});});
    var ov=document.createElement("div");ov.id="ks-dict-modal";ov.className="ks-dict-overlay";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");
    ov.innerHTML='<div class="ks-dict-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>📖 '+esc(tx("ksDictTitle","القاموس المصوّر"))+' ('+esc(ds.id)+')</b><button type="button" class="kid-plastic-btn kid-plastic-btn-rose" id="ks-dict-x">✕</button></div><input id="ks-dict-q" type="search" class="ks-inline-edit" placeholder="'+esc(tx("ksDictSearch","ابحث عن كلمة..."))+'" style="width:100%"><div class="ks-dict-grid" id="ks-dict-grid"></div></div>';
    document.body.appendChild(ov);
    function draw(q){
      var g=el("ks-dict-grid");if(!g)return;
      var s=(q||"").trim().toLowerCase();
      var f=rows.filter(function(r){return !s||r.w.toLowerCase().indexOf(s)>=0||String(r.m).toLowerCase().indexOf(s)>=0;});
      g.innerHTML=f.length?f.slice(0,80).map(function(r){return '<button type="button" class="ks-dict-item" data-w="'+esc(r.w)+'"><span style="font-size:1.25rem">'+r.e+' 🔊</span><span class="ks-dict-word">'+esc(r.w)+'</span><span class="ks-dict-mean">'+esc(r.m)+'</span></button>';}).join(""):'<div style="grid-column:1/-1;text-align:center;padding:16px;font-weight:700">'+esc(tx("ksDictEmpty","لا توجد كلمات مطابقة"))+"</div>";
    }
    draw("");
    function close(){document.removeEventListener("keydown",onKey);if(ov.parentNode)ov.parentNode.removeChild(ov);}
    function onKey(e){if(e.key==="Escape")close();}
    document.addEventListener("keydown",onKey);
    ov.addEventListener("click",function(e){if(e.target===ov||e.target.id==="ks-dict-x"){close();return;}var it=e.target.closest&&e.target.closest(".ks-dict-item");if(it){var w=it.getAttribute("data-w")||"";speakText(w);sfx("tap");}});
    var inp=el("ks-dict-q");if(inp)inp.addEventListener("input",function(){draw(inp.value);});
  }
  window.ksOpenDictModal=openKidDictModal;

  function syncMode() {
    var isKid = document.body.getAttribute("data-mode") === "kid";
    var dp = el("dict-pane");
    if (dp && isKid && !dp.dataset.ksInit) { dp.classList.add("hidden"); dp.dataset.ksInit = "1"; }
    else if (dp && !isKid && dp.dataset.ksInit) { dp.classList.remove("hidden"); delete dp.dataset.ksInit; }
    if (isKid) renderAll();
  }

  function init() {
    document.addEventListener("click", onAction);
    document.addEventListener("input", onInput);
    document.addEventListener("bayda:dialect_changed", function () { state.dialectId = ""; state.lessonIdx = 0; state.lessonChosen = []; state.lessonMsg = null; state.gameStatus = {}; state.memState = {}; state.orderState = {}; state.gameIdx = {}; renderAll(); });
    document.addEventListener("bayda:uilang_changed", function () { renderAll(); });
    document.addEventListener("kid:stars", function () { renderAll(); });
    document.addEventListener("bayda:lessons_updated", function () { state.lessonIdx = 0; state.lessonChosen = []; state.lessonMsg = null; renderAll(); });
    document.addEventListener("bayda:tab_changed", function () { renderAll(); });
    var sel = el("mode-select");
    if (sel) sel.addEventListener("change", function () { setTimeout(syncMode, 40); });
    syncMode();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
