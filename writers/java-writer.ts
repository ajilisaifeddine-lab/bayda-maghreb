import { arg, renderTokens } from './common.js';

const javaWord = (t: { type: string; value: string }) => {
  if (t.value === 'true') return 'true';
  if (t.value === 'false') return 'false';
  return t.value;
};

type WriterNode = any;

export function toJava(node: WriterNode, keywords: Record<string, string> = {}): string {
  return compileNode(node, 0, keywords);
}

function compileIf(node: any, indentLevel: number, keywords: Record<string, string>, kw: string): string {
  const indent = '  '.repeat(indentLevel);
  const test = renderTokens(node.test.tokens, javaWord as any);

  let code = `${indent}${kw} (${test}) {\n`;
  code += node.then.map((n: any) => compileNode(n, indentLevel + 1, keywords)).join('\n');
  code += `\n${indent}}`;

  if (node.else && node.else.length > 0) {
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
      return node.body.map((n: any) => compileNode(n, indentLevel, keywords)).join('\n');

    case 'Call': {
      let funcName = node.name;
      const concept = keywords[funcName] ?? funcName;

      if (concept === 'print' || concept === 'log' || concept === 'console.log') {
        funcName = 'System.out.println';
      }
      const args = node.args.map((a: any) => arg(a, javaWord as any)).join(', ');
      return `${indent}${funcName}(${args});`;
    }

    case 'If':
      return compileIf(node, indentLevel, keywords, 'if');

    case 'While': {
      const test = renderTokens((node.test as any).tokens, javaWord as any);
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
