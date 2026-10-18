import { AstNode } from '../core/types.js';

export function toJS(node: AstNode): string {
  return compileNode(node, 0);
}

function compileNode(node: AstNode, indentLevel: number): string {
  const indent = '  '.repeat(indentLevel);

  switch (node.type) {
    case 'Program':
      return node.body.map(n => compileNode(n, indentLevel)).join('\n');

    case 'Call': {

      let funcName = node.name;
      if (funcName === 'ktab' || funcName === 'goul') {
        funcName = 'console.log';
      }
      
      const args = node.args.map(arg => compileNode(arg, 0)).join(', ');
      return `${indent}${funcName}(${args});`;
    }

    case 'If': {
      const test = compileNode(node.test, 0);
      let code = `${indent}if (${test}) {\n`;
      code += node.then.map(n => compileNode(n, indentLevel + 1)).join('\n');
      code += `\n${indent}}`;
      
      if (node.else && node.else.length > 0) {
        code += ` else {\n`;
        code += node.else.map(n => compileNode(n, indentLevel + 1)).join('\n');
        code += `\n${indent}}`;
      }
      return code;
    }

    case 'StringLiteral':
      return `"${node.value}"`;

    case 'NumberLiteral':
      return String(node.value);

    case 'Identifier':

      if (node.name === 'haqq') return 'true';
      if (node.name === 'bla') return 'false';
      return node.name;

    default:
      return '';
  }
}
