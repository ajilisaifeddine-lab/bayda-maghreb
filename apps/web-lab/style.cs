@import url('https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;700&display=swap');

/* ================= THEMES & MODES ================= */
:root, [data-theme="light"] { --bg: #f8fafc; --panel: #ffffff; --border: #e2e8f0; --text: #0f172a; --primary: #3b82f6; --shadow: 0 10px 25px -5px rgba(0,0,0,0.1); --glass: rgba(255,255,255,0.95); }
[data-theme="dark"] { --bg: #0f172a; --panel: #1e293b; --border: #334155; --text: #f8fafc; --primary: #38bdf8; --shadow: 0 4px 6px -1px rgba(0,0,0,0.3); --glass: rgba(30,41,59,0.95); }
[data-theme="comfort"] { --bg: #fdf6e3; --panel: #fdf6e3; --border: #d3cbb7; --text: #586e75; --primary: #268bd2; --shadow: 0 4px 6px -1px rgba(0,0,0,0.1); --glass: rgba(253,246,227,0.95); }
[data-theme="pro-amoled"] { --bg: #000000; --panel: #0a0a0a; --border: #222222; --text: #e2e8f0; --primary: #00ffcc; --shadow: none; --glass: rgba(10,10,10,0.9); }
[data-theme="pro-solarized"] { --bg: #002b36; --panel: #073642; --border: #073642; --text: #839496; --primary: #b58900; --shadow: none; --glass: rgba(7,54,66,0.9); }
[data-theme="pro-high-contrast"] { --bg: #000; --panel: #111; --border: #555; --text: #fff; --primary: #ff0; --shadow: none; --glass: rgba(17,17,17,0.9); }

[data-mode="beginner"] { --font-ui: 'Segoe UI', sans-serif; --font-code: 'Fira Code', monospace; --border-radius: 16px; --border-width: 1px; }
[data-mode="kid"] { --font-ui: 'Baloo Bhaijaan 2', cursive; --border-width: 4px; --border-radius: 30px; --bg: #fef08a; --panel: #fff; --border: #1e1b4b; --text: #1e1b4b; --primary: #ec4899; --shadow: 0 12px 0 var(--border), 0 15px 20px rgba(0,0,0,0.15); }
[data-mode="pro"] { --font-ui: system-ui, sans-serif; --font-code: 'Fira Code', monospace; --border-radius: 0px; --border-width: 1px; }

/* ================= GLOBAL & HEADER ================= */
* { box-sizing: border-box; margin: 0; padding: 0; font-family: var(--font-ui); outline: none; }
body { background: var(--bg); color: var(--text); height: 100dvh; display: flex; flex-direction: column; transition: background 0.3s, color 0.3s; overflow: hidden; }

header { padding: 8px 10px; display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
.hero-card { display: grid !important; grid-template-columns: 1fr auto 1fr !important; align-items: center !important; padding: 5px 15px !important; background: var(--glass); border-radius: var(--border-radius); border: var(--border-width) solid var(--border); box-shadow: var(--shadow); backdrop-filter: blur(10px); width: 100%; max-width: 600px; margin: 0 auto; height: 65px !important; }
.flags-side { display: flex !important; flex-direction: row !important; gap: 6px !important; align-items: center !important; }
.flags-side:first-child { justify-content: flex-end !important; }
.flags-side:last-child { justify-content: flex-start !important; }
.logo-container { display: flex; justify-content: center; align-items: center; z-index: 2; padding: 0 15px; }
.logo-img { height: 45px !important; filter: drop-shadow(0px 0px 3px var(--text)) drop-shadow(0px 0px 15px var(--primary)); animation: spin-slow-reverse 20s linear infinite; }
@keyframes spin-slow-reverse { 100% { transform: rotate(-360deg); } }
@keyframes spin-fast-reverse { 100% { transform: rotate(-360deg); } }
[data-mode="kid"] .logo-img.spin-fast, [data-mode="beginner"] .logo-img.spin-fast { animation: spin-fast-reverse 0.6s linear 3; }
.flag-btn { width: 32px !important; height: 32px !important; border-radius: 50%; border: 2px solid var(--border); background: #fff; cursor: pointer; transition: 0.2s; padding: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.15); overflow: hidden; display: flex; align-items: center; justify-content: center; }
.flag-btn:hover, .flag-btn.active { transform: scale(1.15); box-shadow: 0 0 10px var(--primary); border-color: var(--primary); z-index: 10; }
.flag-img { width: 100%; height: 100%; object-fit: cover; display: block; }

.controls-card { display: flex; justify-content: center; align-items: center; gap: 8px; padding: 6px 12px; background: var(--glass); border-radius: 50px; border: 1px solid var(--border); box-shadow: var(--shadow); width: fit-content; margin: 0 auto; max-width: 100%; flex-wrap: wrap; }
.divider { width: 1px; height: 20px; background: var(--border); margin: 0 4px; }
.theme-controls { display: flex; gap: 2px; background: rgba(0,0,0,0.05); padding: 3px; border-radius: 30px; }
[data-theme="dark"] .theme-controls, [data-theme^="pro"] .theme-controls { background: rgba(255,255,255,0.1); }
.icon-btn { background: transparent; color: var(--text); border: none; cursor: pointer; padding: 6px; border-radius: 50%; font-size: 1.1rem; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
.icon-btn:hover { background: rgba(0,0,0,0.1); transform: scale(1.1); }
.icon-btn.active { background: var(--primary); color: #fff; }
.custom-select { padding: 5px 8px; border-radius: 30px; border: 1px solid var(--border); font-weight: bold; font-size: 0.85rem; cursor: pointer; background: transparent; color: var(--text); }

/* ================= WORKSPACE LAYOUT ================= */
.workspace { display: flex; flex: 1; padding: 0 10px; gap: 10px; overflow-y: auto; min-height: 0; padding-bottom: 10px; }
.workspace.layout-col { flex-direction: column; }
.workspace.layout-row { flex-direction: row; }
.pane.hidden { display: none !important; }

/* Mode-specific Pane visibility */
[data-mode="pro"] .dict-pane { display: none !important; }
[data-mode="pro"] .notes-pane { display: flex !important; }
[data-mode="kid"] .notes-pane, [data-mode="beginner"] .notes-pane { display: none !important; }

/* Pane Base Styles */
.pane { flex: 1; background: var(--panel); border: var(--border-width) solid var(--border); border-radius: var(--border-radius); display: flex; flex-direction: column; overflow: hidden; min-height: 150px; }
.pane-header { padding: 8px; background: rgba(0,0,0,0.03); border-bottom: 1px solid var(--border); font-weight: bold; text-align: center; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center; }
textarea, pre { flex: 1; padding: 10px; background: transparent; color: var(--text); border: none; outline: none; font-family: var(--font-code); font-size: 1rem; direction: ltr; text-align: left; white-space: pre-wrap; resize: none; }

/* ================= DICTIONARY ================= */
.dict-content { padding: 10px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
.dict-chips { display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 8px; }
.dict-chip { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px; border-radius: 12px; cursor: pointer; font-family: var(--font-code); font-weight: bold; text-align: center; font-size: 0.85rem; transition: 0.2s; }
.dict-chip:hover { border-color: var(--primary); color: var(--primary); }

/* ================= NOTES PANE ================= */
.notes-header { display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; gap: 5px; flex-wrap: wrap; }
.notes-top-bar { display: flex; align-items: center; gap: 4px; flex: 1; }
.note-selector { flex: 1; padding: 4px; border-radius: 6px; background: var(--bg); color: var(--text); border: 1px solid var(--border); font-size: 0.85rem; }
.text-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; background: rgba(0,0,0,0.05); border-bottom: 1px solid var(--border); }
[data-theme^="dark"] .text-toolbar, [data-theme^="pro"] .text-toolbar { background: rgba(255,255,255,0.05); }
.color-palette { display: flex; gap: 4px; }
.color-btn { width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--border); cursor: pointer; transition: 0.2s; }
.color-btn:hover { transform: scale(1.2); }
.format-actions { display: flex; gap: 2px; }
.symbols-container { display: flex; flex-direction: column; gap: 4px; padding: 6px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--border); max-height: 160px; overflow-y: auto; }
[data-theme^="dark"] .symbols-container, [data-theme^="pro"] .symbols-container { background: rgba(255,255,255,0.02); }
.sym-group { display: flex; flex-direction: column; gap: 2px; }
.group-title { font-size: 0.65rem; color: #888; font-weight: bold; margin-right: 4px; }
.sym-row { display: flex; flex-wrap: wrap; gap: 3px; }
.sym-btn { background: var(--panel); color: var(--text); border: 1px solid var(--border); border-radius: 4px; padding: 2px 6px; font-family: var(--font-code); font-size: 0.85rem; cursor: pointer; transition: 0.1s; min-width: 26px; text-align: center; }
.sym-btn:hover { background: var(--primary); color: var(--bg); transform: translateY(-1px); }
.num-btn { color: #eab308; font-weight: bold; border-color: #eab308; }
.num-btn:hover { background: #eab308; color: #000; }
.snip-btn { font-size: 0.75rem; color: #10b981; border-color: #10b981; font-weight: bold; }
.snip-btn:hover { background: #10b981; color: #000; }
.ctrl-btn { font-size: 0.75rem; color: #3b82f6; border-color: #3b82f6; background: rgba(59,130,246,0.1); }
.ctrl-btn:hover { background: #3b82f6; color: #fff; }
.notes-editor-wrapper { position: relative; flex: 1; display: flex; flex-direction: column; min-height: 120px; overflow: hidden; }
.notes-editor { flex: 1; padding: 10px; background: transparent; color: var(--text); overflow-y: auto; font-family: var(--font-code); font-size: 0.95rem; outline: none; direction: ltr; text-align: left; position: relative; z-index: 1; }
.notes-editor:empty:before { content: attr(placeholder); color: #888; }

/* Autocomplete */
.suggestion-box { position: absolute; bottom: 10px; left: 10px; right: 10px; background: var(--panel); border: 2px solid var(--primary); border-radius: 8px; padding: 5px; z-index: 100; max-height: 120px; overflow-y: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 2px; }
.suggestion-box.hidden { display: none !important; }
.suggestion-item { padding: 6px 10px; cursor: pointer; border-radius: 4px; font-family: var(--font-code); font-size: 0.9rem; color: var(--text); display: flex; justify-content: space-between; }
.suggestion-item:hover, .suggestion-item.selected { background: var(--primary); color: var(--bg); }
.suggestion-item .shortcut { opacity: 0.6; font-size: 0.75rem; }

/* ================= OUTPUT & FOOTER ================= */
.output-header { display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; }
.output-pane.minimized { flex: 0 0 auto !important; min-height: 40px !important; height: 40px !important; }
.output-pane.minimized pre { display: none; }
.output-pane { transition: all 0.3s ease; }
.footer-run { padding: 10px; display: flex; justify-content: center; background: var(--bg); flex-shrink: 0; z-index: 10; border-top: 1px solid var(--border); }
.btn-run { background: var(--primary); color: #fff; border: none; padding: 12px; font-weight: bold; font-size: 1.1rem; cursor: pointer; width: 100%; max-width: 400px; border-radius: 30px; transition: 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
.btn-run:hover { transform: translateY(-2px); }

/* ================= MODALS ================= */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); display: none; align-items: center; justify-content: center; z-index: 999; }
.modal-overlay.active { display: flex; }
.modal-content { background: var(--panel); padding: 20px; border-radius: var(--border-radius); max-width: 350px; width: 90%; text-align: center; box-shadow: var(--shadow); border: var(--border-width) solid var(--border); position: relative; }
.close-btn { position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text); }
.modal-actions { display: flex; gap: 10px; justify-content: center; margin-top: 15px; }
.btn-primary, .btn-secondary { padding: 10px 15px; border-radius: 12px; border: none; font-weight: bold; cursor: pointer; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-secondary { background: var(--bg); color: var(--text); border: 1px solid var(--border); }

@media (max-width: 768px) { .workspace.layout-row { flex-direction: column; } }
/* ================= TABS NAVIGATION ================= */
.tabs-nav {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-bottom: 10px;
    background: var(--panel);
    padding: 5px;
    border-radius: 30px;
    border: 2px solid var(--border);
    width: fit-content;
    margin: 0 auto 10px auto;
}
.tab-btn {
    background: transparent;
    color: var(--text-muted);
    border: none;
    padding: 8px 20px;
    border-radius: 20px;
    cursor: pointer;
    font-weight: bold;
    font-family: var(--font-ui);
    transition: 0.3s;
}
.tab-btn.active {
    background: var(--primary);
    color: #fff;
}

/* ================= LEARN VIEW ================= */
.learn-container {
    width: 100%;
    max-width: 600px;
    background: var(--panel);
    padding: 30px;
    border-radius: var(--radius);
    border: 2px solid var(--border);
    box-shadow: var(--shadow);
    text-align: center;
}
.lesson-card {
    background: var(--bg);
    padding: 20px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    text-align: right;
}
.lesson-card h3 { margin-bottom: 10px; color: var(--primary); }
.lesson-card p { margin-bottom: 15px; font-size: 0.95rem; line-height: 1.5; }
.lesson-editor {
    width: 100%;
    height: 120px;
    background: var(--panel);
    color: var(--text);
    border: 2px solid var(--border);
    border-radius: 8px;
    padding: 10px;
    font-family: var(--font-code);
    font-size: 1rem;
    direction: ltr;
    text-align: left;
    resize: none;
    outline: none;
}
.lesson-feedback {
    margin-top: 15px;
    padding: 15px;
    border-radius: 8px;
    font-weight: bold;
    text-align: center;
}
.lesson-feedback.success { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid #10b981; }
.lesson-feedback.error { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444; }
