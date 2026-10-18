import { AstNode } from '../core/types.js';

export function toPython(node: AstNode): string {
  return compileNode(node, 0);
}

function compileNode(node: AstNode, indentLevel: number): string {
  const indent = '    '.repeat(indentLevel);  

  switch (node.type) {
    case 'Program':
      return node.body.map(n => compileNode(n, indentLevel)).join('\n');

    case 'Call': {
      
      let funcName = node.name;
      if (funcName === 'ktab' || funcName === 'goul') {
        funcName = 'print';
      }
      
      const args = node.args.map(arg => compileNode(arg, 0)).join(', ');
      return `${indent}${funcName}(${args})`; // 
    }

    case 'If': {
      const test = compileNode(node.test, 0);

      let code = `${indent}if ${test}:\n`;
      const thenBody = node.then.map(n => compileNode(n, indentLevel + 1)).join('\n');
      code += thenBody || `${indent}    pass`; 
      
      if (node.else && node.else.length > 0) {
        code += `\n${indent}else:\n`;
        const elseBody = node.else.map(n => compileNode(n, indentLevel + 1)).join('\n');
        code += elseBody || `${indent}    pass`;
      }
      return code;
    }

    case 'StringLiteral':
      return `"${node.value}"`;

    case 'NumberLiteral':
      return String(node.value);

    case 'Identifier':
      
      if (node.name === 'haqq') return 'True';
      if (node.name === 'bla') return 'False';
      return node.name;

    default:
      return '';
  }
}
