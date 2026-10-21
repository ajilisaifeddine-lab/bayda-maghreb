import { Lexer } from '../../core/lexer.js';
import { Parser } from '../../core/parser.js';
import { toJS } from '../../writers/js-writer.js';
import { toPython } from '../../writers/python-writer.js';

// DOM Elements
const editor = document.getElementById('editor') as HTMLTextAreaElement;
const output = document.getElementById('output') as HTMLPreElement;
const targetLang = document.getElementById('target-lang') as HTMLSelectElement;
const modeSelect = document.getElementById('mode-select') as HTMLSelectElement;
const dialectChips = document.querySelectorAll('.flag-btn');
const workspace = document.getElementById('workspace') as HTMLElement;
const dictPane = document.getElementById('dict-pane') as HTMLElement;
const dictPopup = document.getElementById('dict-popup') as HTMLElement;
const notesEditor = document.getElementById('notes-editor') as HTMLDivElement;
const noteSelector = document.getElementById('note-selector') as HTMLSelectElement;
const notesPane = document.getElementById('notes-pane') as HTMLElement;
const lineNumbers = document.getElementById('line-numbers') as HTMLDivElement;

let currentDialect = 'tn-latn';
let isLayoutRow = false;

// ================= SOUND ENGINE =================
let soundEnabled = localStorage.getItem('baydaSound') !== 'false';
let audioCtx: AudioContext | null = null;

function playSound(type: 'click' | 'success' | 'error') {
    if (!soundEnabled) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator(); 
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    
    if (type === 'click') { osc.frequency.setValueAtTime(600, audioCtx.currentTime); gain.gain.setValueAtTime(0.05, audioCtx.currentTime); osc.start(); osc.stop(audioCtx.currentTime + 0.05); }
    else if (type === 'success') { osc.frequency.setValueAtTime(400, audioCtx.currentTime); osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1); gain.gain.setValueAtTime(0.05, audioCtx.currentTime); osc.start(); osc.stop(audioCtx.currentTime + 0.2); }
    else if (type === 'error') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, audioCtx.currentTime); gain.gain.setValueAtTime(0.05, audioCtx.currentTime); osc.start(); osc.stop(audioCtx.currentTime + 0.2); }
}

document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) playSound('click');
});

// ================= TOAST SYSTEM =================
function showToast(message: string, type: 'success' | 'error' = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
}

// ================= SETTINGS MODAL =================
(window as any).openSettings = () => { document.getElementById('settings-modal')?.classList.add('active'); updateSoundUI(); };
(window as any).closeSettings = () => { document.getElementById('settings-modal')?.classList.remove('active'); };
(window as any).changeFontSize = (val: string) => { document.documentElement.style.setProperty('--font-base', val + 'px'); localStorage.setItem('baydaFontSize', val); };
function updateSoundUI() { const soundBtn = document.getElementById('toggle-sound-setting'); if (soundBtn) soundBtn.textContent = soundEnabled ? '🔊 مفعل' : '🔇 معطل'; }
(window as any).toggleSoundFromSettings = () => { soundEnabled = !soundEnabled; localStorage.setItem('baydaSound', String(soundEnabled)); updateSoundUI(); };
(window as any).clearAllData = () => { if (confirm("هل أنت متأكد من مسح كل البيانات؟")) { localStorage.clear(); location.reload(); } };

// ================= THEME LOGIC =================
const themes = ['light', 'dark', 'comfort'];
const themeIcons: Record<string, string> = { light: '☀️', dark: '🌙', comfort: '👁️' };
let currentThemeIndex = 0;
(window as any).cycleTheme = () => { currentThemeIndex = (currentThemeIndex + 1) % themes.length; const newTheme = themes[currentThemeIndex]; document.body.setAttribute('data-theme', newTheme); document.getElementById('theme-toggle-btn')!.innerText = themeIcons[newTheme]; saveState(); };

