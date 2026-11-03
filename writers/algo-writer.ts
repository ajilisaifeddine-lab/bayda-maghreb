import { arg, renderTokens } from './common.js';

const algoWord = (t: { type: string; value: string }) => {
  if (t.value === 'true') return 'صحيح';
  if (t.value === 'false') return 'خطأ';
  return t.value;
};

type WriterNode = any;

export function toAlgo(node: WriterNode, keywords: Record<string, string> = {}): string {
  return compileNode(node, 0, keywords);
}

function compileIf(node: any, indentLevel: number, keywords: Record<string, string>, kw: string): string {
  const indent = '  '.repeat(indentLevel);
  const test = renderTokens(node.test.tokens, algoWord as any);

  let code = `${indent}${kw} (${test}) إذن\n`;
  const thenBody = node.then.map((n: any) => compileNode(n, indentLevel + 1, keywords)).join('\n');
  code += thenBody || `${indent}  // لا شيء`;

  if (node.else && node.else.length > 0) {
    if (node.else.length === 1 && node.else[0].type === 'If') {
      const nested = compileIf(node.else[0], indentLevel, keywords, 'وإلا إذا');
      code += '\n' + nested;
    } else {
      code += `\n${indent}وإلا\n`;
      const elseBody = node.else.map((n: any) => compileNode(n, indentLevel + 1, keywords)).join('\n');
      code += elseBody || `${indent}  // لا شيء`;
      code += `\n${indent}نهاية إذا`;
      return code;
    }
  } else {
    code += `\n${indent}نهاية إذا`;
  }
  return code;
}

function compileNode(node: WriterNode, indentLevel: number, keywords: Record<string, string>): string {
  const indent = '  '.repeat(indentLevel);

  switch (node.type) {
    case 'Program':
      return node.body.map((n: any) => compileNode(n, indentLevel, keywords)).join('\n');

    case 'Call': {
      let funcName = node.name;
      const concept = keywords[funcName] ?? funcName;

      if (concept === 'print' || concept === 'log' || concept === 'console.log') {
        funcName = 'اطبع';
      }
      const args = node.args.map((a: any) => arg(a, algoWord as any)).join('، ');
      return `${indent}${funcName}(${args});`;
    }

    case 'If':
      return compileIf(node, indentLevel, keywords, 'إذا');

    case 'While': {
      const test = renderTokens((node.test as any).tokens, algoWord as any);
      const body = node.body.map((n: any) => compileNode(n, indentLevel + 1, keywords)).join('\n');
      return `${indent}طالما (${test}) كرر\n${body}\n${indent}نهاية طالما`;
    }

    case 'StringLiteral':
      return `"${node.value}"`;

    case 'NumberLiteral':
      return String(node.value);

    case 'Identifier': {
      const concept = keywords[node.name] ?? node.name;
      if (concept === 'true') return 'صحيح';
      if (concept === 'false') return 'خطأ';
      return node.name;
    }

    default:
      return '';
  }
}
