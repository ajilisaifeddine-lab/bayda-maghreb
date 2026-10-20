import { Lexer } from '../../core/lexer.js';
import { Parser } from '../../core/parser.js';
import { toJS } from '../../writers/js-writer.js';
import { toPython } from '../../writers/python-writer.js';

// DOM Elements (matched exactly with index.html)
const editor = document.getElementById('editor') as HTMLTextAreaElement;
const output = document.getElementById('output') as HTMLPreElement;
const targetLang = document.getElementById('target-lang') as HTMLSelectElement;
const modeSelect = document.getElementById('mode-select') as HTMLSelectElement;
const dialectChips = document.querySelectorAll('.flag-btn');
const workspace = document.getElementById('workspace') as HTMLElement;
const dictPane = document.getElementById('dict-pane') as HTMLElement;
const dictPopup = document.getElementById('dict-popup') as HTMLElement;

let currentDialect = 'tn-latn';
let isLayoutRow = false;

// ================= LAYOUT & UI TOGGLES =================
(window as any).toggleLayout = () => {
    isLayoutRow = !isLayoutRow;
    if (isLayoutRow) { 
        workspace.classList.remove('layout-col'); 
        workspace.classList.add('layout-row'); 
    } else { 
        workspace.classList.remove('layout-row'); 
        workspace.classList.add('layout-col'); 
    }
};

(window as any).toggleDictionary = () => {
    dictPane.classList.toggle('hidden');
};

(window as any).closeDictPopup = () => { 
    dictPopup.classList.remove('active'); 
};

(window as any).setTheme = (theme: string) => {
    document.body.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-controls .icon-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btn-' + theme)?.classList.add('active');
};

(window as any).togglePane = (paneId: string, btn: HTMLButtonElement) => {
    const pane = document.getElementById(paneId);
    if (!pane) return;
    
    if (pane.classList.contains('pane-minimized')) {
        pane.classList.remove('pane-minimized');
        btn.textContent = '-';
    } else {
        pane.classList.add('pane-minimized');
        btn.textContent = '+';
    }
};

// ================= STATE MANAGEMENT =================
function saveState() {
    const state = {
        code: editor.value,
        mode: document.body.getAttribute('data-mode'),
        theme: document.body.getAttribute('data-theme'),
        dialect: currentDialect
    };
    localStorage.setItem('baydaLabState', JSON.stringify(state));
}

async function loadState() {
    const saved = localStorage.getItem('baydaLabState');
    if (saved) {
        try {
            const state = JSON.parse(saved);
            if (state.theme) {
                document.body.setAttribute('data-theme', state.theme);
                document.querySelectorAll('.theme-controls .icon-btn').forEach(btn => btn.classList.remove('active'));
                document.getElementById('btn-' + state.theme)?.classList.add('active');
            }
            if (state.mode) {
                document.body.setAttribute('data-mode', state.mode);
                modeSelect.value = state.mode;
            }
            if (state.dialect) {
                await changeDialect(state.dialect);
            }
            if (state.code) {
                editor.value = state.code;
            }
        } catch (e) { 
            console.error("Error loading state", e); 
        }
    } else {
        await changeDialect('tn-latn');
    }
}

// ================= DIALECTS & DICTIONARY =================
const greetings: Record<string, string> = {
    'tn-latn': 'goul("Aslema")\nidha (s7i7) {\n    goul("Marhba bik")\n}', 
    'dz-latn': 'ktab("Salam")\nila (sah) {\n    ktab("Marhba")\n}',
    'ly-latn': 'kteb("Salam")\nkan (sahih) {\n    kteb("Marhba")\n}', 
    'mr-latn': 'ktab("Salam")\nidha (haqq) {\n    ktab("Marhba")\n}',
    'kab-latn': 'aru("Azul")\nma (tidett) {\n    aru("Ansuf")\n}', 
    'shi-latn': 'skr("Azul")\nma (tidtt) {\n    skr("Marhba")\n}'
};

(window as any).acceptConsent = () => { 
    document.getElementById('consent-modal')!.classList.remove('active'); 
    changeDialect('tn-latn'); 
    saveState();
};

(window as any).declineConsent = () => { 
    document.getElementById('consent-modal')!.classList.remove('active'); 
    changeDialect('tn-latn'); 
    saveState();
};

async function changeDialect(dialectId: string) {
    currentDialect = dialectId;
    dialectChips.forEach(chip => {
        if (chip.getAttribute('data-dialect') === dialectId) chip.classList.add('active');
        else chip.classList.remove('active');
    });
    
    try {
        const cached = localStorage.getItem(`baydaCache_${dialectId}`);
        let keywordsMap, vocabMap;

        if (cached) {
            const parsed = JSON.parse(cached);
            keywordsMap = parsed.keywords;
            vocabMap = parsed.vocab;
        } else {
            const [kwResponse, vocabResponse] = await Promise.all([
                fetch(`packages/${dialectId}/keywords.json`),
                fetch(`packages/${dialectId}/vocabulary.json`)
            ]);
            keywordsMap = await kwResponse.json();
            vocabMap = await vocabResponse.json();
            
            localStorage.setItem(`baydaCache_${dialectId}`, JSON.stringify({
                keywords: keywordsMap,
                vocab: vocabMap
            }));
        }

        updateDictionary(vocabMap);
        editor.value = greetings[dialectId] || greetings['tn-latn'];
        (window as any).currentKeywordsMap = keywordsMap;

    } catch (error) {
        console.error("Error loading dialect:", error);
    }
}

function updateDictionary(vocab: Record<string, string>) {
    const chipsContainer = document.getElementById('dict-chips'); 
    if (!chipsContainer) return; 
    chipsContainer.innerHTML = '';
    
    Object.keys(vocab).slice(0, 15).forEach(word => {
        const chip = document.createElement('span'); 
        chip.className = 'dict-chip'; 
        chip.textContent = word;
        chip.onclick = () => {
            (document.getElementById('dw-word') as HTMLElement).textContent = word;
            (document.getElementById('dw-ar') as HTMLElement).textContent = "المعنى: " + vocab[word]; 
            dictPopup.classList.add('active');
        };
        chipsContainer.appendChild(chip);
    });
}

dialectChips.forEach(chip => { 
    chip.addEventListener('click', () => { 
        const dialect = chip.getAttribute('data-dialect'); 
        if (dialect) { 
            changeDialect(dialect); 
            saveState();
        } 
    }); 
});

// ================= MODE & CODE EXECUTION =================
modeSelect?.addEventListener('change', (e) => { 
    const mode = (e.target as HTMLSelectElement).value; 
    document.body.setAttribute('data-mode', mode); 
    saveState();
});

document.getElementById('run-btn')?.addEventListener('click', () => {
    const code = editor.value; 
    output.innerHTML = '';
    
    try {
        const keywordsMap = (window as any).currentKeywordsMap;
        if (!keywordsMap) return alert("جاري تحميل اللهجة...");
        
        const lexer = new Lexer(code, keywordsMap); 
        const tokens = lexer.tokenize();
        
        const parser = new Parser(tokens, keywordsMap); 
        const ast = parser.parse();
        
        let result = targetLang.value === 'js' 
            ? toJS(ast, keywordsMap) 
            : toPython(ast, keywordsMap);
        
        output.textContent = result; 
        output.style.color = 'var(--primary)';
    } catch (error: any) {
        output.textContent = "Error: " + error.message; 
        output.style.color = '#ef4444';
    }
});

// ================= INITIALIZATION =================
if (editor) editor.addEventListener('input', saveState);
loadState();
