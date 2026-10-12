import { describe, it, expect } from 'vitest';
import { lex } from '../../core/lexer.js';
describe('lexer',()=>{ it('tokenizes',()=>{ expect(lex('ktab "azul"')[0].value).toBe('ktab'); }); });
