import { Token, TokenType } from './types.js';

const WORD_REGEX = /[\p{L}\p{M}_]/u;
const NUMBER_REGEX = /[0-9]/;

export class Lexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private col: number = 1;
  private keywords: Set<string>;

  constructor(input: string, keywordsMap: Record<string, string>) {
    this.input = input;

    this.keywords = new Set(Object.keys(keywordsMap));
  }

  private currentChar(): string {
    return this.input[this.position] || '\0';
  }

  private advance(): void {
    if (this.currentChar() === '\n') {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    this.position++;
  }

  private skipWhitespace(): void {
    while (/\s/.test(this.currentChar()) && this.currentChar() !== '\0') {
      this.advance();
    }
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.position < this.input.length) {
      this.skipWhitespace();
      if (this.position >= this.input.length) break;

      const char = this.currentChar();
      const startLine = this.line;
      const startCol = this.col;

      if (char === '"' || char === "'") {
        const quote = char;
        this.advance();
        let value = '';
        while (this.currentChar() !== quote && this.currentChar() !== '\0') {
          value += this.currentChar();
          this.advance();
        }
        if (this.currentChar() === quote) this.advance(); 
        tokens.push({ type: 'STRING', value, line: startLine, col: startCol });
        continue;
      }

      if (NUMBER_REGEX.test(char)) {
        let value = '';
        while (NUMBER_REGEX.test(this.currentChar()) || this.currentChar() === '.') {
          value += this.currentChar();
          this.advance();
        }
        tokens.push({ type: 'NUMBER', value, line: startLine, col: startCol });
        continue;
      }

      if (WORD_REGEX.test(char)) {
        let value = '';
        while (WORD_REGEX.test(this.currentChar()) || NUMBER_REGEX.test(this.currentChar())) {
          value += this.currentChar();
          this.advance();
        }
        const type: TokenType = this.keywords.has(value) ? 'KEYWORD' : 'IDENT';
        tokens.push({ type, value, line: startLine, col: startCol });
        continue;
      }

      tokens.push({ type: 'SYMBOL', value: char, line: startLine, col: startCol });
      this.advance();
    }

    tokens.push({ type: 'EOF', value: '', line: this.line, col: this.col });
    return tokens;
  }
}