// ================= UI & LAYOUT =================
(window as any).toggleLayout = () => { isLayoutRow = !isLayoutRow; if (isLayoutRow) { workspace.classList.remove('layout-col'); workspace.classList.add('layout-row'); } else { workspace.classList.remove('layout-row'); workspace.classList.add('layout-col'); } };
(window as any).toggleDictionary = () => {
    const mode = document.body.getAttribute('data-mode'); const btn = document.getElementById('side-toggle-btn');
    if (mode === 'pro') { if (notesPane) { if (notesPane.classList.contains('hidden')) { notesPane.classList.remove('hidden'); if (btn) btn.textContent = '📝'; } else { notesPane.classList.add('hidden'); if (btn) btn.textContent = '👁️'; } } }
    else { if (dictPane) { if (dictPane.classList.contains('hidden')) { dictPane.classList.remove('hidden'); if (btn) btn.textContent = '📖'; } else { dictPane.classList.add('hidden'); if (btn) btn.textContent = '👁️'; } } }
};
(window as any).togglePane = (paneId: string, btn: HTMLButtonElement) => { const pane = document.getElementById(paneId); if (!pane) return; if (pane.classList.contains('pane-minimized')) { pane.classList.remove('pane-minimized'); btn.textContent = '-'; } else { pane.classList.add('pane-minimized'); btn.textContent = '+'; } };
(window as any).closeDictPopup = () => { dictPopup.classList.remove('active'); };

// ================= KID MODE FEATURES =================
let kidThemeIndex = 0; const kidThemes = ['candy', 'jungle', 'ocean'];
(window as any).changeKidTheme = () => { kidThemeIndex = (kidThemeIndex + 1) % kidThemes.length; document.body.setAttribute('data-kid-theme', kidThemes[kidThemeIndex]); };
(window as any).readOutput = () => { const text = output.textContent || ""; if (!text || text === "// النتيجة هنا...") return; window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'ar-SA'; utterance.rate = 0.9; utterance.pitch = 1.2; window.speechSynthesis.speak(utterance); };
(window as any).magicCode = () => { const magics = ['ktab("You are a superstar! ⭐")\nidha (haqq) {\n    ktab("Keep coding! 🚀")\n}', 'ktab("I love pizza! 🍕")', 'goul("Hello World! 🌍")', 'kteb("Bahja! 🎉")']; editor.value = magics[Math.floor(Math.random() * magics.length)]; saveState(); updateLineNumbers(); };

// ================= STATE MANAGEMENT =================
function saveState() { const state = { code: editor.value, mode: document.body.getAttribute('data-mode'), theme: document.body.getAttribute('data-theme'), dialect: currentDialect }; localStorage.setItem('baydaLabState', JSON.stringify(state)); }

async function loadState() {
    const savedFontSize = localStorage.getItem('baydaFontSize');
    if (savedFontSize) { document.documentElement.style.setProperty('--font-base', savedFontSize + 'px'); const slider = document.getElementById('font-size-slider') as HTMLInputElement; if (slider) slider.value = savedFontSize; }

    const saved = localStorage.getItem('baydaLabState');
    if (saved) {
        try {
            const state = JSON.parse(saved);
            if (state.theme) { 
                document.body.setAttribute('data-theme', state.theme); 
                currentThemeIndex = themes.indexOf(state.theme); 
                if(currentThemeIndex === -1) currentThemeIndex = 0;
                document.getElementById('theme-toggle-btn')!.innerText = themeIcons[themes[currentThemeIndex]]; 
            }
            if (state.mode) { document.body.setAttribute('data-mode', state.mode); modeSelect.value = state.mode; updateModeUI(state.mode); }
            if (state.dialect) await changeDialect(state.dialect);
            if (state.code) { editor.value = state.code; updateLineNumbers(); }
        } catch (e) { console.error(e); }
    } else { await changeDialect('tn-latn'); document.getElementById('consent-modal')!.classList.add('active'); }
}

