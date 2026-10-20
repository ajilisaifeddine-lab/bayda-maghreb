import { Lexer } from './lexer.js';
import { Parser } from './parser.js';

export function compile(src: string) {
  // نستخدم الـ Lexer الجديد لتحويل النص إلى رموز
  const lexer = new Lexer(src, {}); // نمرر معجماً فارغاً مؤقتاً
  const tokens = lexer.tokenize();
  
  // نمرر الرموز إلى الـ Parser
  const parser = new Parser(tokens);
  return parser.parse();
}
