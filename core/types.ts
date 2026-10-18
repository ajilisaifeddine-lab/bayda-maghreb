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

// Abstract Syntax Tree (AST) Types
export type AstNode =
  | { type: 'Program'; body: AstNode[] }
  | { type: 'Call'; name: string; args: AstNode[] }
  | { type: 'If'; test: AstNode; then: AstNode[]; else?: AstNode[] }
  | { type: 'StringLiteral'; value: string }
  | { type: 'NumberLiteral'; value: number }
  | { type: 'Identifier'; name: string }
  | { type: 'BinaryExpression'; operator: string; left: AstNode; right: AstNode };