// ================= NOTES APP =================
interface Note { id: string; title: string; content: string; }
let notes: Note[] = JSON.parse(localStorage.getItem('baydaNotesList') || '[]');
let currentNoteId: string | null = null;
function saveNotesToStorage() { localStorage.setItem('baydaNotesList', JSON.stringify(notes)); }
function renderNoteSelector() { noteSelector.innerHTML = ''; notes.forEach((note, index) => { const opt = document.createElement('option'); opt.value = note.id; opt.textContent = note.title || `ملاحظة ${index + 1}`; noteSelector.appendChild(opt); }); if (currentNoteId) noteSelector.value = currentNoteId; }
(window as any).createNewNote = () => { const newNote: Note = { id: Date.now().toString(), title: 'ملاحظة جديدة', content: '' }; notes.unshift(newNote); currentNoteId = newNote.id; saveNotesToStorage(); renderNoteSelector(); loadSelectedNote(); };
(window as any).deleteCurrentNote = () => { if (!currentNoteId) return; if (confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) { notes = notes.filter(n => n.id !== currentNoteId); currentNoteId = notes.length > 0 ? notes[0].id : null; saveNotesToStorage(); renderNoteSelector(); loadSelectedNote(); } };
(window as any).loadSelectedNote = () => { currentNoteId = noteSelector.value; const note = notes.find(n => n.id === currentNoteId); notesEditor.innerHTML = note ? note.content : ''; };
notesEditor?.addEventListener('input', () => { const note = notes.find(n => n.id === currentNoteId); if (note) { note.content = notesEditor.innerHTML; const textContent = notesEditor.innerText.trim(); note.title = textContent.substring(0, 15) + (textContent.length > 15 ? '...' : '') || 'ملاحظة فارغة'; saveNotesToStorage(); const opt = noteSelector.querySelector(`option[value="${note.id}"]`); if (opt) opt.textContent = note.title; } });
(window as any).formatDoc = (cmd: string, value: string | undefined = undefined) => { document.execCommand(cmd, false, value); notesEditor.focus(); };
(window as any).insertSym = (sym: string) => { if (!notesEditor) return; document.execCommand('insertText', false, sym); notesEditor.focus(); playSound('click'); };
if (notes.length === 0) { (window as any).createNewNote(); } else { currentNoteId = notes[0].id; renderNoteSelector(); loadSelectedNote(); }

// ================= DIALECTS & DICTIONARY =================
const greetings: Record<string, string> = { 'tn-latn': 'goul("Aslema")\nidha (s7i7) {\n    goul("Marhba bik")\n}', 'dz-latn': 'ktab("Salam")\nila (sah) {\n    ktab("Marhba")\n}', 'ly-latn': 'kteb("Salam")\nkan (sahih) {\n    kteb("Marhba")\n}', 'mr-latn': 'ktab("Salam")\nidha (haqq) {\n    ktab("Marhba")\n}', 'kab-latn': 'aru("Azul")\nma (tidett) {\n    aru("Ansuf")\n}', 'shi-latn': 'skr("Azul")\nma (tidtt) {\n    skr("Marhba")\n}' };
(window as any).acceptConsent = () => { document.getElementById('consent-modal')!.classList.remove('active'); changeDialect('tn-latn'); saveState(); };
(window as any).declineConsent = () => { document.getElementById('consent-modal')!.classList.remove('active'); changeDialect('tn-latn'); saveState(); };
async function changeDialect(dialectId: string) {
    currentDialect = dialectId;
    dialectChips.forEach(chip => { if (chip.getAttribute('data-dialect') === dialectId) chip.classList.add('active'); else chip.classList.remove('active'); });
    try {
        const cached = localStorage.getItem(`baydaCache_${dialectId}`);
        let keywordsMap, vocabMap;
        if (cached) { const parsed = JSON.parse(cached); keywordsMap = parsed.keywords; vocabMap = parsed.vocab; }
        else { const [kwResponse, vocabResponse] = await Promise.all([ fetch(`packages/${dialectId}/keywords.json`), fetch(`packages/${dialectId}/vocabulary.json`) ]); keywordsMap = await kwResponse.json(); vocabMap = await vocabResponse.json(); localStorage.setItem(`baydaCache_${dialectId}`, JSON.stringify({ keywords: keywordsMap, vocab: vocabMap })); }
        updateDictionary(vocabMap); editor.value = greetings[dialectId] || greetings['tn-latn']; (window as any).currentKeywordsMap = keywordsMap; updateLineNumbers();
    } catch (error) { console.error("Error loading dialect:", error); }
}
function updateDictionary(vocab: Record<string, string>) {
    const chipsContainer = document.getElementById('dict-chips'); if (!chipsContainer) return; chipsContainer.innerHTML = '';
    Object.keys(vocab).slice(0, 15).forEach(word => { const chip = document.createElement('span'); chip.className = 'dict-chip'; chip.textContent = word; chip.onclick = () => { (document.getElementById('dw-word') as HTMLElement).textContent = word; (document.getElementById('dw-ar') as HTMLElement).textContent = "المعنى: " + vocab[word]; dictPopup.classList.add('active'); }; chipsContainer.appendChild(chip); });
}
dialectChips.forEach(chip => { chip.addEventListener('click', () => { const dialect = chip.getAttribute('data-dialect'); if (dialect) { changeDialect(dialect); saveState(); } }); });

