import { Token, AstNode } from './types.js';

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private ifKeywords: string[] = [];
  private elseKeywords: string[] = [];

  constructor(tokens: Token[], keywordsMap: Record<string, string> = {}) {
    this.tokens = tokens;
    
    for (const [key, val] of Object.entries(keywordsMap)) {
      if (val === 'if') this.ifKeywords.push(key);
      if (val === 'else') this.elseKeywords.push(key);
    }
   
    if (this.ifKeywords.length === 0) this.ifKeywords.push('idha');
    if (this.elseKeywords.length === 0) this.elseKeywords.push('bla');
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.tokens[this.current - 1];
  }

  private match(type: string, value?: string): boolean {
    const token = this.peek();
    if (token.type === type && (value === undefined || token.value === value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchKeyword(keywords: string[]): boolean {
    const token = this.peek();
    if (token.type === 'KEYWORD' && keywords.includes(token.value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(type: string, errorMsg: string): Token {
    if (this.match(type)) return this.tokens[this.current - 1];
    throw new Error(`${errorMsg} (السطر ${this.peek().line})`);
  }

  public parse(): AstNode {
    const body: AstNode[] = [];
    while (!this.isAtEnd()) {
      body.push(this.statement());
    }
    return { type: 'Program', body };
  }

  private statement(): AstNode {
    // 1. Check if it's an IF statement
    if (this.matchKeyword(this.ifKeywords)) { 
      this.expect('SYMBOL', '(');
      const test = this.expression();
      this.expect('SYMBOL', ')');
      this.expect('SYMBOL', '{');

      const thenBranch: AstNode[] = [];
      while (!this.match('SYMBOL', '}') && !this.isAtEnd()) {
        thenBranch.push(this.statement());
      }

      let elseBranch: AstNode[] | undefined = undefined;
      // 2. Check if it's an ELSE statement
      if (this.matchKeyword(this.elseKeywords)) { 
         this.expect('SYMBOL', '{');
         elseBranch = [];
         while (!this.match('SYMBOL', '}') && !this.isAtEnd()) {
            elseBranch.push(this.statement());
         }
      }

      return { type: 'If', test, then: thenBranch, else: elseBranch };
    }

    if (this.peek().type === 'KEYWORD' || this.peek().type === 'IDENT') {
      const name = this.advance().value;
      this.expect('SYMBOL', '(');
      const args: AstNode[] = [];
      if (!this.match('SYMBOL', ')')) {
        do {
          args.push(this.expression());
        } while (this.match('SYMBOL', ','));
        this.expect('SYMBOL', ')');
      }
      return { type: 'Call', name, args };
    }

    throw new Error(`جملة غير معروفة في السطر ${this.peek().line}`);
  }

  private expression(): AstNode {
    if (this.match('STRING')) {
      return { type: 'StringLiteral', value: this.tokens[this.current - 1].value };
    }
    if (this.match('NUMBER')) {
      return { type: 'NumberLiteral', value: Number(this.tokens[this.current - 1].value) };
    }
    if (this.match('IDENT') || this.match('KEYWORD')) {
      return { type: 'Identifier', name: this.tokens[this.current - 1].value };
    }
    throw new Error(`تعبير غير صالح في السطر ${this.peek().line}`);
  }
}
