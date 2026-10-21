import { AstNode } from '../core/types.js';
import { arg, renderTokens, jsWord } from './common.js';

export function toJS(node: AstNode, keywords: Record<string, string>): string {
  return compileNode(node, 0, keywords);
}

function compileNode(node: AstNode, indentLevel: number, keywords: Record<string, string>): string {
  const indent = '  '.repeat(indentLevel);

  switch (node.type) {
    case 'Program':
      return node.body.map(n => compileNode(n, indentLevel, keywords)).join('\n');

    case 'Call': {
      let funcName = node.name;
      
      if (keywords[funcName] === 'print' || keywords[funcName] === 'log') {
        funcName = 'console.log';
      }
      const args = node.args.map((a: any) => arg(a, jsWord as any)).join(', ');
      return `${indent}${funcName}(${args});`;
    }

    case 'If': {
      const test = renderTokens((node.test as any).tokens, jsWord as any);
      let code = `${indent}if (${test}) {\n`;
      code += node.then.map(n => compileNode(n, indentLevel + 1, keywords)).join('\n');
      code += `\n${indent}}`;
      
      if (node.else && node.else.length > 0) {
        code += ` else {\n`;
        code += node.else.map(n => compileNode(n, indentLevel + 1, keywords)).join('\n');
        code += `\n${indent}}`;
      }
      return code;
    }
    case 'While': {
      const test = renderTokens((node.test as any).tokens, jsWord as any);
      const body = node.body.map((n: any) => compileNode(n, indentLevel + 1, keywords)).join('\n');
      return `${indent}while (${test}) {\n${body}\n${indent}}`;
    }
    case 'StringLiteral':
      return `"${node.value}"`;

    case 'NumberLiteral':
      return String(node.value);

    case 'Identifier':
      if (keywords[node.name] === 'true') return 'true';
      if (keywords[node.name] === 'false') return 'false';
      return node.name;

    default:
      return '';
  }
}
