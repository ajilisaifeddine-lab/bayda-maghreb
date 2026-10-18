import { Lexer } from '../../core/lexer.js';
import { Parser } from '../../core/parser.js';
import { toJS } from '../../writers/js-writer.js';
import { toPython } from '../../writers/python-writer.js';
import { allKeywords } from './dialects.js';

const editor = document.getElementById('editor') as HTMLTextAreaElement;
const output = document.getElementById('output') as HTMLPreElement;
const runBtn = document.getElementById('run-btn') as HTMLButtonElement;
const targetLang = document.getElementById('target-lang') as HTMLSelectElement;
const dialectSelect = document.getElementById('dialect-select') as HTMLSelectElement;

runBtn.addEventListener('click', () => {
  const code = editor.value;
  output.innerHTML = '';

  try {
    const selectedDialect = dialectSelect.value;
    const keywordsMap = allKeywords[selectedDialect];

    if (!keywordsMap) {
      throw new Error("Dialect dictionary not found");
    }

    const lexer = new Lexer(code, keywordsMap);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens, keywordsMap);
    const ast = parser.parse();

    let result = '';
    if (targetLang.value === 'js') {
      result = toJS(ast, keywordsMap);
    } else {
      result = toPython(ast, keywordsMap);
    }

    output.textContent = result;
    output.style.color = 'var(--success)';
  } catch (error: any) {
    output.textContent = "Error: " + error.message; 
    output.style.color = 'var(--error)';
  }
});

