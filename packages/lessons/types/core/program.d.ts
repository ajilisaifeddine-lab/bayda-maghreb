import { AstNode, Token } from './types';
export declare const MAX_AST_DEPTH = 48;
export declare const MAX_EXPR_DEPTH = 48;
export declare function parseProgram(tokens: Token[]): AstNode;
