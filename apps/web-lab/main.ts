import { Lexer } from '../../core/lexer.js';
import { Parser } from '../../core/parser.js';
import { toJS } from '../../writers/js-writer.js';
import { toPython } from '../../writers/python-writer.js';

const keywordsMap = {
  "ktab": "print", "goul": "print",
  "idha": "if", "haqq": "true", "bla": "false"
};

const editor = document.getElementById('editor') as HTMLTextAreaElement;
const output = document.getElementById('output') as HTMLPreElement;
const runBtn = document.getElementById('run-btn') as HTMLButtonElement;
const targetLang = document.getElementById('target-lang') as HTMLSelectElement;

runBtn.addEventListener('click', () => {
  const code = editor.value;
  output.innerHTML = '';

  try {
    const lexer = new Lexer(code, keywordsMap);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    let result = '';
    if (targetLang.value === 'js') {
      result = toJS(ast);
    } else {
      result = toPython(ast);
    }

    output.textContent = result;
    output.style.color = 'var(--success)';
  } catch (error: any) {
    output.textContent = "خطأ: " + error.message;
    output.style.color = 'var(--error)';
  }
});