// ================= MODE & UI UPDATE =================
function updateModeUI(mode: string) {
    const standardThemes = document.getElementById('standard-theme-controls');
    const kidThemesControls = document.getElementById('kid-theme-controls');
    const btn = document.getElementById('side-toggle-btn');
    if (mode === 'kid') { standardThemes?.classList.add('hidden'); kidThemesControls?.classList.remove('hidden'); document.body.setAttribute('data-kid-theme', 'candy'); }
    else { kidThemesControls?.classList.add('hidden'); standardThemes?.classList.remove('hidden'); document.body.removeAttribute('data-kid-theme'); }
    if (mode === 'pro') { if (btn) btn.textContent = '📝'; dictPane?.classList.add('hidden'); notesPane?.classList.remove('hidden'); }
    else { if (btn) btn.textContent = '📖'; notesPane?.classList.add('hidden'); dictPane?.classList.remove('hidden'); }
}
modeSelect?.addEventListener('change', (e) => { const mode = (e.target as HTMLSelectElement).value; document.body.setAttribute('data-mode', mode); updateModeUI(mode); saveState(); });

// ================= LINE NUMBERS LOGIC =================
function updateLineNumbers() {
    const lines = editor.value.split('\n').length;
    if (lineNumbers) {
        lineNumbers.innerHTML = Array.from({length: lines}, (_, i) => i + 1).join('<br>');
    }
}
editor.addEventListener('scroll', () => {
    if (lineNumbers) lineNumbers.scrollTop = editor.scrollTop;
});

// ================= TABS & LEARN LOGIC =================
(window as any).switchTab = (tab: 'lab' | 'learn') => {
    const viewLab = document.getElementById('view-lab');
    const viewLearn = document.getElementById('view-learn');
    const footerRun = document.getElementById('footer-run');
    const tabLabBtn = document.getElementById('tab-lab-btn');
    const tabLearnBtn = document.getElementById('tab-learn-btn');

    if (!viewLab || !viewLearn || !footerRun || !tabLabBtn || !tabLearnBtn) return;

    if (tab === 'lab') {
        viewLab.style.display = 'flex';
        viewLearn.style.display = 'none';
        tabLabBtn.classList.add('active');
        tabLearnBtn.classList.remove('active');
        footerRun.style.display = 'flex';
    } else {
        viewLab.style.display = 'none';
        viewLearn.style.display = 'flex';
        tabLabBtn.classList.remove('active');
        tabLearnBtn.classList.add('active');
        footerRun.style.display = 'none';
    }
    playSound('click');
};

