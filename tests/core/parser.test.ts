import { describe, it, expect } from 'vitest';
import { parse } from '../../core/parser.js';
describe('parser',()=>{ it('parses',()=>{ expect(parse('ktab "azul"').body[0].type).toBe('Print'); }); });
