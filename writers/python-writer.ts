import { AstNode } from '../core/types.js';

export function toPython(node: AstNode, keywords: Record<string, string>): string {
  return compileNode(node, 0, keywords);
}

function compileNode(node: AstNode, indentLevel: number, keywords: Record<string, string>): string {
  const indent = '    '.repeat(indentLevel);

  switch (node.type) {
    case 'Program':
      return node.body.map(n => compileNode(n, indentLevel, keywords)).join('\n');

    case 'Call': {
      let funcName = node.name;
      if (keywords[funcName] === 'print' || keywords[funcName] === 'log') {
        funcName = 'print';
      }
      const args = node.args.map(arg => compileNode(arg, 0, keywords)).join(', ');
      return `${indent}${funcName}(${args})`;
    }

    case 'If': {
      const test = compileNode(node.test, 0, keywords);
      let code = `${indent}if ${test}:\n`;
      const thenBody = node.then.map(n => compileNode(n, indentLevel + 1, keywords)).join('\n');
      code += thenBody || `${indent}    pass`; 
      
      if (node.else && node.else.length > 0) {
        code += `\n${indent}else:\n`;
        const elseBody = node.else.map(n => compileNode(n, indentLevel + 1, keywords)).join('\n');
        code += elseBody || `${indent}    pass`;
      }
      return code;
    }

    case 'StringLiteral':
      return `"${node.value}"`;

    case 'NumberLiteral':
      return String(node.value);

    case 'Identifier':
      if (keywords[node.name] === 'true') return 'True';
      if (keywords[node.name] === 'false') return 'False';
      return node.name;

    default:
      return '';
  }
}
