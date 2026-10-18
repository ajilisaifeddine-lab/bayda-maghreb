import { Token, AstNode } from './types.js';

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private ifKeyword: string;

  constructor(tokens: Token[], ifKeyword: string = 'idha') {
    this.tokens = tokens;
    this.ifKeyword = ifKeyword;
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
    if (this.match('KEYWORD', this.ifKeyword) || this.match('KEYWORD', 'idha') || this.match('KEYWORD', 'ken') || this.match('KEYWORD', 'kima')) { 
      this.expect('SYMBOL', '(');
      const test = this.expression();
      this.expect('SYMBOL', ')');
      this.expect('SYMBOL', '{');

      const thenBranch: AstNode[] = [];
      while (!this.match('SYMBOL', '}') && !this.isAtEnd()) {
        thenBranch.push(this.statement());
      }

      let elseBranch: AstNode[] | undefined = undefined;
      if (this.match('KEYWORD', 'bla')) { 
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
