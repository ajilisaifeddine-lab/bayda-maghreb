import { arg, renderTokens } from './common.js';
const pyWord = (t: { type: string; value: string }) => t.value === 'true' ? 'True' : t.value === 'false' ? 'False' : t.value;

/**
 * عقدة الكاتب: تقبل شجرة program.ts (Call/If/While/Raw) وشجرة types.ts.
 */
type WriterNode = any;

export function toPython(node: WriterNode, keywords: Record<string, string>): string {
  return compileNode(node, 0, keywords);
}

function compileIf(node: any, indentLevel: number, keywords: Record<string, string>, kw: string): string {
  const indent = '    '.repeat(indentLevel);
  const test = renderTokens(node.test.tokens, pyWord as any);

  let code = `${indent}${kw} ${test}:\n`;
  const thenBody = node.then.map((n: any) => compileNode(n, indentLevel + 1, keywords)).join('\n');
  code += thenBody || `${indent}    pass`;

  if (node.else && node.else.length > 0) {
    // elif: فرع else يحوي عقدة If وحيدة
    if (node.else.length === 1 && node.else[0].type === 'If') {
      const nested = compileIf(node.else[0], indentLevel, keywords, 'elif');
      code += '\n' + nested;
    } else {
      code += `\n${indent}else:\n`;
      const elseBody = node.else.map((n: any) => compileNode(n, indentLevel + 1, keywords)).join('\n');
      code += elseBody || `${indent}    pass`;
    }
  }
  return code;
}

function compileNode(node: WriterNode, indentLevel: number, keywords: Record<string, string>): string {
  const indent = '    '.repeat(indentLevel);

  switch (node.type) {
    case 'Program':
      return node.body.map(n => compileNode(n, indentLevel, keywords)).join('\n');

    case 'Call': {
      let funcName = node.name;
      // الاسم قد يكون كلمة لهجة (تُترجم عبر keywords) أو مفهوماً قياسياً بالفعل
      const concept = keywords[funcName] ?? funcName;
      if (concept === 'print' || concept === 'log' || concept === 'console.log') {
        funcName = 'print';
      }
      const args = node.args.map((a: any) => arg(a, pyWord as any)).join(', ');
      return `${indent}${funcName}(${args})`;
    }

    case 'If':
      return compileIf(node, indentLevel, keywords, 'if');

    case 'While': {
      const test = renderTokens((node.test as any).tokens, pyWord as any);
      const body = node.body.map((n: any) => compileNode(n, indentLevel + 1, keywords)).join('\n');
      return `${indent}while ${test}:\n${body}`;
    }
    case 'StringLiteral':
      return `"${node.value}"`;

    case 'NumberLiteral':
      return String(node.value);

    case 'Identifier': {
      const concept = keywords[node.name] ?? node.name;
      if (concept === 'true') return 'True';
      if (concept === 'false') return 'False';
      return node.name;
    }

    default:
      return '';
  }
}