(window as any).resetLesson = () => {
    const editor = document.getElementById('lesson-editor') as HTMLTextAreaElement;
    if (editor) editor.value = '';
    const feedback = document.getElementById('lesson-feedback');
    if (feedback) feedback.className = 'lesson-feedback hidden';
};

(window as any).insertToLesson = (sym: string) => {
    const lessonEditor = document.getElementById('lesson-editor') as HTMLTextAreaElement;
    if (!lessonEditor) return;
    const start = lessonEditor.selectionStart;
    const end = lessonEditor.selectionEnd;
    const text = lessonEditor.value;
    lessonEditor.value = text.substring(0, start) + sym + text.substring(end);
    lessonEditor.selectionStart = lessonEditor.selectionEnd = start + sym.length;
    lessonEditor.focus();
    playSound('click');
};

// Helper function to search AST for a string value
function containsString(node: any, target: string): boolean {
    if (!node) return false;
    if (node.type === 'StringLiteral' && node.value === target) return true;
    if (node.type === 'Program') {
        return node.body.some((child: any) => containsString(child, target));
    }
    if (node.type === 'Call') {
        return node.args.some((child: any) => containsString(child, target));
    }
    if (node.type === 'If') {
        return containsString(node.test, target) || 
               node.then.some((child: any) => containsString(child, target)) || 
               (node.else ? node.else.some((child: any) => containsString(child, target)) : false);
    }
    if (node.type === 'BinaryExpression') {
        return containsString(node.left, target) || containsString(node.right, target);
    }
    return false;
}

(window as any).checkLesson = () => {
    const lessonEditor = document.getElementById('lesson-editor') as HTMLTextAreaElement;
    if (!lessonEditor) return;
    
    // تنظيف العلامات الذكية
    let rawCode = lessonEditor.value;
    rawCode = rawCode.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    const code = rawCode.trim();
    
    if (!code) {
        showToast("❌ الرجاء كتابة كود أولاً.", "error");
        playSound('error');
        return;
    }

    try {
        const keywordsMap = (window as any).currentKeywordsMap || {};
        
        if (Object.keys(keywordsMap).length === 0) {
            showToast("❌ جاري تحميل اللهجة...", "error");
            return;
        }

        // 1. التحقق من الصياغة (Syntax Check)
        const lexer = new Lexer(code, keywordsMap);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens, keywordsMap);
        const ast = parser.parse();
        
        // 2. التحقق من المهمة (Task Check)
        if (containsString(ast, 'salam')) {
            showToast("🎉 إجابة صحيحة! لقد تعلمت الطباعة بنجاح.", "success");
            playSound('success');
        } else {
            showToast("⚠️ الصياغة صحيحة، لكن يجب أن تطبع كلمة 'salam' بالتحديد.", "error");
            playSound('error');
        }

    } catch (error: any) {
        // 3. خطأ برمجي حقيقي (Syntax Error)
        showToast("❌ خطأ برمجي: " + error.message, "error");
        playSound('error');
    }
};

// ================= RUN CODE =================
document.getElementById('run-btn')?.addEventListener('click', () => {
    const code = editor.value; output.innerHTML = '';
    try {
        const keywordsMap = (window as any).currentKeywordsMap;
        if (!keywordsMap) return alert("جاري تحميل اللهجة...");
        const lexer = new Lexer(code, keywordsMap); const tokens = lexer.tokenize();
        const parser = new Parser(tokens, keywordsMap); const ast = parser.parse();
        let result = targetLang.value === 'js' ? toJS(ast, keywordsMap) : toPython(ast, keywordsMap);
        output.textContent = result; output.style.color = 'var(--primary)'; playSound('success');
    } catch (error: any) { output.textContent = "Error: " + error.message; output.style.color = '#ef4444'; playSound('error'); }
});

// ================= INITIALIZATION =================
if (editor) editor.addEventListener('input', () => { updateLineNumbers(); saveState(); });
loadState();
