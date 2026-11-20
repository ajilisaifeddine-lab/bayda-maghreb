export type TokenType = 
  | 'KEYWORD' 
  | 'IDENT' 
  | 'STRING' 
  | 'NUMBER' 
  | 'SYMBOL' 
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}
