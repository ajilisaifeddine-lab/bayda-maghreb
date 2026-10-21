import { arg, renderTokens, jsWord } from './common.js';

/**
 * عقدة الكاتب: تقبل شجرة program.ts (Call/If/While/Raw) وشجرة types.ts
 * (Call/StringLiteral/...). نستخدم any لتفادي الازدواج بين المسارين.
 */
type WriterNode = any;

export function toJS(node: WriterNode, keywords: Record<string, string>): string {
  return compileNode(node, 0, keywords);
}

function compileIf(node: any, indentLevel: number, keywords: Record<string, string>, kw: string): string {
  const indent = '  '.repeat(indentLevel);
  const test = renderTokens(node.test.tokens, jsWord as any);

  let code = `${indent}${kw} (${test}) {\n`;
  code += node.then.map((n: any) => compileNode(n, indentLevel + 1, keywords)).join('\n');
  code += `\n${indent}}`;

  if (node.else && node.else.length > 0) {
    // else if: فرع else يحوي عقدة If وحيدة
    if (node.else.length === 1 && node.else[0].type === 'If') {
      const nested = compileIf(node.else[0], indentLevel, keywords, 'else if');
      code += ' ' + nested.slice(indent.length);
    } else {
      code += ` else {\n`;
      code += node.else.map((n: any) => compileNode(n, indentLevel + 1, keywords)).join('\n');
      code += `\n${indent}}`;
    }
  }
  return code;
}

function compileNode(node: WriterNode, indentLevel: number, keywords: Record<string, string>): string {
  const indent = '  '.repeat(indentLevel);

  switch (node.type) {
    case 'Program':
      return node.body.map(n => compileNode(n, indentLevel, keywords)).join('\n');

    case 'Call': {
      let funcName = node.name;
      // الاسم قد يكون كلمة لهجة (تُترجم عبر keywords) أو مفهوماً قياسياً بالفعل
      const concept = keywords[funcName] ?? funcName;

      if (concept === 'print' || concept === 'log' || concept === 'console.log') {
        funcName = 'console.log';
      }
      const args = node.args.map((a: any) => arg(a, jsWord as any)).join(', ');
      return `${indent}${funcName}(${args});`;
    }

    case 'If':
      return compileIf(node, indentLevel, keywords, 'if');

    case 'While': {
      const test = renderTokens((node.test as any).tokens, jsWord as any);
      const body = node.body.map((n: any) => compileNode(n, indentLevel + 1, keywords)).join('\n');
      return `${indent}while (${test}) {\n${body}\n${indent}}`;
    }
    case 'StringLiteral':
      return `"${node.value}"`;

    case 'NumberLiteral':
      return String(node.value);

    case 'Identifier': {
      const concept = keywords[node.name] ?? node.name;
      if (concept === 'true') return 'true';
      if (concept === 'false') return 'false';
      return node.name;
    }

    default:
      return '';
  }
}
